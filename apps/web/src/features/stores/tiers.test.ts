import { describe, expect, it } from 'vitest'
import { describeRefund, describeTiers, type Tier } from './tiers.ts'

const USDC = 1_000_000n
const now = 1_800_000_000n

function tier(overrides: Partial<Tier> = {}): Tier {
  return {
    depositAmount: 100n * USDC,
    creditAmount: 120n * USDC,
    validUntil: 0n,
    requiredLevel: 0,
    grantsLevel: 0,
    active: true,
    ...overrides,
  }
}

const open = { now, memberLevel: 0, bonusPool: 1_000n * USDC, storeActive: true }

describe('describeTiers', () => {
  it('keeps tier ids and computes the bonus', () => {
    const [view] = describeTiers([tier()], open)
    expect(view).toMatchObject({ id: 0n, bonus: 20n * USDC, status: 'available' })
  })

  it('hides disabled and expired tiers, which can no longer be bought', () => {
    const views = describeTiers(
      [tier({ active: false }), tier({ validUntil: now - 1n }), tier({ validUntil: now + 1n })],
      open,
    )
    expect(views.map((view) => view.id)).toEqual([2n])
  })

  it('checks in the same order as the contract: store, membership, then bonus pool', () => {
    const membersOnlyAndSoldOut = tier({ requiredLevel: 1, creditAmount: 200n * USDC })
    const poor = { ...open, bonusPool: 0n }
    expect(describeTiers([membersOnlyAndSoldOut], { ...poor, storeActive: false })[0]?.status).toBe(
      'storeInactive',
    )
    expect(describeTiers([membersOnlyAndSoldOut], poor)[0]?.status).toBe('membersOnly')
    expect(describeTiers([membersOnlyAndSoldOut], { ...poor, memberLevel: 1 })[0]?.status).toBe(
      'bonusSoldOut',
    )
  })

  it('needs no bonus pool for a tier without bonus', () => {
    const plain = tier({ creditAmount: 100n * USDC })
    expect(describeTiers([plain], { ...open, bonusPool: 0n })[0]?.status).toBe('available')
  })
})

describe('describeRefund', () => {
  it('locks refunds while the store is open', () => {
    expect(describeRefund({ storeActive: true, principal: 5n, bonus: 1n }).state).toBe('locked')
  })

  it('returns the principal once the store is closed or expired', () => {
    expect(describeRefund({ storeActive: false, principal: 5n, bonus: 1n })).toEqual({
      state: 'available',
      principal: 5n,
      bonus: 1n,
    })
  })

  it('has nothing to return without principal', () => {
    expect(describeRefund({ storeActive: false, principal: 0n, bonus: 3n }).state).toBe('none')
    expect(describeRefund({ storeActive: true, principal: 0n, bonus: 0n }).state).toBe('none')
  })
})
