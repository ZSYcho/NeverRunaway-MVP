import { useConnection, useDisconnect } from 'wagmi'
import { targetChain } from '../../chain.ts'
import { useI18n } from '../../i18n/useI18n.ts'
import { connectorDisplayName } from '../../wallet/browser.ts'
import { CopyButton } from '../CopyButton.tsx'
import { Dialog } from '../Dialog.tsx'
import { WalletAvatar } from './WalletAvatar.tsx'

export function AccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const { address, connector } = useConnection()
  const disconnect = useDisconnect()

  if (!address || !connector) return null

  const walletName = connectorDisplayName(connector) ?? t('browserWallet')
  const explorer = targetChain.blockExplorers?.default.url

  return (
    <Dialog open={open} onClose={onClose} title={t('account')}>
      <div className="flex items-center gap-3">
        <WalletAvatar name={walletName} icon={connector.icon} />
        <div className="min-w-0">
          <p className="text-sm text-slate-400">{walletName}</p>
          <p className="font-mono text-sm break-all">{address}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <CopyButton value={address} />
        {explorer && (
          <a
            href={`${explorer}/address/${address}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-slate-800"
          >
            {t('viewOnExplorer')}
          </a>
        )}
      </div>

      <button
        type="button"
        onClick={() => disconnect.mutate(undefined, { onSuccess: onClose })}
        className="w-full rounded-xl border border-rose-400/30 px-4 py-2.5 text-sm text-rose-300 transition hover:bg-rose-500/10"
      >
        {t('disconnect')}
      </button>
    </Dialog>
  )
}
