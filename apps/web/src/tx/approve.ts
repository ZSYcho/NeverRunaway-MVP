import { type Address, erc20Abi, type Hash } from 'viem'
import type { Config } from 'wagmi'
import { readContract, simulateContract, writeContract } from 'wagmi/actions'
import { confirmAndWait, type TxPhase } from './confirmAndWait.ts'

export type ApprovalParameters = {
  chainId: number
  account: Address
  token: Address
  spender: Address
  amount: bigint
}

/** Whether `spender` needs an approval before it can pull `amount` of `token` from `account`. */
export async function needsApproval(
  config: Config,
  { chainId, account, token, spender, amount }: ApprovalParameters,
): Promise<boolean> {
  const allowance = await readContract(config, {
    chainId,
    address: token,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [account, spender],
  })
  return allowance < amount
}

/**
 * Approves exactly `amount`, and only when the current allowance falls short: the spender never
 * gets an unlimited allowance, and an allowance that already covers the amount saves a prompt.
 */
export async function approveExactly(
  config: Config,
  parameters: ApprovalParameters,
  onPhase: (phase: TxPhase, hash?: Hash) => void,
) {
  if (!(await needsApproval(config, parameters))) return
  const { chainId, account, token, spender, amount } = parameters
  const { request } = await simulateContract(config, {
    chainId,
    account,
    address: token,
    abi: erc20Abi,
    functionName: 'approve',
    args: [spender, amount],
  })
  await confirmAndWait(config, chainId, () => writeContract(config, request), onPhase)
}
