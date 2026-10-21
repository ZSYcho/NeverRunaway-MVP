import { useState } from 'react'
import type { Address } from 'viem'
import { useConfig } from 'wagmi'
import { targetChain } from '../../chain.ts'
import { dangerButton } from '../../components/buttons.ts'
import { Dialog } from '../../components/Dialog.tsx'
import { FlowFeedback } from '../../components/FlowFeedback.tsx'
import { useTxFlow } from '../../hooks/useTxFlow.ts'
import { useI18n } from '../../i18n/useI18n.ts'
import type { MessageKey } from '../../i18n/messages.ts'
import { formatAmount } from '../../lib/amount.ts'
import { formatDate, nowInSeconds } from '../../lib/time.ts'
import { disableTier } from '../../tx/merchant.ts'
import { tierStatus } from '../stores/tiers.ts'
import type { StoreState } from '../stores/useStore.ts'
import { AddTierForm } from './AddTierForm.tsx'

const chips: Partial<Record<ReturnType<typeof tierStatus>, [MessageKey, string]>> = {
  available: ['tierOnSale', 'bg-emerald-500/15 text-emerald-300'],
  bonusSoldOut: ['tierBonusSoldOut', 'bg-amber-500/15 text-amber-200'],
  disabled: ['tierDisabledChip', 'bg-slate-700/60 text-slate-400'],
  expired: ['tierEndedChip', 'bg-slate-700/60 text-slate-400'],
}

/** Every tier the store ever had, including retired ones, since tiers are append-only. */
export function TierManager({
  store,
  account,
  state,
  decimals,
  canWrite,
}: {
  store: Address
  account: Address
  state: StoreState
  decimals: number
  canWrite: boolean
}) {
  const { t, lang } = useI18n()
  const [disabling, setDisabling] = useState<{ id: bigint; label: string }>()
  const now = nowInSeconds()
  const amount = (value: bigint) => formatAmount(value, decimals)

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{t('tiers')}</h2>
      <p className="text-sm leading-relaxed text-slate-400">{t('tiersAppendOnly')}</p>

      <ul className="grid gap-3 sm:grid-cols-2">
        {state.tiers.map((tier, index) => {
          const id = BigInt(index)
          // As a customer who meets the tier's member level would find it.
          const status = tierStatus(tier, {
            now,
            memberLevel: tier.requiredLevel,
            bonusPool: state.bonusPool,
            storeActive: state.isActive,
          })
          const chip = chips[status]
          const retired = status === 'disabled' || status === 'expired'
          const bonus = tier.creditAmount - tier.depositAmount
          const label = t('tierDeposit', {
            deposit: amount(tier.depositAmount),
            credit: amount(tier.creditAmount),
          })
          return (
            <li
              key={index}
              className={`glass-card flex flex-col gap-3 p-5 ${retired ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-lg font-semibold">{label}</p>
                {chip && (
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${chip[1]}`}>
                    {t(chip[0])}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                {bonus > 0n && <span>{t('tierBonus', { bonus: amount(bonus) })}</span>}
                {tier.validUntil > 0n && (
                  <span>{t('tierUntil', { date: formatDate(tier.validUntil, lang) })}</span>
                )}
                {tier.grantsLevel > 0 && (
                  <span>{t('tierGrantsMembership', { level: String(tier.grantsLevel) })}</span>
                )}
                {tier.requiredLevel > 0 && (
                  <span>{t('tierMembersOnly', { level: String(tier.requiredLevel) })}</span>
                )}
              </div>
              {state.isActive && !retired && (
                <button
                  type="button"
                  disabled={!canWrite}
                  onClick={() => setDisabling({ id, label })}
                  className="mt-auto self-start rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:border-rose-400/50 hover:text-rose-200 disabled:opacity-50"
                >
                  {t('disableTierAction')}
                </button>
              )}
            </li>
          )
        })}
      </ul>

      {state.isActive && (
        <AddTierForm
          store={store}
          account={account}
          bonusPool={state.bonusPool}
          decimals={decimals}
          canWrite={canWrite}
        />
      )}

      {disabling && (
        <DisableTierDialog
          key={disabling.id.toString()}
          store={store}
          account={account}
          tierId={disabling.id}
          label={disabling.label}
          onClose={() => setDisabling(undefined)}
        />
      )}
    </section>
  )
}

function DisableTierDialog({
  store,
  account,
  tierId,
  label,
  onClose,
}: {
  store: Address
  account: Address
  tierId: bigint
  label: string
  onClose: () => void
}) {
  const { t } = useI18n()
  const config = useConfig()
  const flow = useTxFlow<'disableTier'>()

  const start = () =>
    void flow.run((onProgress) =>
      disableTier(config, { chainId: targetChain.id, account, store, tierId }, onProgress),
    )

  return (
    <Dialog open onClose={onClose} title={t('disableTierTitle')}>
      <p className="text-base font-medium">{label}</p>
      <p className="text-sm leading-relaxed text-slate-400">{t('disableTierBody')}</p>
      <FlowFeedback
        flow={flow}
        steps={[{ key: 'disableTier', label: t('stepDisableTier') }]}
        done={t('tierDisabledDone')}
      />
      {flow.status === 'success' ? (
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-slate-800 px-4 py-2.5 font-medium"
        >
          {t('done')}
        </button>
      ) : (
        <button
          type="button"
          onClick={start}
          disabled={flow.status === 'running'}
          className={`w-full ${dangerButton}`}
        >
          {flow.status === 'error' ? t('retry') : t('disableTierAction')}
        </button>
      )}
    </Dialog>
  )
}
