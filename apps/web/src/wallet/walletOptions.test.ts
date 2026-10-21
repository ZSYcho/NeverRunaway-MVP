import { describe, expect, it } from 'vitest'
import { buildWalletOptions, type DiscoveredWallet } from './walletOptions.ts'

const okx: DiscoveredWallet = {
  connectorId: 'com.okex.wallet',
  name: 'OKX Wallet',
  rdns: 'com.okex.wallet',
}
const metaMask: DiscoveredWallet = {
  connectorId: 'io.metamask',
  name: 'MetaMask',
  rdns: 'io.metamask',
}
const rabby: DiscoveredWallet = { connectorId: 'io.rabby', name: 'Rabby Wallet', rdns: 'io.rabby' }
const zerion: DiscoveredWallet = {
  connectorId: 'io.zerion.wallet',
  name: 'Zerion',
  rdns: 'io.zerion.wallet',
}
const legacy: DiscoveredWallet = { connectorId: 'injected', name: 'Browser wallet' }

describe('buildWalletOptions', () => {
  it('lists featured wallets first in featured order, then any other EIP-6963 wallet by name', () => {
    const { detected } = buildWalletOptions([zerion, metaMask, rabby, okx])
    expect(detected.map((wallet) => wallet.connectorId)).toEqual([
      'com.okex.wallet',
      'io.metamask',
      'io.rabby',
      'io.zerion.wallet',
    ])
  })

  it('suggests the featured wallets that are not installed', () => {
    const { suggested } = buildWalletOptions([metaMask])
    expect(suggested.map((wallet) => wallet.id)).toEqual([
      'okx',
      'bitget',
      'trust',
      'tokenpocket',
      'imtoken',
      'binance',
    ])
  })

  it('falls back to the legacy injected provider only when no wallet announced itself', () => {
    expect(buildWalletOptions([], legacy).detected).toEqual([legacy])
    expect(buildWalletOptions([okx], legacy).detected).toEqual([okx])
    expect(buildWalletOptions([]).detected).toEqual([])
  })
})
