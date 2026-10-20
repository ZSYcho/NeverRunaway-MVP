import { walletConnect } from 'wagmi/connectors'
import { featuredWallets } from './featuredWallets.ts'

export const WALLETCONNECT_CONNECTOR_ID = 'walletConnect'

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID

/**
 * WalletConnect stays out of the wagmi config: a configured connector loads its SDK and initializes
 * on page load, even for users who connect through an extension or a wallet's in-app browser.
 * Instead this connector is passed to `connect` when the user picks WalletConnect, and to
 * `reconnect` when the last session used it. It is created once because the connector caches its
 * provider, so retries reuse a single WalletConnect client instead of starting another one.
 */
export const walletConnectConnector = projectId
  ? walletConnect({
      projectId,
      metadata: {
        name: 'NeverRunaway',
        description: 'Prepaid store credit secured by smart contracts',
        url: window.location.origin,
        icons: [new URL('/favicon.svg', window.location.origin).href],
      },
      qrModalOptions: {
        themeMode: 'dark',
        themeVariables: {
          '--wcm-accent-color': '#6366f1',
          '--wcm-font-family': '"Inter Variable", system-ui, sans-serif',
          '--wcm-z-index': '1000',
        },
        explorerRecommendedWalletIds: featuredWallets.map((wallet) => wallet.walletConnectId),
      },
    })
  : undefined
