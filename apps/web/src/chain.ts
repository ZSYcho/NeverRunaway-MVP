import { anvil, getDeployment, getKnownChain, xLayerTestnet } from '@neverrunaway/shared'

/** The single chain this build operates on. Wallets on any other chain are asked to switch. */
export const targetChain = resolveTargetChain(import.meta.env.VITE_CHAIN_ID)

/** Contract addresses on the target chain; undefined until contracts are deployed there. */
export const deployment = getDeployment(targetChain.id)

/** The local anvil chain, which also offers dev RPC methods such as anvil_setBalance. */
export const isLocalChain = targetChain.id === anvil.id

/** Where to get test gas when the target chain is a testnet. */
export const gasFaucetUrl =
  targetChain.id === xLayerTestnet.id ? 'https://web3.okx.com/xlayer/faucet' : undefined

/** Block explorer link for a transaction or an address, when the chain has an explorer. */
export function explorerUrl(kind: 'tx' | 'address', value: string): string | undefined {
  const base = targetChain.blockExplorers?.default.url
  return base ? `${base}/${kind}/${value}` : undefined
}

function resolveTargetChain(value: string | undefined) {
  // The local chain is never the default outside development builds.
  const chainId = value ? Number(value) : import.meta.env.DEV ? anvil.id : xLayerTestnet.id
  const chain = getKnownChain(chainId)
  if (!chain) throw new Error(`Unsupported VITE_CHAIN_ID: ${value}`)
  return chain
}
