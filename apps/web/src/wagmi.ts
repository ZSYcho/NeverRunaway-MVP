import { anvil, xLayerTestnet } from '@neverrunaway/shared'
import { createConfig, http } from 'wagmi'
import { targetChain } from './chain.ts'

// Wallet connectors (EIP-6963 discovery, WalletConnect, ...) arrive with the wallet-access work.
export const wagmiConfig = createConfig({
  chains: [targetChain],
  transports: {
    [anvil.id]: http(),
    [xLayerTestnet.id]: http(),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}
