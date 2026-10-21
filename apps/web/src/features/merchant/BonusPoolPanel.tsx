import { type FormEvent, useState } from 'react'
import { type Address, erc20Abi, formatUnits } from 'viem'
import { useConfig, useReadContract } from 'wagmi'
import { deployment, targetChain } from '../../chain.ts'
import { primaryButton, secondaryButton } from '../../components/buttons.ts'
import { FlowFeedback } from '../../components/FlowFeedback.tsx'
import { TextField } from '../../components/TextField.tsx'
import { useTxFlow } from '../../hooks/useTxFlow.ts'
import { useI18n } from '../../i18n/useI18n.ts'
import { formatAmount, parseAmount } from '../../lib/amount.ts'
import { nowInSeconds } from '../../lib/time.ts'
import { type FundBonusStep, fundBonus, withdrawBonus } from '../../tx/merchant.ts'
import { FaucetButton } from '../faucet/FaucetButton.tsx'
import type { StoreState, UserState } from '../stores/useStore.ts'
import { fundingShortfall, type PromoCapacity, promoCapacity } from './promotion.ts'

type PanelProps = {
  store: Address
  state: StoreState
  user: UserState
  decimals: number
  canWrite: boolean
}

/**
 * The prefunded bonus behind every promotion: how many more deposits it covers per tier, how much
 * a planned promotion still needs, and funding or withdrawing it.
 */
export function BonusPoolPanel({ store, state, user, decimals, canWrite }: PanelProps) {
  const { t } = useI18n()
  // The planner fills this in, so it lives above both.
  const [fundInput, setFundInput] = useState('')
  const amount = (value: bigint) => formatAmount(value, decimals)
  const capacity = promoCapacity(state.bonusPool, state.tiers, nowInSeconds())
  const tierLabel = (tierId: bigint) => {
    const tier = state.tiers[Number(tierId)]
    return tier
      ? t('tierDeposit', { deposit: amount(tier.depositAmount), credit: amount(tier.creditAmount) })
      : ''
  }

  return (
    <section className="glass-card space-y-5 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold">{t('bonusPoolTitle')}</h2>
        <p className="font-mono text-2xl font-bold">
          {amount(state.bonusPool)} <span className="text-sm font-normal text-slate-400">USDC</span>
        </p>
      </div>
      <p className="text-sm leading-relaxed text-slate-400">{t('bonusPoolHint')}</p>

      {state.isActive ? (
        <>
          {capacity.length === 0 ? (
            <p className="text-sm text-slate-400">{t('noBonusTiers')}</p>
          ) : (
            <ul className="divide-y divide-white/5 rounded-2xl border border-white/10">
              {capacity.map(({ tierId, bonus, remaining }) => (
                <li
                  key={tierId.toString()}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                >
                  <span>
                    {tierLabel(tierId)}{' '}
                    <span className="text-emerald-300">
                      {t('tierBonus', { bonus: amount(bonus) })}
                    </span>
                  </span>
                  {remaining === 0n ? (
                    <span className="text-amber-300">{t('capacitySoldOut')}</span>
                  ) : (
                    <span className="font-medium">
                      {t('capacityLeft', { count: formatAmount(remaining, 0) })}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {capacity.length > 0 && (
            <PromoPlanner
              capacity={capacity}
              bonusPool={state.bonusPool}
              decimals={decimals}
              tierLabel={tierLabel}
              onUseAmount={(shortfall) => setFundInput(formatUnits(shortfall, decimals))}
            />
          )}
          <FundBonusForm
            store={store}
            user={user}
            decimals={decimals}
            canWrite={canWrite}
            value={fundInput}
            onChange={setFundInput}
          />
        </>
      ) : (
        <p className="text-sm text-slate-300">{t('storeEndedPoolNote')}</p>
      )}

      <WithdrawBonusForm
        store={store}
        account={user.account}
        bonusPool={state.bonusPool}
        decimals={decimals}
        canWrite={canWrite}
        startOpen={!state.isActive}
      />
    </section>
  )
}

/** "If N customers buy this tier": the bonus that takes, and what the pool still lacks. */
function PromoPlanner({
  capacity,
  bonusPool,
  decimals,
  tierLabel,
  onUseAmount,
}: {
  capacity: PromoCapacity[]
  bonusPool: bigint
  decimals: number
  tierLabel: (tierId: bigint) => string
  onUseAmount: (amount: bigint) => void
}) {
  const { t } = useI18n()
  const [tierId, setTierId] = useState<bigint>()
  const [count, setCount] = useState('100')
  // A tier that stops selling drops out of the list; fall back to the first one still on sale.
  const selected = capacity.find((entry) => entry.tierId === tierId) ?? capacity[0]
  const deposits = /^\d+$/.test(count.trim()) ? BigInt(count.trim()) : 0n
  if (!selected) return null

  const total = selected.bonus * deposits
  const shortfall = fundingShortfall(bonusPool, selected.bonus, deposits)
  const amount = (value: bigint) => formatAmount(value, decimals)

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 p-4">
      <h3 className="font-medium">{t('planTitle')}</h3>
      <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
        <label className="block">
          <span className="mb-1 block text-xs text-slate-400">{t('planTierLabel')}</span>
          <select
            value={selected.tierId.toString()}
            onChange={(event) => setTierId(BigInt(event.target.value))}
            className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm outline-none focus:border-indigo-400"
          >
            {capacity.map((entry) => (
              <option key={entry.tierId.toString()} value={entry.tierId.toString()}>
                {tierLabel(entry.tierId)}
              </option>
            ))}
          </select>
        </label>
        <TextField
          label={t('planCountLabel')}
          value={count}
          onChange={setCount}
          inputMode="numeric"
          placeholder="100"
        />
      </div>
      {deposits > 0n &&
        (shortfall > 0n ? (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <p>{t('planShortfall', { total: amount(total), shortfall: amount(shortfall) })}</p>
            <button
              type="button"
              onClick={() => onUseAmount(shortfall)}
              className={secondaryButton}
            >
              {t('planUseAmount')}
            </button>
          </div>
        ) : (
          <p className="text-sm text-emerald-300">{t('planCovered', { total: amount(total) })}</p>
        ))}
    </div>
  )
}

function FundBonusForm({
  store,
  user,
  decimals,
  canWrite,
  value,
  onChange,
}: Omit<PanelProps, 'state'> & { value: string; onChange: (value: string) => void }) {
  const { t } = useI18n()
  const config = useConfig()
  const flow = useTxFlow<FundBonusStep>()
  // Frozen when the flow starts: refetches while the wallet is open must not reshape the list.
  const [plannedSteps, setPlannedSteps] = useState<FundBonusStep[]>()
  const usdc = deployment?.usdc
  const allowance = useReadContract({
    chainId: targetChain.id,
    address: usdc,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [user.account, store],
    query: { enabled: usdc !== undefined },
  })

  const amount = parseAmount(value, decimals)
  const valid = amount !== undefined && amount > 0n
  const needsApprove = valid && allowance.data !== undefined && allowance.data < amount
  const upcoming: FundBonusStep[] = needsApprove ? ['approve', 'fund'] : ['fund']
  const steps = plannedSteps ?? upcoming
  const insufficient = valid && user.walletUsdc < amount
  const busy = flow.status === 'running'

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!valid || !usdc) return
    flow.reset()
    setPlannedSteps(upcoming)
    void flow.run(async (onProgress) => {
      await fundBonus(
        config,
        { chainId: targetChain.id, account: user.account, store, usdc, amount },
        onProgress,
      )
      onChange('')
    })
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <TextField
        label={t('fundBonusLabel')}
        value={value}
        onChange={(next) => {
          onChange(next)
          if (!busy) setPlannedSteps(undefined)
        }}
        inputMode="decimal"
        placeholder="0"
        error={value !== '' && !valid ? t('formAmountInvalid') : undefined}
      />
      {insufficient && (
        <div className="space-y-2 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-100">
          <p>
            {t('insufficientUsdc', {
              needed: formatAmount(amount, decimals),
              balance: formatAmount(user.walletUsdc, decimals),
            })}
          </p>
          <FaucetButton account={user.account} />
        </div>
      )}
      {needsApprove && !busy && <p className="text-xs text-slate-500">{t('exactApprovalNote')}</p>}
      <FlowFeedback
        flow={flow}
        steps={steps.map((step) => ({
          key: step,
          label: t(step === 'approve' ? 'stepApprove' : 'stepFundBonus'),
        }))}
        done={t('bonusFunded')}
      />
      <button
        type="submit"
        disabled={!canWrite || !valid || insufficient || busy || allowance.isPending}
        className={`w-full ${primaryButton}`}
      >
        {t('fundBonusAction')}
      </button>
      <p className="text-xs text-slate-500">{t('sponsorNote')}</p>
    </form>
  )
}

function WithdrawBonusForm({
  store,
  account,
  bonusPool,
  decimals,
  canWrite,
  startOpen,
}: {
  store: Address
  account: Address
  bonusPool: bigint
  decimals: number
  canWrite: boolean
  /** Open from the start once the store has ended, when taking the pool back is what's left. */
  startOpen: boolean
}) {
  const { t } = useI18n()
  const config = useConfig()
  const flow = useTxFlow<'withdrawBonus'>()
  const [value, setValue] = useState('')

  const amount = parseAmount(value, decimals)
  const error =
    value === ''
      ? undefined
      : amount === undefined || amount === 0n
        ? t('formAmountInvalid')
        : amount > bonusPool
          ? t('formExceedsPool', { amount: formatAmount(bonusPool, decimals) })
          : undefined

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (amount === undefined || error !== undefined) return
    flow.reset()
    void flow.run(async (onProgress) => {
      await withdrawBonus(config, { chainId: targetChain.id, account, store, amount }, onProgress)
      setValue('')
    })
  }

  // An empty pool has nothing to take back, but after a withdrawal the outcome stays on screen.
  if (bonusPool === 0n && flow.status === 'idle') return null

  return (
    <details open={startOpen} className="rounded-2xl border border-white/10 p-4">
      <summary className="cursor-pointer text-sm font-medium text-slate-300">
        {t('withdrawBonusTitle')}
      </summary>
      <form onSubmit={submit} noValidate className="mt-3 space-y-3">
        <TextField
          label={t('withdrawBonusLabel')}
          value={value}
          onChange={setValue}
          inputMode="decimal"
          placeholder="0"
          hint={t('withdrawBonusHint')}
          error={error}
        />
        <FlowFeedback
          flow={flow}
          steps={[{ key: 'withdrawBonus', label: t('stepWithdrawBonus') }]}
          done={t('bonusWithdrawn')}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setValue(formatUnits(bonusPool, decimals))}
            className={secondaryButton}
          >
            {t('maxAmount')}
          </button>
          <button
            type="submit"
            disabled={!canWrite || value === '' || error !== undefined || flow.status === 'running'}
            className={`flex-1 ${secondaryButton}`}
          >
            {t('withdrawBonusAction')}
          </button>
        </div>
      </form>
    </details>
  )
}
