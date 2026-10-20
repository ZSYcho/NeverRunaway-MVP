import { anvil, getDeployment, getKnownChain, xLayerTestnet } from '@neverrunaway/shared'

/** The single chain this build operates on. Wallets on any other chain are asked to switch. */
export const targetChain = resolveTargetChain(import.meta.env.VITE_CHAIN_ID)

/** Contract addresses on the target chain; undefined until contracts are deployed there. */
export const deployment = getDeployment(targetChain.id)

function resolveTargetChain(value: string | undefined) {
  // The local chain is never the default outside development builds.
  const chainId = value ? Number(value) : import.meta.env.DEV ? anvil.id : xLayerTestnet.id
  const chain = getKnownChain(chainId)
  if (!chain) throw new Error(`Unsupported VITE_CHAIN_ID: ${value}`)
  return chain
}
