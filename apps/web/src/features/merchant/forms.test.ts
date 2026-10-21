import { describe, expect, it } from 'vitest'
import { parseStoreInput, parseTierInput } from './forms.ts'

const USDC = 1_000_000n
const context = { decimals: 6, now: BigInt(Math.floor(new Date(2026, 9, 21).getTime() / 1000)) }
const tier = { deposit: '100', credit: '200', validUntil: '', requiredLevel: '', grantsLevel: '' }

describe('parseTierInput', () => {
  it('parses a valid tier, with empty optional fields meaning none', () => {
    expect(parseTierInput({ ...tier, grantsLevel: '1' }, context)).toEqual({
      ok: true,
      value: {
        depositAmount: 100n * USDC,
        creditAmount: 200n * USDC,
        validUntil: 0n,
        requiredLevel: 0,
        grantsLevel: 1,
      },
    })
  })

  it('rejects credit below the deposit, which would let the store keep unspent money', () => {
    expect(parseTierInput({ ...tier, credit: '90' }, context)).toEqual({
      ok: false,
      errors: { credit: 'formCreditBelowDeposit' },
    })
  })

  it('rejects a missing or malformed deposit', () => {
    for (const deposit of ['', '0', '-1', '1.0000001']) {
      expect(parseTierInput({ ...tier, deposit }, context), deposit).toMatchObject({
        ok: false,
        errors: { deposit: 'formAmountInvalid' },
      })
    }
  })

  it('ends a promotion at the last second of its local calendar day', () => {
    const result = parseTierInput({ ...tier, validUntil: '2026-11-11' }, context)
    const endOfDay = BigInt(Math.floor(new Date(2026, 10, 11, 23, 59, 59).getTime() / 1000))
    expect(result).toMatchObject({ ok: true, value: { validUntil: endOfDay } })
  })

  it('rejects dates that are invalid or already over', () => {
    expect(parseTierInput({ ...tier, validUntil: '2026-02-30' }, context)).toMatchObject({
      errors: { validUntil: 'formDateInvalid' },
    })
    expect(parseTierInput({ ...tier, validUntil: '2026-10-20' }, context)).toMatchObject({
      errors: { validUntil: 'formDateInPast' },
    })
  })

  it('keeps member levels within uint8', () => {
    for (const level of ['256', '-1', '1.5', 'x']) {
      expect(parseTierInput({ ...tier, requiredLevel: level }, context), level).toMatchObject({
        errors: { requiredLevel: 'formLevelInvalid' },
      })
    }
  })
})

describe('parseStoreInput', () => {
  const store = { expireDays: '365', tiers: [{ deposit: '50', credit: '55' }] }

  it('parses the term and the initial tiers', () => {
    expect(parseStoreInput(store, context)).toEqual({
      ok: true,
      value: { expireDays: 365n, depositAmounts: [50n * USDC], creditAmounts: [55n * USDC] },
    })
  })

  it('needs a term of 1 to 3650 days and at least one tier', () => {
    expect(parseStoreInput({ ...store, expireDays: '0' }, context)).toMatchObject({
      errors: { expireDays: 'formExpireDaysInvalid' },
    })
    expect(parseStoreInput({ ...store, tiers: [] }, context)).toMatchObject({
      errors: { tiers: 'formNeedOneTier' },
    })
  })

  it('reports errors per tier row', () => {
    const result = parseStoreInput(
      {
        ...store,
        tiers: [
          { deposit: '50', credit: '55' },
          { deposit: '10', credit: '5' },
        ],
      },
      context,
    )
    expect(result).toMatchObject({
      ok: false,
      errors: { rows: [{}, { credit: 'formCreditBelowDeposit' }] },
    })
  })
})
