import { mockUsdcAbi, storeDepositContractAbi } from '@neverrunaway/shared'
import {
  type Abi,
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  encodeErrorResult,
  UserRejectedRequestError,
} from 'viem'
import { describe, expect, it } from 'vitest'
import { txErrorKey } from './txErrors.ts'

/** The error viem throws when a simulated call reverts with a custom error (userRefund takes no args). */
function reverted(abi: Abi, errorName: string, args: readonly unknown[] = []) {
  const data = encodeErrorResult({ abi, errorName, args })
  const cause = new ContractFunctionRevertedError({ abi, data, functionName: 'userRefund' })
  return new ContractFunctionExecutionError(cause, { abi, functionName: 'userRefund' })
}

const someone = '0x1111111111111111111111111111111111111111'

describe('txErrorKey', () => {
  it('names the store contract errors a user can run into', () => {
    const abi = storeDepositContractAbi
    expect(txErrorKey(reverted(abi, 'InsufficientBonusPool', [20n, 0n]))).toBe('txBonusSoldOut')
    expect(txErrorKey(reverted(abi, 'MemberLevelTooLow', [1, 0]))).toBe('txMembersOnly')
    expect(txErrorKey(reverted(abi, 'StoreStillActive'))).toBe('txStoreStillActive')
    expect(txErrorKey(reverted(abi, 'StoreNotActive'))).toBe('txStoreNotActive')
  })

  it('names token errors that bubble up through the store', () => {
    expect(txErrorKey(reverted(mockUsdcAbi, 'ERC20InsufficientBalance', [someone, 0n, 1n]))).toBe(
      'txInsufficientBalance',
    )
  })

  it('falls back to wallet errors, then to a generic message', () => {
    expect(txErrorKey(new UserRejectedRequestError(new Error('no')))).toBe('walletRejected')
    expect(txErrorKey(new Error('boom'))).toBe('walletError')
  })
})
