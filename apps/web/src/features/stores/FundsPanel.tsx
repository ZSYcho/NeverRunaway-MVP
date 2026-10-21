import { useI18n } from '../../i18n/useI18n.ts'
import { formatAmount } from '../../lib/amount.ts'
import type { StoreState } from './useStore.ts'

/**
 * The contract's books, readable by anyone. Its solvency invariant is
 * usdc.balanceOf(store) >= totalLocked + bonusPool + merchantWithdrawable.
 */
export function FundsPanel({ state, decimals }: { state: StoreState; decimals: number }) {
  const { t } = useI18n()
  const amount = (value: bigint) => `${formatAmount(value, decimals)} USDC`
  const owed = state.totalLocked + state.bonusPool + state.merchantWithdrawable
  const covered = state.heldUsdc >= owed

  const rows: Array<[string, bigint]> = [
    [t('fundsOwedToCustomers'), state.totalLocked],
    [t('fundsBonusPool'), state.bonusPool],
    [t('fundsEarned'), state.merchantWithdrawable],
  ]

  return (
    <section className="glass-card space-y-3 p-5 text-sm">
      <h2 className="text-xl font-semibold">{t('fundsTitle')}</h2>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-slate-300">{t('fundsHeld')}</span>
        <span className="font-mono font-semibold">{amount(state.heldUsdc)}</span>
      </div>
      <dl className="space-y-1.5 border-t border-white/10 pt-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-slate-400">{label}</dt>
            <dd className="font-mono">{amount(value)}</dd>
          </div>
        ))}
      </dl>
      <p className={covered ? 'text-emerald-300' : 'text-rose-300'}>
        {covered ? `✓ ${t('fundsCovered')}` : `⚠ ${t('fundsShort')}`}
      </p>
    </section>
  )
}
