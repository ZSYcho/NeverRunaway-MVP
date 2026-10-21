import { type FeaturedWallet, featuredWallets } from './featuredWallets.ts'

/** A wallet available in this browser, backed by a wagmi connector. */
export type DiscoveredWallet = {
  connectorId: string
  name: string
  icon?: string
  rdns?: string
}

export type WalletOptions = {
  /** Wallets in this browser: featured ones first, then the rest by name. */
  detected: DiscoveredWallet[]
  /** Featured wallets not found here: offer installing them or opening the dApp in their app. */
  suggested: FeaturedWallet[]
}

/**
 * @param announced Wallets that announced themselves through EIP-6963.
 * @param legacy The plain `window.ethereum` provider. Only offered when nothing announced itself,
 *   because it is usually one of the announced wallets under another name.
 */
export function buildWalletOptions(
  announced: readonly DiscoveredWallet[],
  legacy?: DiscoveredWallet,
): WalletOptions {
  const rank = (wallet: DiscoveredWallet) => {
    const index = featuredWallets.findIndex(
      (featured) => featured.rdns && featured.rdns === wallet.rdns,
    )
    return index === -1 ? featuredWallets.length : index
  }

  const detected =
    announced.length > 0
      ? [...announced].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
      : legacy
        ? [legacy]
        : []

  const installed = new Set(detected.map((wallet) => wallet.rdns))
  const suggested = featuredWallets.filter((wallet) => !wallet.rdns || !installed.has(wallet.rdns))

  return { detected, suggested }
}
