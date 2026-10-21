/** A deposit rule as returned by StoreDepositContract.getTiers(). */
export type Tier = {
  depositAmount: bigint
  creditAmount: bigint
  validUntil: bigint
  requiredLevel: number
  grantsLevel: number
  active: boolean
}

/** Whether a tier can be bought now, and if not, the first check in userDeposit that would fail. */
export type TierStatus = 'available' | 'storeInactive' | 'membersOnly' | 'bonusSoldOut'

export type TierContext = {
  now: bigint
  memberLevel: number
  bonusPool: bigint
  storeActive: boolean
}

/** userDeposit's checks, in its order. Disabled and expired tiers can't be bought by anyone. */
export function tierStatus(tier: Tier, context: TierContext): TierStatus | 'disabled' | 'expired' {
  if (!tier.active) return 'disabled'
  if (tier.validUntil !== 0n && context.now > tier.validUntil) return 'expired'
  if (!context.storeActive) return 'storeInactive'
  if (context.memberLevel < tier.requiredLevel) return 'membersOnly'
  if (context.bonusPool < tier.creditAmount - tier.depositAmount) return 'bonusSoldOut'
  return 'available'
}

export type TierView = Tier & { id: bigint; bonus: bigint; status: TierStatus }

/** The tiers worth listing, with why each one can or can't be bought. */
export function describeTiers(tiers: readonly Tier[], context: TierContext): TierView[] {
  return tiers.flatMap((tier, index) => {
    const status = tierStatus(tier, context)
    if (status === 'disabled' || status === 'expired') return []
    return [{ ...tier, id: BigInt(index), bonus: tier.creditAmount - tier.depositAmount, status }]
  })
}

export type RefundView =
  { state: 'none' } | { state: 'locked' | 'available'; principal: bigint; bonus: bigint }

/**
 * userRefund returns the remaining principal once the store is closed or expired. Unspent bonus
 * goes back to the store's bonus pool: it was a discount, not the user's money.
 */
export function describeRefund({
  storeActive,
  principal,
  bonus,
}: {
  storeActive: boolean
  principal: bigint
  bonus: bigint
}): RefundView {
  if (principal === 0n) return { state: 'none' }
  return { state: storeActive ? 'locked' : 'available', principal, bonus }
}
