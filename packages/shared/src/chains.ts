import { defineChain } from 'viem'
import { foundry, xLayerTestnet as viemXLayerTestnet } from 'viem/chains'

/** Local chain started by `pnpm dev`. */
export const anvil = defineChain({ ...foundry, name: 'Anvil (local)' })

/**
 * viem still ships the pre-rebrand name ("X1 Testnet") and the retired OKLink explorer. Wallets show
 * these values when adding the chain, so they follow X Layer's network-information docs instead.
 */
export const xLayerTestnet = defineChain({
  ...viemXLayerTestnet,
  name: 'X Layer Testnet',
  rpcUrls: {
    default: {
      http: ['https://testrpc.xlayer.tech/terigon', 'https://xlayertestrpc.okx.com/terigon'],
    },
  },
  blockExplorers: {
    default: { name: 'OKX Explorer', url: 'https://web3.okx.com/explorer/x-layer-testnet' },
  },
})

export const knownChains = [anvil, xLayerTestnet] as const

export type KnownChain = (typeof knownChains)[number]
export type KnownChainId = KnownChain['id']

export function getKnownChain(chainId: number): KnownChain | undefined {
  return knownChains.find((chain) => chain.id === chainId)
}
