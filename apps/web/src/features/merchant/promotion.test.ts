import { describe, expect, it } from 'vitest'
import type { Tier } from '../stores/tiers.ts'
import { fundingShortfall, promoCapacity } from './promotion.ts'

const USDC = 1_000_000n
const now = 1_800_000_000n

function tier(deposit: bigint, credit: bigint, overrides: Partial<Tier> = {}): Tier {
  return {
    depositAmount: deposit * USDC,
    creditAmount: credit * USDC,
    validUntil: 0n,
    requiredLevel: 0,
    grantsLevel: 0,
    active: true,
    ...overrides,
  }
}

describe('promoCapacity', () => {
  it('counts how many more deposits of each bonus tier the pool still covers', () => {
    const tiers = [tier(50n, 55n), tier(100n, 200n), tier(30n, 30n)]
    expect(promoCapacity(1_895n * USDC, tiers, now)).toEqual([
      { tierId: 0n, bonus: 5n * USDC, remaining: 379n },
      { tierId: 1n, bonus: 100n * USDC, remaining: 18n },
    ])
  })

  it('leaves out tiers nobody can buy any more', () => {
    const tiers = [tier(10n, 20n, { active: false }), tier(10n, 20n, { validUntil: now - 1n })]
    expect(promoCapacity(1_000n * USDC, tiers, now)).toEqual([])
  })
})

describe('fundingShortfall', () => {
  it('is what the pool still lacks to cover a target number of deposits', () => {
    // "Deposit 100, get 200" for 100 customers needs 10,000 USDC of bonus.
    expect(fundingShortfall(1_895n * USDC, 100n * USDC, 100n)).toBe(8_105n * USDC)
    expect(fundingShortfall(1_895n * USDC, 100n * USDC, 10n)).toBe(0n)
  })
})
