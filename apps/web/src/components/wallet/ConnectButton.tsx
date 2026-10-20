import { useState } from 'react'
import { useConnect, useConnection, useConnectors } from 'wagmi'
import { targetChain } from '../../chain.ts'
import { useI18n } from '../../i18n/useI18n.ts'
import { shortAddress } from '../../lib/format.ts'
import {
  connectorDisplayName,
  getBrowserEnvironment,
  pickInAppConnector,
} from '../../wallet/browser.ts'
import { walletErrorKey } from '../../wallet/errors.ts'
import { AccountDialog } from './AccountDialog.tsx'
import { ConnectModal } from './ConnectModal.tsx'
import { WalletAvatar } from './WalletAvatar.tsx'

export function ConnectButton() {
  const { t } = useI18n()
  const connection = useConnection()
  const connectors = useConnectors()
  const connect = useConnect()
  const [dialog, setDialog] = useState<'connect' | 'account' | null>(null)
  const closeDialog = () => setDialog(null)

  if (connection.status === 'connected') {
    const wrongChain = connection.chainId !== targetChain.id
    return (
      <>
        <button
          type="button"
          onClick={() => setDialog('account')}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-2.5 py-1.5 text-sm transition hover:bg-slate-800"
        >
          <WalletAvatar
            name={connectorDisplayName(connection.connector) ?? t('browserWallet')}
            icon={connection.connector.icon}
            size="sm"
          />
          <span className="font-mono">{shortAddress(connection.address)}</span>
          {wrongChain && <span aria-hidden className="size-2 rounded-full bg-amber-400" />}
        </button>
        <AccountDialog open={dialog === 'account'} onClose={closeDialog} />
      </>
    )
  }

  const busy =
    connection.status === 'connecting' || connection.status === 'reconnecting' || connect.isPending

  const onClick = () => {
    const env = getBrowserEnvironment()
    const inAppConnector = env.isInAppBrowser ? pickInAppConnector(connectors) : undefined
    if (inAppConnector) {
      // Inside a wallet app's browser the wallet is already chosen: connect in one tap. Show the
      // full picker only if that fails for a reason other than the user saying no.
      connect.mutate(
        { connector: inAppConnector },
        {
          onError: (error) => {
            if (walletErrorKey(error) !== 'walletRejected') setDialog('connect')
          },
        },
      )
      return
    }
    connect.reset()
    setDialog('connect')
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="rounded-xl bg-linear-to-br from-indigo-500 to-violet-500 px-3.5 py-2 text-sm font-semibold shadow-lg shadow-indigo-500/30 transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
      >
        {busy ? t('connecting') : t('connectWallet')}
      </button>
      <ConnectModal open={dialog === 'connect'} onClose={closeDialog} connect={connect} />
    </>
  )
}
