import type { Address } from 'viem'
import type { Config } from 'wagmi'
import { simulateContract, writeContract } from 'wagmi/actions'
import { storeAbi } from './abis.ts'
import { confirmAndWait, type TxProgress } from './confirmAndWait.ts'

/** Takes the remaining principal back once the store is closed or expired. */
export async function refund(
  config: Config,
  { chainId, account, store }: { chainId: number; account: Address; store: Address },
  onProgress: (progress: TxProgress<'refund'>) => void,
) {
  const { request } = await simulateContract(config, {
    chainId,
    account,
    address: store,
    abi: storeAbi,
    functionName: 'userRefund',
  })
  return confirmAndWait(
    config,
    chainId,
    () => writeContract(config, request),
    (phase, hash) => onProgress({ step: 'refund', phase, hash }),
  )
}
