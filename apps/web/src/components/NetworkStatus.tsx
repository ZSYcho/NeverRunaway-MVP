import { useBlockNumber } from 'wagmi'
import { targetChain } from '../chain.ts'
import { useI18n } from '../i18n/useI18n.ts'

/** Which chain the app reads from, and whether its RPC is reachable. */
export function NetworkStatus() {
  const { t } = useI18n()
  const { data: blockNumber, isError } = useBlockNumber({ chainId: targetChain.id, watch: true })

  return (
    <div
      title={targetChain.name}
      className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/60 px-2.5 py-2 text-xs text-slate-300 sm:px-3 sm:py-1.5"
    >
      <span
        aria-hidden
        className={`size-2 rounded-full ${isError ? 'bg-rose-500' : 'bg-emerald-400'}`}
      />
      <span className="sr-only sm:not-sr-only">{targetChain.name}</span>
      <span className="hidden font-mono text-slate-500 sm:inline">
        {isError ? t('rpcUnreachable') : blockNumber === undefined ? '…' : `#${blockNumber}`}
      </span>
    </div>
  )
}
