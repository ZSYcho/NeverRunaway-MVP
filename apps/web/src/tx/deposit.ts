import { storeDepositContractAbi } from '@neverrunaway/shared'
import { type Address, erc20Abi } from 'viem'
import type { Config } from 'wagmi'
import { readContract, readContracts, simulateContract, writeContract } from 'wagmi/actions'
import { tierStatus } from '../features/stores/tiers.ts'
import type { MessageKey } from '../i18n/messages.ts'
import { nowInSeconds } from '../lib/time.ts'
import { PreflightError } from '../lib/txErrors.ts'
import { storeAbi } from './abis.ts'
import { confirmAndWait, type TxProgress } from './confirmAndWait.ts'

export type DepositStep = 'approve' | 'deposit'

export type DepositParameters = {
  chainId: number
  account: Address
  store: Address
  usdc: Address
  tierId: bigint
  depositAmount: bigint
}

/** Whether the store may already pull this deposit, or the user has to approve it first. */
export async function needsApproval(
  config: Config,
  { chainId, account, store, usdc, depositAmount }: Omit<DepositParameters, 'tierId'>,
): Promise<boolean> {
  const allowance = await readContract(config, {
    chainId,
    address: usdc,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [account, store],
  })
  return allowance < depositAmount
}

const blockedKeys = {
  disabled: 'txTierUnavailable',
  expired: 'txTierUnavailable',
  storeInactive: 'txStoreNotActive',
  membersOnly: 'txMembersOnly',
  bonusSoldOut: 'txBonusSoldOut',
} as const satisfies Record<string, MessageKey>

/**
 * userDeposit can't be simulated before the approval exists, so its checks are repeated on fresh
 * chain state first: a deposit that would revert must not cost the user an approval.
 */
async function assertPurchasable(
  config: Config,
  { chainId, account, store, tierId }: DepositParameters,
) {
  const contract = { chainId, address: store, abi: storeDepositContractAbi } as const
  const [tier, storeActive, memberLevel, bonusPool] = await readContracts(config, {
    allowFailure: false,
    contracts: [
      { ...contract, functionName: 'getTier', args: [tierId] },
      { ...contract, functionName: 'isActive' },
      { ...contract, functionName: 'memberLevel', args: [account] },
      { ...contract, functionName: 'bonusPool' },
    ],
  })
  const status = tierStatus(tier, { now: nowInSeconds(), memberLevel, bonusPool, storeActive })
  if (status !== 'available') throw new PreflightError(blockedKeys[status])
}

/**
 * Buys a deposit tier: approve the exact deposit (never an unlimited allowance), then
 * userDeposit(tierId). Nothing reaches the wallet unless the deposit is expected to succeed,
 * and each write is simulated first.
 */
export async function deposit(
  config: Config,
  parameters: DepositParameters,
  onProgress: (progress: TxProgress<DepositStep>) => void,
) {
  const { chainId, account, store, usdc, tierId, depositAmount } = parameters
  await assertPurchasable(config, parameters)

  if (await needsApproval(config, parameters)) {
    const { request } = await simulateContract(config, {
      chainId,
      account,
      address: usdc,
      abi: erc20Abi,
      functionName: 'approve',
      args: [store, depositAmount],
    })
    await confirmAndWait(
      config,
      chainId,
      () => writeContract(config, request),
      (phase, hash) => onProgress({ step: 'approve', phase, hash }),
    )
  }

  const { request } = await simulateContract(config, {
    chainId,
    account,
    address: store,
    abi: storeAbi,
    functionName: 'userDeposit',
    args: [tierId],
  })
  return confirmAndWait(
    config,
    chainId,
    () => writeContract(config, request),
    (phase, hash) => onProgress({ step: 'deposit', phase, hash }),
  )
}
