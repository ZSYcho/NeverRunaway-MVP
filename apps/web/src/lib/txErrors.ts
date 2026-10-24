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

// Custom errors from StoreDepositContract (also raised through the factory, which deploys stores),
// and ERC-20 errors that bubble up through SafeERC20.
const revertKeys: Partial<Record<string, MessageKey>> = {
  InsufficientBonusPool: 'txBonusSoldOut',
  MemberLevelTooLow: 'txMembersOnly',
  TierExpired: 'txTierUnavailable',
  TierInactive: 'txTierUnavailable',
  StoreNotActive: 'txStoreNotActive',
  StoreStillActive: 'txStoreStillActive',
  NothingToRefund: 'txNothingToRefund',
  OnlyMerchant: 'txOnlyMerchant',
  InvalidTier: 'txInvalidTier',
  InvalidValidUntil: 'txInvalidValidUntil',
  NothingToWithdraw: 'txNothingToWithdraw',
  AlreadyClosed: 'txAlreadyClosed',
  InvalidSignature: 'txInvalidSignature',
  SignatureExpired: 'txSignatureExpired',
  InsufficientCredit: 'txInsufficientCredit',
  ERC20InsufficientBalance: 'txInsufficientBalance',
  ERC20InsufficientAllowance: 'txInsufficientAllowance',
}

function findRevert(error: unknown): ContractFunctionRevertedError | undefined {
  if (!(error instanceof BaseError)) return undefined
  const revert = error.walk((cause) => cause instanceof ContractFunctionRevertedError)
  return revert instanceof ContractFunctionRevertedError ? revert : undefined
}

/** The custom error a call or simulation reverted with, such as 'InvalidSignature'. */
export function revertErrorName(error: unknown): string | undefined {
  return findRevert(error)?.data?.errorName
}

/** Maps a failed transaction to a message: the contract's revert reason first, then the wallet. */
export function txErrorKey(error: unknown): MessageKey {
  if (error instanceof PreflightError) return error.key
  if (error instanceof TransactionRevertedError) return 'txReverted'
  const revert = findRevert(error)
  if (revert) {
    const errorName = revert.data?.errorName
    return (errorName && revertKeys[errorName]) || 'txReverted'
  }
  return walletErrorKey(error)
}
