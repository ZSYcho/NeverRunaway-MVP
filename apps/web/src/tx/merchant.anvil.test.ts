import { storeDepositContractAbi, storeDepositFactoryAbi } from '@neverrunaway/shared'
import { type Address, createWalletClient, erc20Abi, http } from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { describe, expect, it } from 'vitest'
import { txErrorKey } from '../lib/txErrors.ts'
import {
  accounts,
  connectAs,
  factory,
  isolateChainPerTest,
  recordProgress,
  send,
  stores,
  testChain,
  testClient,
  usdc,
  usdcBalance,
} from '../test/anvil.ts'
import {
  addTier,
  closeStore,
  createStore,
  disableTier,
  fundBonus,
  withdrawBonus,
  withdrawEarnings,
} from './merchant.ts'

const USDC = 1_000_000n
const chainId = testChain.id

isolateChainPerTest()

const store = (address: Address) => ({ address, abi: storeDepositContractAbi }) as const

/** The error a flow fails with. A flow that succeeds yields its result, which fails the check. */
const failure = (flow: Promise<unknown>) => flow.catch((error: unknown) => error)

describe('createStore', () => {
  it('opens a store owned by the caller, at the address its receipt reports', async () => {
    const config = await connectAs(accounts.dave)
    const { events, onProgress } = recordProgress()
    const created = await createStore(
      config,
      {
        chainId,
        account: accounts.dave,
        factory,
        expireDays: 30n,
        depositAmounts: [10n * USDC, 100n * USDC],
        creditAmounts: [10n * USDC, 150n * USDC],
      },
      onProgress,
    )

    expect(events).toEqual(['create:confirm', 'create:pending', 'create:done'])
    expect(
      await testClient.readContract({
        address: factory,
        abi: storeDepositFactoryAbi,
        functionName: 'getMerchantContracts',
        args: [accounts.dave],
      }),
    ).toEqual([created])
    expect(await testClient.readContract({ ...store(created), functionName: 'merchant' })).toBe(
      accounts.dave,
    )
    const tiers = await testClient.readContract({ ...store(created), functionName: 'getTiers' })
    expect(tiers.map((tier) => [tier.depositAmount, tier.creditAmount])).toEqual([
      [10n * USDC, 10n * USDC],
      [100n * USDC, 150n * USDC],
    ])
  })

  it("decodes the new store's constructor revert, raised through the factory", async () => {
    const config = await connectAs(accounts.dave)
    const { events, onProgress } = recordProgress()
    const error = await failure(
      createStore(
        config,
        {
          chainId,
          account: accounts.dave,
          factory,
          expireDays: 30n,
          depositAmounts: [10n * USDC],
          creditAmounts: [5n * USDC],
        },
        onProgress,
      ),
    )
    expect(txErrorKey(error)).toBe('txInvalidTier')
    expect(events).toEqual([])
  })
})

describe('tiers', () => {
  const promo = {
    depositAmount: 20n * USDC,
    creditAmount: 25n * USDC,
    validUntil: 0n,
    requiredLevel: 0,
    grantsLevel: 0,
  }

  it('appends a tier and disables it for good', async () => {
    const config = await connectAs(accounts.cafeMerchant)
    const parameters = { chainId, account: accounts.cafeMerchant, store: stores.cafe }
    await addTier(config, { ...parameters, tier: promo }, () => {})

    const getTier = (tierId: bigint) =>
      testClient.readContract({ ...store(stores.cafe), functionName: 'getTier', args: [tierId] })
    // DevSeed gave the cafe two tiers, so the new one is tier 2.
    expect(await getTier(2n)).toEqual({ ...promo, active: true })

    await disableTier(config, { ...parameters, tierId: 2n }, () => {})
    expect((await getTier(2n)).active).toBe(false)
    const again = await failure(disableTier(config, { ...parameters, tierId: 2n }, () => {}))
    expect(txErrorKey(again)).toBe('txTierUnavailable')
  })

  it('refuses a promotion that has already ended, and anyone but the merchant', async () => {
    const merchant = await connectAs(accounts.cafeMerchant)
    const past = await failure(
      addTier(
        merchant,
        {
          chainId,
          account: accounts.cafeMerchant,
          store: stores.cafe,
          tier: { ...promo, validUntil: 1n },
        },
        () => {},
      ),
    )
    expect(txErrorKey(past)).toBe('txInvalidValidUntil')

    const stranger = await connectAs(accounts.carol)
    const { events, onProgress } = recordProgress()
    const error = await failure(
      addTier(
        stranger,
        { chainId, account: accounts.carol, store: stores.cafe, tier: promo },
        onProgress,
      ),
    )
    expect(txErrorKey(error)).toBe('txOnlyMerchant')
    expect(events).toEqual([])
  })
})

describe('bonus pool', () => {
  const bonusPool = (address: Address) =>
    testClient.readContract({ ...store(address), functionName: 'bonusPool' })

  it('takes funding from anyone, such as a sponsor, with an exact approval', async () => {
    const sponsor = await connectAs(accounts.carol)
    const [poolBefore, balanceBefore] = [
      await bonusPool(stores.cafe),
      await usdcBalance(accounts.carol),
    ]
    const { events, onProgress } = recordProgress()
    await fundBonus(
      sponsor,
      { chainId, account: accounts.carol, store: stores.cafe, usdc, amount: 300n * USDC },
      onProgress,
    )

    expect(events).toEqual([
      'approve:confirm',
      'approve:pending',
      'approve:done',
      'fund:confirm',
      'fund:pending',
      'fund:done',
    ])
    expect(await bonusPool(stores.cafe)).toBe(poolBefore + 300n * USDC)
    expect(await usdcBalance(accounts.carol)).toBe(balanceBefore - 300n * USDC)
    expect(
      await testClient.readContract({
        address: usdc,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [accounts.carol, stores.cafe],
      }),
    ).toBe(0n)
  })

  it('stops before the approval when the wallet cannot cover the amount', async () => {
    const empty = privateKeyToAccount(generatePrivateKey()).address
    const config = await connectAs(empty)
    const { events, onProgress } = recordProgress()
    const error = await failure(
      fundBonus(
        config,
        { chainId, account: empty, store: stores.cafe, usdc, amount: 1n * USDC },
        onProgress,
      ),
    )
    expect(txErrorKey(error)).toBe('txInsufficientBalance')
    expect(events).toEqual([])
  })

  it('gives the merchant back only bonus no customer was promised', async () => {
    const config = await connectAs(accounts.cafeMerchant)
    const parameters = { chainId, account: accounts.cafeMerchant, store: stores.cafe }
    const [pool, balance] = [await bonusPool(stores.cafe), await usdcBalance(accounts.cafeMerchant)]

    const { events, onProgress } = recordProgress()
    const error = await failure(
      withdrawBonus(config, { ...parameters, amount: pool + 1n }, onProgress),
    )
    expect(txErrorKey(error)).toBe('txBonusPoolTooLow')
    expect(events).toEqual([])

    await withdrawBonus(config, { ...parameters, amount: 100n * USDC }, () => {})
    expect(await bonusPool(stores.cafe)).toBe(pool - 100n * USDC)
    expect(await usdcBalance(accounts.cafeMerchant)).toBe(balance + 100n * USDC)
  })
})

describe('earnings', () => {
  /** Alice authorizes a purchase off chain. Anvil signs typed data for its unlocked accounts. */
  async function aliceSignsPurchase(amount: bigint) {
    const alice = createWalletClient({
      chain: testChain,
      transport: http(testChain.rpcUrls.default.http[0]),
      account: accounts.alice,
    })
    const nonce = await testClient.readContract({
      ...store(stores.cafe),
      functionName: 'nonces',
      args: [accounts.alice],
    })
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600)
    const signature = await alice.signTypedData({
      domain: { name: 'NeverRunaway Store', version: '1', chainId, verifyingContract: stores.cafe },
      types: {
        Consume: [
          { name: 'user', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      },
      primaryType: 'Consume',
      message: { user: accounts.alice, amount, nonce, deadline },
    })
    return { deadline, signature }
  }

  it('pays out what customers spent, then has nothing left to withdraw', async () => {
    const merchant = await connectAs(accounts.cafeMerchant)
    const { deadline, signature } = await aliceSignsPurchase(30n * USDC)
    await send(merchant, {
      chainId,
      ...store(stores.cafe),
      functionName: 'userConsume',
      args: [accounts.alice, 30n * USDC, deadline, signature],
    })

    const parameters = { chainId, account: accounts.cafeMerchant, store: stores.cafe }
    const before = await usdcBalance(accounts.cafeMerchant)
    await withdrawEarnings(merchant, parameters, () => {})
    expect(await usdcBalance(accounts.cafeMerchant)).toBe(before + 30n * USDC)

    const again = await failure(withdrawEarnings(merchant, parameters, () => {}))
    expect(txErrorKey(again)).toBe('txNothingToWithdraw')
  })
})

describe('closeStore', () => {
  it('closes the store for good, and only for its merchant', async () => {
    const stranger = await connectAs(accounts.carol)
    const denied = await failure(
      closeStore(stranger, { chainId, account: accounts.carol, store: stores.cafe }, () => {}),
    )
    expect(txErrorKey(denied)).toBe('txOnlyMerchant')

    const merchant = await connectAs(accounts.cafeMerchant)
    const parameters = { chainId, account: accounts.cafeMerchant, store: stores.cafe }
    const { events, onProgress } = recordProgress()
    await closeStore(merchant, parameters, onProgress)
    expect(events).toEqual(['close:confirm', 'close:pending', 'close:done'])
    expect(await testClient.readContract({ ...store(stores.cafe), functionName: 'isActive' })).toBe(
      false,
    )

    const again = await failure(closeStore(merchant, parameters, () => {}))
    expect(txErrorKey(again)).toBe('txAlreadyClosed')
  })
})
