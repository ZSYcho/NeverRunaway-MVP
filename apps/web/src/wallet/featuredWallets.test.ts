import { describe, expect, it } from 'vitest'
import { featuredWallets, getFeaturedWallet } from './featuredWallets.ts'

// Characters that broke OKX links when the dApp URL was not encoded (tronwallet-adapter#47).
const dappUrl = 'https://nr.example.com/store/0xabc?ref=qr&note=50%25+off'

function openInApp(id: Parameters<typeof getFeaturedWallet>[0]) {
  const link = getFeaturedWallet(id).openInApp?.(dappUrl)
  if (!link) throw new Error(`${id} has no open-in-app link`)
  return link
}

describe('open-in-app links', () => {
  it('OKX: app deep link inside a universal link, dApp URL encoded within the deep link', () => {
    const link = new URL(openInApp('okx'))
    expect(`${link.origin}${link.pathname}`).toBe('https://www.okx.com/download')
    const deepLink = link.searchParams.get('deeplink') ?? ''
    expect(deepLink.startsWith('okx://wallet/dapp/url?dappUrl=')).toBe(true)
    expect(new URL(deepLink).searchParams.get('dappUrl')).toBe(dappUrl)
  })

  it('Bitget: https universal link, the only form Android supports', () => {
    const link = new URL(openInApp('bitget'))
    expect(link.origin).toBe('https://bkcode.vip')
    expect(link.searchParams.get('action')).toBe('dapp')
    expect(link.searchParams.get('url')).toBe(dappUrl)
  })

  it('MetaMask: dApp URL appended without its protocol', () => {
    expect(openInApp('metamask')).toBe(
      'https://link.metamask.io/dapp/nr.example.com/store/0xabc?ref=qr&note=50%25+off',
    )
  })

  it('Trust Wallet: open_url with the Ethereum SLIP-44 coin id', () => {
    const link = new URL(openInApp('trust'))
    expect(`${link.origin}${link.pathname}`).toBe('https://link.trustwallet.com/open_url')
    expect(link.searchParams.get('coin_id')).toBe('60')
    expect(link.searchParams.get('url')).toBe(dappUrl)
  })

  it('TokenPocket: URL-encoded JSON params', () => {
    const link = new URL(openInApp('tokenpocket'))
    expect(link.protocol).toBe('tpdapp:')
    const params = JSON.parse(link.searchParams.get('params') ?? '{}') as { url?: string }
    expect(params.url).toBe(dappUrl)
  })

  it('imToken: navigate to the DappView screen', () => {
    const link = new URL(openInApp('imtoken'))
    expect(link.protocol).toBe('imtokenv2:')
    expect(link.searchParams.get('screen')).toBe('DappView')
    expect(link.searchParams.get('url')).toBe(dappUrl)
  })

  it('Binance Wallet: no documented link, so users go through WalletConnect', () => {
    expect(getFeaturedWallet('binance').openInApp).toBeUndefined()
  })
})

describe('featured wallet registry', () => {
  it('uses unique ids, EIP-6963 rdns names and WalletConnect registry ids', () => {
    const ids = featuredWallets.map((wallet) => wallet.id)
    expect(new Set(ids).size).toBe(ids.length)

    const rdns = featuredWallets.flatMap((wallet) => (wallet.rdns ? [wallet.rdns] : []))
    expect(new Set(rdns).size).toBe(rdns.length)

    for (const wallet of featuredWallets) {
      expect(wallet.walletConnectId, wallet.name).toMatch(/^[0-9a-f]{64}$/)
    }
  })
})
