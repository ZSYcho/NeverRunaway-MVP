import { useState } from 'react'
import { type Address, erc20Abi } from 'viem'
import { useConfig, useReadContract } from 'wagmi'
import { deployment, targetChain } from '../../chain.ts'
import { Dialog } from '../../components/Dialog.tsx'
import { TxSteps } from '../../components/TxSteps.tsx'
import { useTxFlow } from '../../hooks/useTxFlow.ts'
import { useI18n } from '../../i18n/useI18n.ts'
import { formatAmount } from '../../lib/amount.ts'
import { txErrorKey } from '../../lib/txErrors.ts'
import { type DepositStep, deposit } from '../../tx/deposit.ts'
import { FaucetButton } from '../faucet/FaucetButton.tsx'
import type { TierView } from './tiers.ts'
import type { UserState } from './useStore.ts'

/** Mounted per selected tier (keyed by tier id), so every opening starts from a clean flow. */
export function DepositDialog({
  tier,
  store,
  user,
  decimals,
  onClose,
}: {
  tier: TierView
  store: Address
  user: UserState
  decimals: number
  onClose: () => void
}) {
  const { t } = useI18n()
  const config = useConfig()
  const flow = useTxFlow<DepositStep>()
  // Frozen when the flow starts: refetches while the wallet is open must not reshape the list.
  const [plannedSteps, setPlannedSteps] = useState<DepositStep[]>()
  const usdc = deployment?.usdc
  const allowance = useReadContract({
    chainId: targetChain.id,
    address: usdc,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [user.account, store],
    query: { enabled: usdc !== undefined },
  })

  const amount = (value: bigint) => formatAmount(value, decimals)
  const needsApprove = allowance.data !== undefined && allowance.data < tier.depositAmount
  const steps: DepositStep[] = plannedSteps ?? (needsApprove ? ['approve', 'deposit'] : ['deposit'])
  const insufficient = user.walletUsdc < tier.depositAmount
  const unlocksLevel = tier.grantsLevel > user.memberLevel ? tier.grantsLevel : undefined

  const start = () => {
    if (!usdc) return
    setPlannedSteps(steps)
    void flow.run((onProgress) =>
      deposit(
        config,
        {
          chainId: targetChain.id,
          account: user.account,
          store,
          usdc,
          tierId: tier.id,
          depositAmount: tier.depositAmount,
        },
        onProgress,
      ),
    )
  }

  return (
    <Dialog open onClose={onClose} title={t('depositTitle')}>
      <div className="space-y-1 text-sm">
        <p className="text-base font-medium">
          {t('depositSummary', {
            deposit: amount(tier.depositAmount),
            credit: amount(tier.creditAmount),
          })}
        </p>
        {tier.bonus > 0n && (
          <p className="text-slate-400">
            {t('depositSummaryBonus', { bonus: amount(tier.bonus) })}
          </p>
        )}
        {unlocksLevel !== undefined && (
          <p className="text-slate-400">
            {t('depositGrantsMembership', { level: String(unlocksLevel) })}
          </p>
        )}
      </div>

      {insufficient && flow.status !== 'success' && (
        <div className="space-y-2 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-100">
          <p>
            {t('insufficientUsdc', {
              needed: amount(tier.depositAmount),
              balance: amount(user.walletUsdc),
            })}
          </p>
          <FaucetButton account={user.account} />
        </div>
      )}

      <TxSteps
        steps={steps.map((step) => ({
          key: step,
          label: t(step === 'approve' ? 'stepApprove' : 'stepDeposit'),
          state: flow.steps[step],
        }))}
      />
      {steps.includes('approve') && (
        <p className="text-xs text-slate-500">{t('exactApprovalNote')}</p>
      )}

      {flow.error !== undefined && (
        <p role="alert" className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {t(txErrorKey(flow.error))}
        </p>
      )}

      {flow.status === 'success' ? (
        <div className="space-y-3">
          <p className="text-sm text-emerald-300">{t('depositDone')}</p>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-slate-800 px-4 py-2.5 font-medium"
          >
            {t('done')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={start}
          disabled={flow.status === 'running' || insufficient || allowance.isPending}
          className="w-full rounded-xl bg-linear-to-br from-indigo-500 to-violet-500 px-4 py-2.5 font-semibold disabled:opacity-60"
        >
          {flow.status === 'error' ? t('retry') : t('start')}
        </button>
      )}
    </Dialog>
  )
}
