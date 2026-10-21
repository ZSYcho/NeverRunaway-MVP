import {
  consumeTypes,
  domainFromErc5267,
  type PayCode,
  storeDepositContractAbi,
} from '@neverrunaway/shared'
import { concat, domainSeparator, hexToNumber, slice, toHex } from 'viem'
import { describe, expect, it } from 'vitest'
import { connect, signTypedData } from 'wagmi/actions'
import { PAY_CODE_TTL } from '../features/pay/codes.ts'
import { nowInSeconds } from '../lib/time.ts'
import { txErrorKey } from '../lib/txErrors.ts'
import {
  accounts,
  connectAs,
  createTestConfig,
  isolateChainPerTest,
  recordProgress,
  stores,
  testChain,
  testClient,
} from '../test/anvil.ts'
import {
  canonicalSignature,
  chargePayCode,
  checkPayCode,
  findCharge,
  signPayCode,
} from './payCode.ts'

const USDC = 1_000_000n
const chainId = testChain.id
const cafe = { chainId, address: stores.cafe, abi: storeDepositContractAbi } as const

isolateChainPerTest()

const credit = (account: `0x${string}`) =>
  testClient.readContract({ ...cafe, functionName: 'getUserCredit', args: [account] })

/** Alice signs a code at the cafe, where DevSeed gave her 100 principal and 100 bonus. */
async function aliceSigns(amount: bigint) {
  const config = await connectAs(accounts.alice)
  return signPayCode(
    config,
    { chainId, account: accounts.alice, store: stores.cafe, amount },
    () => {},
  )
}

const asCafeMerchant = () => connectAs(accounts.cafeMerchant)
const charge = async (code: PayCode) =>
  chargePayCode(await asCafeMerchant(), { account: accounts.cafeMerchant, code }, () => {})

describe('signPayCode', () => {
  it("signs for the store's ERC-5267 domain, the one its signatures are checked against", async () => {
    const domain = domainFromErc5267(
      await testClient.readContract({ ...cafe, functionName: 'eip712Domain' }),
    )
    expect(domainSeparator({ domain })).toBe(
      await testClient.readContract({ ...cafe, functionName: 'DOMAIN_SEPARATOR' }),
    )
  })

  it('needs one signature, no transaction, and makes a code valid for five minutes', async () => {
    const config = await connectAs(accounts.alice)
    const { events, onProgress } = recordProgress()
    const { code } = await signPayCode(
      config,
      { chainId, account: accounts.alice, store: stores.cafe, amount: 30n * USDC },
      onProgress,
    )

    expect(events).toEqual(['sign:confirm', 'sign:done'])
    expect(code).toMatchObject({ store: stores.cafe, user: accounts.alice, amount: 30n * USDC })
    expect(code.nonce).toBe(0n)
    const validFor = code.deadline - nowInSeconds()
    expect(validFor > PAY_CODE_TTL - 5n && validFor <= PAY_CODE_TTL).toBe(true)
    // Signing moves no funds.
    expect(await credit(accounts.alice)).toBe(200n * USDC)
  })

  it('stops before the wallet opens when the credit does not cover the amount', async () => {
    const config = await connectAs(accounts.carol) // no deposit at the cafe
    const { events, onProgress } = recordProgress()
    const error = await signPayCode(
      config,
      { chainId, account: accounts.carol, store: stores.cafe, amount: 1n * USDC },
      onProgress,
    ).catch((caught: unknown) => caught)

    expect(txErrorKey(error)).toBe('txInsufficientCredit')
    expect(events).toEqual([])
  })

  it('reports a declined signature as the customer declining', async () => {
    const config = createTestConfig(accounts.alice, { signTypedDataError: true })
    await connect(config, { connector: config.connectors[0]! })
    const error = await signPayCode(
      config,
      { chainId, account: accounts.alice, store: stores.cafe, amount: 1n * USDC },
      () => {},
    ).catch((caught: unknown) => caught)

    expect(txErrorKey(error)).toBe('walletRejected')
  })
})

describe('canonicalSignature', () => {
  it("fixes up an EOA's signature that came back with v = 0 or 1", async () => {
    const config = await connectAs(accounts.alice)
    const { code } = await aliceSigns(1n * USDC)
    const v = hexToNumber(slice(code.signature, 64))
    const raw = concat([slice(code.signature, 0, 64), toHex(v - 27, { size: 1 })])

    expect(await canonicalSignature(config, chainId, accounts.alice, raw)).toBe(code.signature)
  })
})

describe('charging a pay code', () => {
  it('charges exactly the signed amount, spending principal and bonus pro rata', async () => {
    const { code } = await aliceSigns(30n * USDC)
    const merchant = await asCafeMerchant()
    expect((await checkPayCode(merchant, code, accounts.cafeMerchant)).status).toBe('ready')

    const { events, onProgress } = recordProgress()
    const result = await chargePayCode(
      merchant,
      { account: accounts.cafeMerchant, code },
      onProgress,
    )

    expect(events).toEqual(['charge:confirm', 'charge:pending', 'charge:done'])
    expect(result).toMatchObject({
      amount: 30n * USDC,
      principalPart: 15n * USDC,
      bonusPart: 15n * USDC,
    })
    expect(await credit(accounts.alice)).toBe(170n * USDC)
    expect(await testClient.readContract({ ...cafe, functionName: 'merchantWithdrawable' })).toBe(
      30n * USDC,
    )
  })

  it('charges a code once', async () => {
    const { code } = await aliceSigns(30n * USDC)
    await charge(code)

    const merchant = await asCafeMerchant()
    expect((await checkPayCode(merchant, code, accounts.cafeMerchant)).status).toBe('charged')
    const { events, onProgress } = recordProgress()
    const again = await chargePayCode(
      merchant,
      { account: accounts.cafeMerchant, code },
      onProgress,
    ).catch((caught: unknown) => caught)
    expect(txErrorKey(again)).toBe('codeCharged')
    expect(events).toEqual([])
  })

  it('gives codes made before a charge the same nonce, so only one of them goes through', async () => {
    const { code: first } = await aliceSigns(30n * USDC)
    const { code: second } = await aliceSigns(20n * USDC)
    expect(second.nonce).toBe(first.nonce)

    await charge(second)

    expect((await checkPayCode(await asCafeMerchant(), first, accounts.cafeMerchant)).status).toBe(
      'charged',
    )
    expect(await credit(accounts.alice)).toBe(180n * USDC)
  })

  it('turns down a code whose amount was changed after signing', async () => {
    const { code } = await aliceSigns(1n * USDC)
    const tampered = { ...code, amount: 100n * USDC }

    expect(
      (await checkPayCode(await asCafeMerchant(), tampered, accounts.cafeMerchant)).status,
    ).toBe('invalid')
  })

  it('turns down a code past its deadline', async () => {
    // Signed directly: the app never makes a code that has already expired.
    const config = await connectAs(accounts.alice)
    const domain = domainFromErc5267(
      await testClient.readContract({ ...cafe, functionName: 'eip712Domain' }),
    )
    const message = {
      user: accounts.alice,
      amount: 1n * USDC,
      nonce: 0n,
      deadline: nowInSeconds() - 60n,
    }
    const signature = await signTypedData(config, {
      account: accounts.alice,
      domain,
      types: consumeTypes,
      primaryType: 'Consume',
      message,
    })
    const code: PayCode = { chainId, store: stores.cafe, ...message, signature }

    expect((await checkPayCode(await asCafeMerchant(), code, accounts.cafeMerchant)).status).toBe(
      'expired',
    )
    expect(txErrorKey(await charge(code).catch((caught: unknown) => caught))).toBe('codeExpired')
  })

  it("only lets the store's merchant charge, and stops before the wallet opens", async () => {
    const { code } = await aliceSigns(1n * USDC)
    const config = await connectAs(accounts.carol)
    const { events, onProgress } = recordProgress()
    const error = await chargePayCode(config, { account: accounts.carol, code }, onProgress).catch(
      (caught: unknown) => caught,
    )

    expect(txErrorKey(error)).toBe('txOnlyMerchant')
    expect(events).toEqual([])
  })
})

describe('findCharge', () => {
  it("finds the charge that used a code, for the customer's screen", async () => {
    const signed = await aliceSigns(30n * USDC)
    const config = await connectAs(accounts.alice)
    expect(await findCharge(config, signed.code, signed.fromBlock)).toBeUndefined()

    const result = await charge(signed.code)

    expect(await findCharge(config, signed.code, signed.fromBlock)).toEqual(result)
  })
})
