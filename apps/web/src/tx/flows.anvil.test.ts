import { storeDepositContractAbi, storeDepositFactoryAbi } from '@neverrunaway/shared'
import { type Address, erc20Abi, parseEther } from 'viem'
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
import { needsApproval } from './approve.ts'
import { deposit } from './deposit.ts'
import { fundOnAnvil, mintTestUsdc } from './faucet.ts'
import { refund } from './refund.ts'

const USDC = 1_000_000n
const chainId = testChain.id

isolateChainPerTest()

const storeRead = (store: Address, functionName: 'userPrincipal' | 'userBonus', account: Address) =>
  testClient.readContract({
    address: store,
    abi: storeDepositContractAbi,
    functionName,
    args: [account],
  })

describe('deposit', () => {
  const cafeTier0 = { chainId, store: stores.cafe, usdc, tierId: 0n, depositAmount: 50n * USDC }

  it('approves exactly the deposit, so no allowance is left behind', async () => {
    const config = await connectAs(accounts.carol)
    const parameters = { ...cafeTier0, account: accounts.carol }
    const before = await usdcBalance(accounts.carol)
    expect(
      await needsApproval(config, {
        chainId,
        account: accounts.carol,
        token: usdc,
        spender: stores.cafe,
        amount: 50n * USDC,
      }),
    ).toBe(true)

    const { events, onProgress } = recordProgress()
    await deposit(config, parameters, onProgress)

    expect(events).toEqual([
      'approve:confirm',
      'approve:pending',
      'approve:done',
      'deposit:confirm',
      'deposit:pending',
      'deposit:done',
    ])
    expect(await usdcBalance(accounts.carol)).toBe(before - 50n * USDC)
    expect(await storeRead(stores.cafe, 'userPrincipal', accounts.carol)).toBe(50n * USDC)
    expect(await storeRead(stores.cafe, 'userBonus', accounts.carol)).toBe(5n * USDC)
    expect(
      await testClient.readContract({
        address: usdc,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [accounts.carol, stores.cafe],
      }),
    ).toBe(0n)
  })

  it('skips the approval when the allowance already covers the deposit', async () => {
    const config = await connectAs(accounts.carol)
    await send(config, {
      chainId,
      address: usdc,
      abi: erc20Abi,
      functionName: 'approve',
      args: [stores.cafe, 50n * USDC],
    })

    const { events, onProgress } = recordProgress()
    await deposit(config, { ...cafeTier0, account: accounts.carol }, onProgress)
    expect(events).toEqual(['deposit:confirm', 'deposit:pending', 'deposit:done'])
  })

  it('never reaches the wallet, not even for the approval, when the bonus is unfunded', async () => {
    // Dave opens a store with a 10 -> 20 tier and never funds its bonus pool.
    const merchant = await connectAs(accounts.dave)
    await send(merchant, {
      chainId,
      address: factory,
      abi: storeDepositFactoryAbi,
      functionName: 'createStoreContract',
      args: [30n, [10n * USDC], [20n * USDC]],
    })
    const [store] = await testClient.readContract({
      address: factory,
      abi: storeDepositFactoryAbi,
      functionName: 'getMerchantContracts',
      args: [accounts.dave],
    })
    if (!store) throw new Error('store was not created')

    const config = await connectAs(accounts.carol)
    const { events, onProgress } = recordProgress()
    const error = await deposit(
      config,
      { chainId, account: accounts.carol, store, usdc, tierId: 0n, depositAmount: 10n * USDC },
      onProgress,
    ).catch((caught: unknown) => caught)

    expect(txErrorKey(error)).toBe('txBonusSoldOut')
    expect(events).toEqual([])
  })
})

describe('refund', () => {
  it('stays locked while the store is open and returns the principal once it closes', async () => {
    // DevSeed gave Alice the cafe's 100 -> 200 promo: 100 principal and 100 bonus.
    const config = await connectAs(accounts.alice)
    const parameters = { chainId, account: accounts.alice, store: stores.cafe }
    const locked = await refund(config, parameters, () => {}).catch((caught: unknown) => caught)
    expect(txErrorKey(locked)).toBe('txStoreStillActive')

    const merchant = await connectAs(accounts.cafeMerchant)
    await send(merchant, {
      chainId,
      address: stores.cafe,
      abi: storeDepositContractAbi,
      functionName: 'closeStore',
    })
    const bonusPool = () =>
      testClient.readContract({
        address: stores.cafe,
        abi: storeDepositContractAbi,
        functionName: 'bonusPool',
      })
    const [usdcBefore, poolBefore] = [await usdcBalance(accounts.alice), await bonusPool()]

    await refund(config, parameters, () => {})

    expect(await usdcBalance(accounts.alice)).toBe(usdcBefore + 100n * USDC)
    expect(await storeRead(stores.cafe, 'userPrincipal', accounts.alice)).toBe(0n)
    expect(await bonusPool()).toBe(poolBefore + 100n * USDC)
  })
})

describe('faucet', () => {
  it('funds a brand-new wallet on anvil without a signature', async () => {
    const wallet = privateKeyToAccount(generatePrivateKey()).address
    await fundOnAnvil({ chain: testChain, account: wallet, usdc, usdcAmount: 1_000n * USDC })

    expect(await testClient.getBalance({ address: wallet })).toBe(parseEther('100'))
    expect(await usdcBalance(wallet)).toBe(1_000n * USDC)
  })

  it('mints test USDC from the connected wallet, as on test networks', async () => {
    const config = await connectAs(accounts.carol)
    const before = await usdcBalance(accounts.carol)
    await mintTestUsdc(
      config,
      { chainId, account: accounts.carol, usdc, amount: 1_000n * USDC },
      () => {},
    )
    expect(await usdcBalance(accounts.carol)).toBe(before + 1_000n * USDC)
  })
})
