import type { Hash, TransactionReceipt } from 'viem'
import type { Config } from 'wagmi'
import { waitForTransactionReceipt } from 'wagmi/actions'
import { TransactionRevertedError } from '../lib/txErrors.ts'

/** confirm: waiting for the wallet; pending: sent, waiting to be mined; done: mined successfully. */
export type TxPhase = 'confirm' | 'pending' | 'done'

export type TxProgress<Step extends string> = { step: Step; phase: TxPhase; hash?: Hash }

/**
 * Sends a write that has already been simulated, then waits for its receipt. Callers simulate
 * first, so a call that would revert fails with its reason before the wallet ever opens.
 */
export async function confirmAndWait(
  config: Config,
  chainId: number,
  send: () => Promise<Hash>,
  onPhase: (phase: TxPhase, hash?: Hash) => void,
): Promise<TransactionReceipt> {
  onPhase('confirm')
  const hash = await send()
  onPhase('pending', hash)
  const receipt = await waitForTransactionReceipt(config, { hash, chainId })
  if (receipt.status !== 'success')
    throw new TransactionRevertedError(`Transaction ${hash} reverted`)
  onPhase('done', hash)
  return receipt
}
