import type { Connector } from 'wagmi'
import { identifyInjectedWallet, isMobileDevice, type ProviderFlags } from './environment.ts'
import { type FeaturedWalletId, getFeaturedWallet } from './featuredWallets.ts'

export type BrowserEnvironment = {
  isMobile: boolean
  hasInjectedProvider: boolean
  /** A wallet app's built-in browser: a mobile browser with an injected provider. */
  isInAppBrowser: boolean
  injectedWallet?: FeaturedWalletId
}

export function getBrowserEnvironment(): BrowserEnvironment {
  const injected = (window as unknown as { ethereum?: ProviderFlags }).ethereum
  const isMobile = isMobileDevice(navigator.userAgent, navigator.maxTouchPoints)
  return {
    isMobile,
    hasInjectedProvider: Boolean(injected),
    isInAppBrowser: isMobile && Boolean(injected),
    injectedWallet: identifyInjectedWallet(injected),
  }
}

/**
 * The plain injected connector is named "Injected"; name the wallet behind it when its flags say
 * which one it is. Undefined means an unrecognized browser wallet.
 */
export function connectorDisplayName(
  connector: Pick<Connector, 'id' | 'name'>,
): string | undefined {
  if (connector.id !== 'injected') return connector.name
  const wallet = getBrowserEnvironment().injectedWallet
  return wallet ? getFeaturedWallet(wallet).name : undefined
}

/** In a wallet's own browser that wallet is the only one; its EIP-6963 connector has name and icon. */
export function pickInAppConnector(connectors: readonly Connector[]): Connector | undefined {
  return (
    connectors.find((connector) => connector.type === 'injected' && connector.id !== 'injected') ??
    connectors.find((connector) => connector.id === 'injected')
  )
}
