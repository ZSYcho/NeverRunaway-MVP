import { type Connector, type UseConnectReturnType, useConnectors } from 'wagmi'
import { useI18n } from '../../i18n/useI18n.ts'
import type { wagmiConfig } from '../../wagmi.ts'
import { getBrowserEnvironment } from '../../wallet/browser.ts'
import { walletErrorKey } from '../../wallet/errors.ts'
import { getFeaturedWallet } from '../../wallet/featuredWallets.ts'
import { walletConnectConnector } from '../../wallet/walletConnect.ts'
import { buildWalletOptions, type DiscoveredWallet } from '../../wallet/walletOptions.ts'
import { Dialog } from '../Dialog.tsx'
import { WalletAvatar } from './WalletAvatar.tsx'

type ConnectMutation = UseConnectReturnType<typeof wagmiConfig>

const sectionTitle = 'text-xs font-medium tracking-wider text-slate-500 uppercase'

/** Wallets announced through EIP-6963 get their own connector, with the rdns as its id. */
function isAnnounced(connector: Connector): boolean {
  return connector.type === 'injected' && connector.id !== 'injected'
}

function toDiscovered(connector: Connector): DiscoveredWallet {
  const rdns = typeof connector.rdns === 'string' ? connector.rdns : connector.rdns?.[0]
  return { connectorId: connector.id, name: connector.name, icon: connector.icon, rdns }
}

export function ConnectModal({
  open,
  onClose,
  connect,
}: {
  open: boolean
  onClose: () => void
  connect: ConnectMutation
}) {
  const { t } = useI18n()
  const connectors = useConnectors()
  const env = getBrowserEnvironment()

  const legacy: DiscoveredWallet | undefined = env.hasInjectedProvider
    ? {
        connectorId: 'injected',
        name: env.injectedWallet ? getFeaturedWallet(env.injectedWallet).name : t('browserWallet'),
      }
    : undefined
  const { detected, suggested } = buildWalletOptions(
    connectors.filter(isAnnounced).map(toDiscovered),
    legacy,
  )

  const installable = suggested.filter((wallet) => wallet.extensionUrl)
  const pendingConnector = connect.isPending ? connect.variables?.connector : undefined
  const pendingId = typeof pendingConnector === 'object' ? pendingConnector.id : undefined
  const errorKey = connect.error ? walletErrorKey(connect.error) : undefined
  const dappUrl = window.location.href

  const connectTo = (connectorId: string) => {
    const connector = connectors.find((candidate) => candidate.id === connectorId)
    if (connector) connect.mutate({ connector }, { onSuccess: onClose })
  }

  const connectWithWalletConnect = () => {
    if (!walletConnectConnector) return
    // This <dialog> sits in the browser's top layer, above any z-index; close it so the QR modal shows.
    onClose()
    connect.mutate({ connector: walletConnectConnector })
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('connectTitle')}>
      {detected.length > 0 && (
        <section className="space-y-2">
          <h3 className={sectionTitle}>{t('installedWallets')}</h3>
          <ul className="space-y-2">
            {detected.map((wallet) => (
              <li key={wallet.connectorId}>
                <button
                  type="button"
                  onClick={() => connectTo(wallet.connectorId)}
                  disabled={connect.isPending}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-slate-800/60 px-4 py-3 text-left transition hover:border-indigo-400/50 hover:bg-slate-800 disabled:opacity-60"
                >
                  <WalletAvatar name={wallet.name} icon={wallet.icon} />
                  <span className="flex-1 font-medium">{wallet.name}</span>
                  {pendingId === wallet.connectorId && (
                    <span className="text-xs text-slate-400">{t('connecting')}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {env.isMobile && !env.hasInjectedProvider && (
        <section className="space-y-2">
          <h3 className={sectionTitle}>{t('openInWalletApp')}</h3>
          <p className="text-sm text-slate-400">{t('openInWalletAppHint')}</p>
          <ul className="grid grid-cols-2 gap-2">
            {suggested.map(
              (wallet) =>
                wallet.openInApp && (
                  <li key={wallet.id}>
                    <a
                      href={wallet.openInApp(dappUrl)}
                      className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-800/60 px-3 py-2.5 text-sm transition hover:bg-slate-800"
                    >
                      <WalletAvatar name={wallet.name} size="sm" />
                      <span className="truncate">{wallet.name}</span>
                    </a>
                  </li>
                ),
            )}
          </ul>
        </section>
      )}

      {walletConnectConnector && (
        <button
          type="button"
          onClick={connectWithWalletConnect}
          className="flex w-full items-center gap-3 rounded-2xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-3 text-left transition hover:bg-indigo-500/20"
        >
          <WalletAvatar name="Wallet Connect" />
          <span className="flex-1">
            <span className="block font-medium">
              {env.isMobile ? t('walletConnectMobile') : t('walletConnectDesktop')}
            </span>
            <span className="block text-xs text-slate-400">{t('walletConnectSubtitle')}</span>
          </span>
        </button>
      )}

      {!env.isMobile && detected.length === 0 && (
        <p className="text-sm text-slate-400">{t('noWalletDetected')}</p>
      )}

      {!env.isMobile && installable.length > 0 && (
        <section className="space-y-2">
          <h3 className={sectionTitle}>{t('getWallet')}</h3>
          <ul className="flex flex-wrap gap-2">
            {installable.map((wallet) => (
              <li key={wallet.id}>
                <a
                  href={wallet.extensionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 transition hover:bg-slate-800"
                >
                  {wallet.name}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {errorKey && (
        <p role="alert" className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {t(errorKey)}
        </p>
      )}

      <p className="text-xs leading-relaxed text-slate-500">{t('connectHint')}</p>
    </Dialog>
  )
}
