import type { TxFlow } from '../hooks/useTxFlow.ts'
import { useI18n } from '../i18n/useI18n.ts'
import { txErrorKey } from '../lib/txErrors.ts'
import { TxSteps } from './TxSteps.tsx'

/** A flow's steps once it has started, then how it ended: a success line or the decoded error. */
export function FlowFeedback<Step extends string>({
  flow,
  steps,
  done,
}: {
  flow: TxFlow<Step>
  steps: ReadonlyArray<{ key: Step; label: string }>
  done: string
}) {
  const { t } = useI18n()
  if (flow.status === 'idle') return null

  return (
    <div className="space-y-2">
      <TxSteps steps={steps.map((step) => ({ ...step, state: flow.steps[step.key] }))} />
      {flow.status === 'success' && <p className="text-sm text-emerald-300">{done}</p>}
      {flow.error !== undefined && (
        <p role="alert" className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {t(txErrorKey(flow.error))}
        </p>
      )}
    </div>
  )
}
