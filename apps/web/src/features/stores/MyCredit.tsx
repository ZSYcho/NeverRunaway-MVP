import { lazy, Suspense, useState } from 'react'
import type { Address } from 'viem'
import { useConfig, useConnection } from 'wagmi'
import { targetChain } from '../../chain.ts'
import { primaryButton } from '../../components/buttons.ts'
import { TxSteps } from '../../components/TxSteps.tsx'
import { useTxFlow } from '../../hooks/useTxFlow.ts'
import { useI18n } from '../../i18n/useI18n.ts'
import { formatAmount } from '../../lib/amount.ts'
import { formatDate } from '../../lib/time.ts'
import { txErrorKey } from '../../lib/txErrors.ts'
import { refund } from '../../tx/refund.ts'
import { FaucetButton } from '../faucet/FaucetButton.tsx'
import { describeRefund } from './tiers.ts'
import type { StoreState, UserState } from './useStore.ts'

// The pay dialog brings the QR renderer, which a visit to a store page rarely needs.
const PayDialog = lazy(() =>
  import('../pay/PayDialog.tsx').then((module) => ({ default: module.PayDialog })),
)

export function MyCredit({
  store,
  state,
  user,
  decimals,
}: {
  store: Address
  state: StoreState
  user: UserState
  decimals: number
}) {
  const { t, lang } = useI18n()
  const config = useConfig()
  const { chainId } = useConnection()
  const flow = useTxFlow<'refund'>()
  const [paying, setPaying] = useState(false)

  const amount = (value: bigint) => formatAmount(value, decimals)
  const credit = user.principal + user.bonus
  const refundView = describeRefund({
    storeActive: state.isActive,
    principal: user.principal,
    bonus: user.bonus,
  })

  const startRefund = () =>
    flow.run((onProgress) =>
      refund(config, { chainId: targetChain.id, account: user.account, store }, onProgress),
    )

  return (
    <section className="glass-card space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{t('myCredit')}</h2>
        {user.memberLevel > 0 && (
          <span className="rounded-full bg-violet-500/15 px-2.5 py-1 text-xs text-violet-200">
            {t('memberLevel', { level: String(user.memberLevel) })}
          </span>
        )}
      </div>

      {credit === 0n ? (
        <p className="text-sm text-slate-400">{t('noCredit')}</p>
      ) : (
        <div>
          <p className="text-sm text-slate-400">{t('availableCredit')}</p>
          <p className="font-mono text-3xl font-bold">
            {amount(credit)} <span className="text-base font-normal text-slate-400">USDC</span>
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {t('principal')} {amount(user.principal)} · {t('bonusPart')} {amount(user.bonus)}
          </p>
        </div>
      )}

      {state.isActive && credit > 0n && (
        <button
          type="button"
          onClick={() => setPaying(true)}
          // Wallets refuse to sign typed data for a chain other than the one they are on.
          disabled={chainId !== targetChain.id}
          className={`w-full ${primaryButton}`}
        >
          {t('payAtCounter')}
        </button>
      )}

      {refundView.state === 'locked' && (
        <p className="text-xs leading-relaxed text-slate-500">
          {t('refundLocked', { date: formatDate(state.expireTime, lang) })}
        </p>
      )}

      {flow.status === 'success' ? (
        <p className="text-sm text-emerald-300">{t('refundDone')}</p>
      ) : (
        refundView.state === 'available' && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={startRefund}
              disabled={flow.status === 'running'}
              className="w-full rounded-xl bg-linear-to-br from-indigo-500 to-violet-500 px-4 py-2.5 font-semibold disabled:opacity-60"
            >
              {t('refundAction', { amount: amount(refundView.principal) })}
            </button>
            {refundView.bonus > 0n && (
              <p className="text-xs text-slate-500">
                {t('refundBonusNote', { bonus: amount(refundView.bonus) })}
              </p>
            )}
            {flow.status !== 'idle' && (
              <TxSteps
                steps={[{ key: 'refund', label: t('stepRefund'), state: flow.steps.refund }]}
              />
            )}
            {flow.error !== undefined && (
              <p role="alert" className="text-sm text-rose-300">
                {t(txErrorKey(flow.error))}
              </p>
            )}
          </div>
        )
      )}

      <div className="space-y-2 border-t border-white/10 pt-3 text-sm">
        <p className="text-slate-300">{t('walletUsdc', { amount: amount(user.walletUsdc) })}</p>
        <FaucetButton account={user.account} />
      </div>

      {paying && (
        <Suspense fallback={null}>
          <PayDialog
            store={store}
            user={user}
            decimals={decimals}
            onClose={() => setPaying(false)}
          />
        </Suspense>
      )}
    </section>
  )
}
