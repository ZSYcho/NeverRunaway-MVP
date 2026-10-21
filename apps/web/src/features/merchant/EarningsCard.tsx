import type { Address } from 'viem'
import { useConfig } from 'wagmi'
import { targetChain } from '../../chain.ts'
import { primaryButton } from '../../components/buttons.ts'
import { FlowFeedback } from '../../components/FlowFeedback.tsx'
import { useTxFlow } from '../../hooks/useTxFlow.ts'
import { useI18n } from '../../i18n/useI18n.ts'
import { formatAmount } from '../../lib/amount.ts'
import { withdrawEarnings } from '../../tx/merchant.ts'

/** What customers have spent at the store, which the merchant can withdraw at any time. */
export function EarningsCard({
  store,
  account,
  earnings,
  decimals,
  canWrite,
}: {
  store: Address
  account: Address
  earnings: bigint
  decimals: number
  canWrite: boolean
}) {
  const { t } = useI18n()
  const config = useConfig()
  const flow = useTxFlow<'withdrawEarnings'>()
  const amount = formatAmount(earnings, decimals)

  const withdraw = () => {
    flow.reset()
    void flow.run((onProgress) =>
      withdrawEarnings(config, { chainId: targetChain.id, account, store }, onProgress),
    )
  }

  return (
    <section className="glass-card space-y-3 p-5">
      <h2 className="text-xl font-semibold">{t('earningsTitle')}</h2>
      <p className="font-mono text-3xl font-bold">
        {amount} <span className="text-base font-normal text-slate-400">USDC</span>
      </p>
      <p className="text-xs leading-relaxed text-slate-500">{t('earningsHint')}</p>
      {earnings > 0n ? (
        <button
          type="button"
          onClick={withdraw}
          disabled={!canWrite || flow.status === 'running'}
          className={`w-full ${primaryButton}`}
        >
          {t('withdrawEarningsAction', { amount })}
        </button>
      ) : (
        flow.status !== 'success' && <p className="text-sm text-slate-400">{t('noEarnings')}</p>
      )}
      <FlowFeedback
        flow={flow}
        steps={[{ key: 'withdrawEarnings', label: t('stepWithdrawEarnings') }]}
        done={t('earningsWithdrawn')}
      />
    </section>
  )
}
