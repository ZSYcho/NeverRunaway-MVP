import { storeDepositContractAbi, storeDepositFactoryAbi } from '@neverrunaway/shared'
import { type Address, erc20Abi, isAddressEqual, zeroAddress } from 'viem'
import { useConnection, useReadContract, useReadContracts } from 'wagmi'
import { deployment, targetChain } from '../../chain.ts'

/**
 * Everything the store page shows, read straight from the chain. The address comes from the URL,
 * and anyone can deploy a look-alike contract and share a link to it, so an address only counts
 * as a store (and gets read at all) when this deployment's factory created it.
 */
export function useStore(store: Address) {
  const { address: account } = useConnection()
  const chainId = targetChain.id
  const usdc = deployment?.usdc ?? zeroAddress

  const factoryStores = useReadContract({
    chainId,
    address: deployment?.factory,
    abi: storeDepositFactoryAbi,
    functionName: 'getAllStoreContracts',
    query: { enabled: deployment !== undefined },
  })
  const isFactoryStore = factoryStores.data?.some((candidate) => isAddressEqual(candidate, store))

  const contract = { chainId, address: store, abi: storeDepositContractAbi } as const
  const storeReads = useReadContracts({
    allowFailure: false,
    contracts: [
      { ...contract, functionName: 'merchant' },
      { ...contract, functionName: 'expireTime' },
      { ...contract, functionName: 'closed' },
      { ...contract, functionName: 'isActive' },
      { ...contract, functionName: 'getTiers' },
      { ...contract, functionName: 'bonusPool' },
      { ...contract, functionName: 'totalLocked' },
      { ...contract, functionName: 'merchantWithdrawable' },
      { chainId, address: usdc, abi: erc20Abi, functionName: 'balanceOf', args: [store] },
    ],
    query: { enabled: isFactoryStore === true },
  })

  const holder = account ?? zeroAddress
  const userReads = useReadContracts({
    allowFailure: false,
    contracts: [
      { ...contract, functionName: 'userPrincipal', args: [holder] },
      { ...contract, functionName: 'userBonus', args: [holder] },
      { ...contract, functionName: 'memberLevel', args: [holder] },
      { chainId, address: usdc, abi: erc20Abi, functionName: 'balanceOf', args: [holder] },
    ],
    query: { enabled: isFactoryStore === true && account !== undefined },
  })

  const state = storeReads.data
    ? (([
        merchant,
        expireTime,
        closed,
        isActive,
        tiers,
        bonusPool,
        totalLocked,
        merchantWithdrawable,
        heldUsdc,
      ]) => ({
        merchant,
        expireTime,
        closed,
        isActive,
        tiers,
        bonusPool,
        totalLocked,
        merchantWithdrawable,
        heldUsdc,
      }))(storeReads.data)
    : undefined

  const user =
    account && userReads.data
      ? (([principal, bonus, memberLevel, walletUsdc]) => ({
          account,
          principal,
          bonus,
          memberLevel,
          walletUsdc,
        }))(userReads.data)
      : undefined

  return {
    /** Undefined until the factory's store list has loaded. */
    isFactoryStore,
    isError: factoryStores.isError || storeReads.isError,
    state,
    user,
  }
}

export type StoreState = NonNullable<ReturnType<typeof useStore>['state']>
export type UserState = NonNullable<ReturnType<typeof useStore>['user']>
