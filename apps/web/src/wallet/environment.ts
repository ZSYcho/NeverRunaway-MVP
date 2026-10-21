import type { FeaturedWalletId } from './featuredWallets.ts'

/** Flags that injected EIP-1193 providers set on themselves. */
export type ProviderFlags = {
  isMetaMask?: boolean
  isOkxWallet?: boolean
  isOKExWallet?: boolean
  isBitKeep?: boolean
  isTrust?: boolean
  isTrustWallet?: boolean
  isTokenPocket?: boolean
  isImToken?: boolean
  isBinance?: boolean
}

export function isMobileDevice(userAgent: string, maxTouchPoints: number): boolean {
  if (/Android|iPhone|iPod|iPad/i.test(userAgent)) return true
  // iPadOS asks for desktop sites with a Mac user agent; touch support gives it away.
  return /Macintosh/i.test(userAgent) && maxTouchPoints > 1
}

/** Which featured wallet injected a provider. Many wallets also set isMetaMask, so it goes last. */
export function identifyInjectedWallet(
  flags: ProviderFlags | undefined,
): FeaturedWalletId | undefined {
  if (!flags) return undefined
  if (flags.isOkxWallet || flags.isOKExWallet) return 'okx'
  if (flags.isBitKeep) return 'bitget'
  if (flags.isTrust || flags.isTrustWallet) return 'trust'
  if (flags.isTokenPocket) return 'tokenpocket'
  if (flags.isImToken) return 'imtoken'
  if (flags.isBinance) return 'binance'
  if (flags.isMetaMask) return 'metamask'
  return undefined
}
