import type { Tier } from '../stores/tiers.ts'

export type PromoCapacity = { tierId: bigint; bonus: bigint; remaining: bigint }

/**
 * How many more deposits of each bonus tier the pool can still cover. Every bonus is funded up
 * front, so a tier whose bonus exceeds the pool is sold out until the pool is topped up.
 */
export function promoCapacity(
  bonusPool: bigint,
  tiers: readonly Tier[],
  now: bigint,
): PromoCapacity[] {
  return tiers.flatMap((tier, index) => {
    const bonus = tier.creditAmount - tier.depositAmount
    const buyable = tier.active && (tier.validUntil === 0n || now <= tier.validUntil)
    if (!buyable || bonus === 0n) return []
    return [{ tierId: BigInt(index), bonus, remaining: bonusPool / bonus }]
  })
}

/** Extra funding the pool needs to cover `deposits` more deposits of a tier with this bonus. */
export function fundingShortfall(bonusPool: bigint, bonus: bigint, deposits: bigint): bigint {
  const needed = bonus * deposits
  return needed > bonusPool ? needed - bonusPool : 0n
}
