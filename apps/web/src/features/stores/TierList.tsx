import { useState } from 'react'
import type { Address } from 'viem'
import { useConnection } from 'wagmi'
import { targetChain } from '../../chain.ts'
import { Notice } from '../../components/Notice.tsx'
import { useI18n } from '../../i18n/useI18n.ts'
import { formatAmount } from '../../lib/amount.ts'
import { formatDate, nowInSeconds } from '../../lib/time.ts'
import { DepositDialog } from './DepositDialog.tsx'
import { describeTiers, type TierView } from './tiers.ts'
import type { StoreState, UserState } from './useStore.ts'

export function TierList({
  store,
  state,
  user,
  decimals,
}: {
  store: Address
  state: StoreState
  user: UserState | undefined
  decimals: number
}) {
  const { t, lang } = useI18n()
  const { chainId } = useConnection()
  const [selected, setSelected] = useState<TierView>()

  const memberLevel = user?.memberLevel ?? 0
  const tiers = describeTiers(state.tiers, {
    now: nowInSeconds(),
    memberLevel,
    bonusPool: state.bonusPool,
    storeActive: state.isActive,
  })
  const canDeposit = user !== undefined && chainId === targetChain.id
  const amount = (value: bigint) => formatAmount(value, decimals)

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{t('depositOptions')}</h2>
      {!state.isActive && <Notice>{t('storeNotAccepting')}</Notice>}
      {state.isActive && !user && <p className="text-sm text-slate-400">{t('connectToDeposit')}</p>}

      <ul className="grid gap-3 sm:grid-cols-2">
        {tiers.map((tier) => (
          <li key={tier.id.toString()} className="glass-card flex flex-col gap-3 p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-lg font-semibold">
                {t('tierDeposit', {
                  deposit: amount(tier.depositAmount),
                  credit: amount(tier.creditAmount),
                })}
              </p>
              {tier.bonus > 0n && (
                <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-300">
                  {t('tierBonus', { bonus: amount(tier.bonus) })}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
              {tier.validUntil > 0n && (
                <span>{t('tierUntil', { date: formatDate(tier.validUntil, lang) })}</span>
              )}
              {tier.grantsLevel > memberLevel && (
                <span>{t('tierGrantsMembership', { level: String(tier.grantsLevel) })}</span>
              )}
              {tier.requiredLevel > 0 && (
                <span className={tier.status === 'membersOnly' ? 'text-amber-300' : undefined}>
                  {t('tierMembersOnly', { level: String(tier.requiredLevel) })}
                </span>
              )}
              {tier.status === 'bonusSoldOut' && (
                <span className="text-amber-300">{t('tierBonusSoldOut')}</span>
              )}
            </div>

            <button
              type="button"
              disabled={!canDeposit || tier.status !== 'available'}
              onClick={() => setSelected(tier)}
              className="mt-auto rounded-xl border border-white/10 bg-slate-800/70 px-4 py-2 text-sm font-medium transition hover:border-indigo-400/50 hover:bg-slate-800 disabled:opacity-50"
            >
              {t('depositAction')}
            </button>
          </li>
        ))}
      </ul>

      {selected && user && (
        <DepositDialog
          key={selected.id.toString()}
          tier={selected}
          store={store}
          user={user}
          decimals={decimals}
          onClose={() => setSelected(undefined)}
        />
      )}
    </section>
  )
}
