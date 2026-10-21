import { mockUsdcAbi, storeDepositContractAbi, storeDepositFactoryAbi } from '@neverrunaway/shared'

/**
 * The store's ABI plus the token's errors. SafeERC20 bubbles up the token's revert data, so a
 * failing transfer inside userDeposit can only be decoded with the ERC-20 errors in the same ABI.
 */
export const storeAbi = [
  ...storeDepositContractAbi,
  ...mockUsdcAbi.filter((item) => item.type === 'error'),
] as const

/**
 * The factory's ABI plus the store's errors. createStoreContract deploys the store in the same
 * call, and a constructor revert such as InvalidTier comes back from the factory unchanged.
 */
export const factoryAbi = [
  ...storeDepositFactoryAbi,
  ...storeDepositContractAbi.filter((item) => item.type === 'error'),
] as const
