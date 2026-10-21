import { anvil, xLayerTestnet } from '@neverrunaway/shared'
import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { targetChain } from './chain.ts'

// Wallets that announce themselves through EIP-6963 are added automatically
// (multiInjectedProviderDiscovery). The plain injected connector covers wallets that only set
// window.ethereum; waiting for late injection helps mobile in-app browsers such as MetaMask's.
// WalletConnect is not listed here on purpose: see wallet/walletConnect.ts.
export const wagmiConfig = createConfig({
  chains: [targetChain],
  connectors: [injected({ unstable_shimAsyncInject: 2_000 })],
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
