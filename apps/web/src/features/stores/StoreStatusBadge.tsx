import { useI18n } from '../../i18n/useI18n.ts'

export function StoreStatusBadge({ isActive, closed }: { isActive: boolean; closed?: boolean }) {
  const { t } = useI18n()
  const label = isActive
    ? t('statusActive')
    : closed === undefined
      ? t('statusInactive')
      : closed
        ? t('statusClosed')
        : t('statusExpired')
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs ${
        isActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700/60 text-slate-400'
      }`}
    >
      {label}
    </span>
  )
}
