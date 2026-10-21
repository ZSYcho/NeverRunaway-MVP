export type FeaturedWalletId =
  'okx' | 'bitget' | 'metamask' | 'trust' | 'tokenpocket' | 'imtoken' | 'binance'

export type FeaturedWallet = {
  id: FeaturedWalletId
  name: string
  /** EIP-6963 reverse-DNS name, which identifies the installed extension. */
  rdns?: string
  /** Id in the WalletConnect registry, used to list the wallet first in the WalletConnect modal. */
  walletConnectId: string
  /** Browser extension in the Chrome Web Store, for desktop users without it. */
  extensionUrl?: string
  /** Where to get the app. */
  homepage: string
  /** Link that opens a dApp URL in the wallet app's built-in browser, from the wallet's docs. */
  openInApp?: (dappUrl: string) => string
}

// Ordered for the target market: X Layer users, many of them on Asian mobile wallets.
// Registry ids and rdns come from the WalletConnect registry; link formats are listed with their
// sources in docs/wallet-access.md.
export const featuredWallets: readonly FeaturedWallet[] = [
  {
    id: 'okx',
    name: 'OKX Wallet',
    rdns: 'com.okex.wallet',
    walletConnectId: '971e689d0a5be527bac79629b4ee9b925e82208e5168b733496a09c0faed0709',
    extensionUrl: 'https://chromewebstore.google.com/detail/mcohilncbfahbmgdjkbpemcciiolgcge',
    homepage: 'https://www.okx.com/web3',
    // The universal link opens the app's deep link when installed and the download page otherwise.
    openInApp: (dappUrl) =>
      `https://www.okx.com/download?deeplink=${encodeURIComponent(
        `okx://wallet/dapp/url?dappUrl=${encodeURIComponent(dappUrl)}`,
      )}`,
  },
  {
    id: 'bitget',
    name: 'Bitget Wallet',
    rdns: 'com.bitget.web3',
    walletConnectId: '38f5d18bd8522c244bdd70cb4a68e0e718865155811c043f052fb9f1c51de662',
    extensionUrl: 'https://chromewebstore.google.com/detail/jiidiaalihmmhddjgbnbgdfflelocpak',
    homepage: 'https://web3.bitget.com',
    openInApp: (dappUrl) => `https://bkcode.vip?action=dapp&url=${encodeURIComponent(dappUrl)}`,
  },
  {
    id: 'metamask',
    name: 'MetaMask',
    rdns: 'io.metamask',
    walletConnectId: 'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
    extensionUrl: 'https://chromewebstore.google.com/detail/nkbihfbeogaeaoehlefnkodbefgpgknn',
    homepage: 'https://metamask.io/download',
    openInApp: (dappUrl) => `https://link.metamask.io/dapp/${dappUrl.replace(/^https?:\/\//, '')}`,
  },
  {
    id: 'trust',
    name: 'Trust Wallet',
    rdns: 'com.trustwallet.app',
    walletConnectId: '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0',
    extensionUrl: 'https://chromewebstore.google.com/detail/egjidjbpglichdcondbcbdnbeeppgdph',
    homepage: 'https://trustwallet.com/download',
    // coin_id is the SLIP-44 index; 60 selects Ethereum-compatible networks.
    openInApp: (dappUrl) =>
      `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(dappUrl)}`,
  },
  {
    id: 'tokenpocket',
    name: 'TokenPocket',
    rdns: 'pro.tokenpocket',
    walletConnectId: '20459438007b75f4f4acb98bf29aa3b800550309646d375da5fd4aac6c2a2c66',
    extensionUrl: 'https://chromewebstore.google.com/detail/mfgccjchihfkkindfppnaooecgfneiii',
    homepage: 'https://www.tokenpocket.pro',
    openInApp: (dappUrl) =>
      `tpdapp://open?params=${encodeURIComponent(JSON.stringify({ url: dappUrl, source: 'NeverRunaway' }))}`,
  },
  {
    id: 'imtoken',
    name: 'imToken',
    walletConnectId: 'ef333840daf915aafdc4a004525502d6d49d77bd9c65e0642dbaefb3c2893bef',
    homepage: 'https://token.im',
    openInApp: (dappUrl) =>
      `imtokenv2://navigate?screen=DappView&url=${encodeURIComponent(dappUrl)}`,
  },
  {
    // Binance documents no link that opens a dApp in its app; WalletConnect covers it.
    id: 'binance',
    name: 'Binance Wallet',
    rdns: 'com.binance.wallet',
    walletConnectId: '8a0ee50d1f22f6651afcae7eb4253e52a3310b90af5daef78a8c4929a9bb99d4',
    extensionUrl: 'https://chromewebstore.google.com/detail/cadiboklkpojfamcoggejbbdjcoiljjk',
    homepage: 'https://www.binance.com/en/web3wallet',
  },
]

export function getFeaturedWallet(id: FeaturedWalletId): FeaturedWallet {
  const wallet = featuredWallets.find((candidate) => candidate.id === id)
  if (!wallet) throw new Error(`Unknown featured wallet: ${id}`)
  return wallet
}
