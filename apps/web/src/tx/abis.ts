import { mockUsdcAbi, storeDepositContractAbi } from '@neverrunaway/shared'

/**
 * The store's ABI plus the token's errors. SafeERC20 bubbles up the token's revert data, so a
 * failing transfer inside userDeposit can only be decoded with the ERC-20 errors in the same ABI.
 */
export const storeAbi = [
  ...storeDepositContractAbi,
  ...mockUsdcAbi.filter((item) => item.type === 'error'),
] as const
