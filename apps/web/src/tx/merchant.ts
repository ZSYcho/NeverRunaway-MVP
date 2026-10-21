import { storeDepositFactoryAbi } from '@neverrunaway/shared'
import { type Address, erc20Abi, isAddressEqual, parseEventLogs } from 'viem'
import type { Config } from 'wagmi'
import { readContract, simulateContract, writeContract } from 'wagmi/actions'
import type { NewStore, NewTier } from '../features/merchant/forms.ts'
import { PreflightError } from '../lib/txErrors.ts'
import { factoryAbi, storeAbi } from './abis.ts'
import { approveExactly } from './approve.ts'
import { confirmAndWait, type TxProgress } from './confirmAndWait.ts'

/** A write to one store, sent from the merchant's wallet (or, for fundBonus, anyone's). */
type StoreWrite = { chainId: number; account: Address; store: Address }

/**
 * Opens a store: the factory deploys a store contract with the caller as its merchant. The new
 * address comes from the receipt's StoreContractCreated event, not from the simulation, which can
 * only predict it: a store created by someone else first would take the predicted address.
 */
export async function createStore(
  config: Config,
  {
    chainId,
    account,
    factory,
    expireDays,
    depositAmounts,
    creditAmounts,
  }: { chainId: number; account: Address; factory: Address } & NewStore,
  onProgress: (progress: TxProgress<'create'>) => void,
): Promise<Address> {
  const { request } = await simulateContract(config, {
    chainId,
    account,
    address: factory,
    abi: factoryAbi,
    functionName: 'createStoreContract',
    args: [expireDays, depositAmounts, creditAmounts],
  })
  const receipt = await confirmAndWait(
    config,
    chainId,
    () => writeContract(config, request),
    (phase, hash) => onProgress({ step: 'create', phase, hash }),
  )
  const created = parseEventLogs({
    abi: storeDepositFactoryAbi,
    eventName: 'StoreContractCreated',
    logs: receipt.logs,
  }).find((log) => isAddressEqual(log.address, factory))
  if (!created) throw new Error(`No StoreContractCreated event in ${receipt.transactionHash}`)
  return created.args.storeContract
}

/** Appends a deposit tier. Tiers never change once added, so this is also how one is "edited". */
export async function addTier(
  config: Config,
  { chainId, account, store, tier }: StoreWrite & { tier: NewTier },
  onProgress: (progress: TxProgress<'addTier'>) => void,
) {
  const { request } = await simulateContract(config, {
    chainId,
    account,
    address: store,
    abi: storeAbi,
    functionName: 'addTier',
    args: [
      tier.depositAmount,
      tier.creditAmount,
      tier.validUntil,
      tier.requiredLevel,
      tier.grantsLevel,
    ],
  })
  return confirmAndWait(
    config,
    chainId,
    () => writeContract(config, request),
    (phase, hash) => onProgress({ step: 'addTier', phase, hash }),
  )
}

/** Stops new deposits on a tier for good. Balances customers already hold are unaffected. */
export async function disableTier(
  config: Config,
  { chainId, account, store, tierId }: StoreWrite & { tierId: bigint },
  onProgress: (progress: TxProgress<'disableTier'>) => void,
) {
  const { request } = await simulateContract(config, {
    chainId,
    account,
    address: store,
    abi: storeAbi,
    functionName: 'disableTier',
    args: [tierId],
  })
  return confirmAndWait(
    config,
    chainId,
    () => writeContract(config, request),
    (phase, hash) => onProgress({ step: 'disableTier', phase, hash }),
  )
}

export type FundBonusStep = 'approve' | 'fund'

/**
 * Prefunds promotional bonus: approve the exact amount, then fundBonus(amount). The contract lets
 * anyone fund a pool, so a sponsor can run the same flow. The balance is checked first, so a
 * transfer that would fail never costs an approval.
 */
export async function fundBonus(
  config: Config,
  { chainId, account, store, usdc, amount }: StoreWrite & { usdc: Address; amount: bigint },
  onProgress: (progress: TxProgress<FundBonusStep>) => void,
) {
  const balance = await readContract(config, {
    chainId,
    address: usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account],
  })
  if (balance < amount) throw new PreflightError('txInsufficientBalance')

  await approveExactly(
    config,
    { chainId, account, token: usdc, spender: store, amount },
    (phase, hash) => onProgress({ step: 'approve', phase, hash }),
  )

  const { request } = await simulateContract(config, {
    chainId,
    account,
    address: store,
    abi: storeAbi,
    functionName: 'fundBonus',
    args: [amount],
  })
  return confirmAndWait(
    config,
    chainId,
    () => writeContract(config, request),
    (phase, hash) => onProgress({ step: 'fund', phase, hash }),
  )
}

/**
 * Takes back bonus that no customer has been promised yet. The contract fails an overdraw with a
 * bare arithmetic panic, so the pool is re-read first to say exactly what went wrong.
 */
export async function withdrawBonus(
  config: Config,
  { chainId, account, store, amount }: StoreWrite & { amount: bigint },
  onProgress: (progress: TxProgress<'withdrawBonus'>) => void,
) {
  const pool = await readContract(config, {
    chainId,
    address: store,
    abi: storeAbi,
    functionName: 'bonusPool',
  })
  if (pool < amount) throw new PreflightError('txBonusPoolTooLow')

  const { request } = await simulateContract(config, {
    chainId,
    account,
    address: store,
    abi: storeAbi,
    functionName: 'withdrawBonusPool',
    args: [amount],
  })
  return confirmAndWait(
    config,
    chainId,
    () => writeContract(config, request),
    (phase, hash) => onProgress({ step: 'withdrawBonus', phase, hash }),
  )
}

/** Sends the merchant everything customers have spent so far. */
export async function withdrawEarnings(
  config: Config,
  { chainId, account, store }: StoreWrite,
  onProgress: (progress: TxProgress<'withdrawEarnings'>) => void,
) {
  const { request } = await simulateContract(config, {
    chainId,
    account,
    address: store,
    abi: storeAbi,
    functionName: 'merchantWithdraw',
  })
  return confirmAndWait(
    config,
    chainId,
    () => writeContract(config, request),
    (phase, hash) => onProgress({ step: 'withdrawEarnings', phase, hash }),
  )
}

/** Closes the store for good: no more deposits or purchases, and customers can refund at once. */
export async function closeStore(
  config: Config,
  { chainId, account, store }: StoreWrite,
  onProgress: (progress: TxProgress<'close'>) => void,
) {
  const { request } = await simulateContract(config, {
    chainId,
    account,
    address: store,
    abi: storeAbi,
    functionName: 'closeStore',
  })
  return confirmAndWait(
    config,
    chainId,
    () => writeContract(config, request),
    (phase, hash) => onProgress({ step: 'close', phase, hash }),
  )
}
