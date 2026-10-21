import { explorerUrl } from '../chain.ts'
import type { StepState } from '../hooks/useTxFlow.ts'
import { useI18n } from '../i18n/useI18n.ts'

/** The steps of a transaction flow, each with its phase and, once sent, a link to the transaction. */
export function TxSteps({
  steps,
}: {
  steps: ReadonlyArray<{ key: string; label: string; state?: StepState }>
}) {
  const { t } = useI18n()

  return (
    <ol className="space-y-2">
      {steps.map(({ key, label, state }, index) => {
        const link = state?.hash ? explorerUrl('tx', state.hash) : undefined
        const done = state?.phase === 'done'
        const active = state !== undefined && !done
        return (
          <li
            key={key}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm ${
              active ? 'border-indigo-400/50 bg-indigo-500/10' : 'border-white/10'
            }`}
          >
            <span
              aria-hidden
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                done ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-200'
              } ${active ? 'animate-pulse' : ''}`}
            >
              {done ? '✓' : index + 1}
            </span>
            <span className="flex-1">
              <span className="block font-medium">{label}</span>
              {state && (
                <span className="block text-xs text-slate-400">
                  {state.phase === 'confirm'
                    ? t('phaseConfirm')
                    : state.phase === 'pending'
                      ? t('phasePending')
                      : t('phaseDone')}
                </span>
              )}
            </span>
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-indigo-300 hover:text-indigo-200"
              >
                {t('viewTransaction')}
              </a>
            )}
          </li>
        )
      })}
    </ol>
  )
}
