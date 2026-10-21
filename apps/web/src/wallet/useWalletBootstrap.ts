import { useEffect } from 'react'
import type { EIP1193Provider } from 'viem'
import { type Config, useConfig } from 'wagmi'
import { connect, reconnect } from 'wagmi/actions'
import { getBrowserEnvironment, pickInAppConnector } from './browser.ts'
import { WALLETCONNECT_CONNECTOR_ID, walletConnectConnector } from './walletConnect.ts'

let started = false

/**
 * Restores the previous wallet session, then connects automatically inside a wallet app's browser.
 * Runs once per page load; WagmiProvider's own reconnect is turned off in favour of this.
 */
export function useWalletBootstrap() {
  const config = useConfig()
  useEffect(() => {
    if (started) return
    started = true
    bootstrapWallet(config).catch((error: unknown) => {
      if (import.meta.env.DEV) console.warn('Wallet bootstrap failed', error)
    })
  }, [config])
}

async function bootstrapWallet(config: Config) {
  const recentConnectorId = await config.storage?.getItem('recentConnectorId')
  // WalletConnect is not in the config, so its session has to be restored explicitly.
  const restored =
    recentConnectorId === WALLETCONNECT_CONNECTOR_ID && walletConnectConnector
      ? await reconnect(config, { connectors: [walletConnectConnector] })
      : await reconnect(config)
  if (restored.length > 0) return

  // In a wallet app's browser the wallet is already chosen. eth_accounts never prompts, so this only
  // reconnects a site the user approved before; otherwise the Connect button works in one tap.
  if (!getBrowserEnvironment().isInAppBrowser) return
  const connector = pickInAppConnector(config.connectors)
  if (!connector) return
  // Respect an explicit disconnect (wagmi records it for injected connectors).
  if (await config.storage?.getItem(`${connector.id}.disconnected`)) return

  const provider = (await connector.getProvider()) as EIP1193Provider | undefined
  const accounts = await provider?.request({ method: 'eth_accounts' }).catch(() => [])
  if (accounts && accounts.length > 0) await connect(config, { connector })
}
