import { BaseError, ContractFunctionRevertedError } from 'viem'
import type { MessageKey } from '../i18n/messages.ts'
import { walletErrorKey } from '../wallet/errors.ts'

/** Thrown when a mined transaction's receipt reports a revert. */
export class TransactionRevertedError extends Error {
  override name = 'TransactionRevertedError'
}

/** A flow stopped by a pre-check, before any wallet prompt, because the call would revert. */
export class PreflightError extends Error {
  override name = 'PreflightError'
  readonly key: MessageKey

  constructor(key: MessageKey) {
    super(`Preflight check failed: ${key}`)
    this.key = key
  }
}

// Custom errors from StoreDepositContract, and ERC-20 errors that bubble up through SafeERC20.
const revertKeys: Partial<Record<string, MessageKey>> = {
  InsufficientBonusPool: 'txBonusSoldOut',
  MemberLevelTooLow: 'txMembersOnly',
  TierExpired: 'txTierUnavailable',
  TierInactive: 'txTierUnavailable',
  StoreNotActive: 'txStoreNotActive',
  StoreStillActive: 'txStoreStillActive',
  NothingToRefund: 'txNothingToRefund',
  ERC20InsufficientBalance: 'txInsufficientBalance',
  ERC20InsufficientAllowance: 'txInsufficientAllowance',
}

/** Maps a failed transaction to a message: the contract's revert reason first, then the wallet. */
export function txErrorKey(error: unknown): MessageKey {
  if (error instanceof PreflightError) return error.key
  if (error instanceof TransactionRevertedError) return 'txReverted'
  if (error instanceof BaseError) {
    const revert = error.walk((cause) => cause instanceof ContractFunctionRevertedError)
    if (revert instanceof ContractFunctionRevertedError) {
      const errorName = revert.data?.errorName
      return (errorName && revertKeys[errorName]) || 'txReverted'
    }
  }
  return walletErrorKey(error)
}
