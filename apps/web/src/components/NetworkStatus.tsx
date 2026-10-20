import { useBlockNumber } from 'wagmi'
import { targetChain } from '../chain.ts'
import { useI18n } from '../i18n/useI18n.ts'

/** Which chain the app reads from, and whether its RPC is reachable. */
export function NetworkStatus() {
  const { t } = useI18n()
  const { data: blockNumber, isError } = useBlockNumber({ chainId: targetChain.id, watch: true })

  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300">
      <span
        aria-hidden
        className={`size-2 rounded-full ${isError ? 'bg-rose-500' : 'bg-emerald-400'}`}
      />
      <span>{targetChain.name}</span>
      <span className="hidden font-mono text-slate-500 sm:inline">
        {isError ? t('rpcUnreachable') : blockNumber === undefined ? '…' : `#${blockNumber}`}
      </span>
    </div>
  )
}
