import { erc20Abi } from 'viem'
import { useReadContract } from 'wagmi'
import { deployment, targetChain } from '../chain.ts'

/** Decimals of the deployment's USDC. Read from the token rather than assumed to be 6. */
export function useUsdcDecimals(): number | undefined {
  const { data } = useReadContract({
    chainId: targetChain.id,
    address: deployment?.usdc,
    abi: erc20Abi,
    functionName: 'decimals',
    query: { enabled: deployment !== undefined, staleTime: Number.POSITIVE_INFINITY },
  })
  return data
}
