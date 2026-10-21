import type { MessageKey } from '../../i18n/messages.ts'
import { parseAmount } from '../../lib/amount.ts'

type Errors<Field extends string> = Partial<Record<Field, MessageKey>>

export type Parsed<Value, FormErrors> =
  { ok: true; value: Value } | { ok: false; errors: FormErrors }

const UINT8_MAX = 255
// The contract takes any term; ten years is a guard against a typo such as an extra zero.
const MAX_TERM_DAYS = 3650

/** What the customer pays and the credit they get, as the contract requires: 0 < deposit <= credit. */
function parseDepositAndCredit(deposit: string, credit: string, decimals: number) {
  const errors: Errors<'deposit' | 'credit'> = {}
  const depositAmount = parseAmount(deposit, decimals)
  const creditAmount = parseAmount(credit, decimals)
  if (!depositAmount) errors.deposit = 'formAmountInvalid'
  if (creditAmount === undefined) errors.credit = 'formAmountInvalid'
  // Credit below the deposit would let the store keep money the customer never gets to spend.
  else if (depositAmount && creditAmount < depositAmount) errors.credit = 'formCreditBelowDeposit'
  return { depositAmount, creditAmount, errors }
}

/** '' means no limit. Otherwise a whole number from 0 to 255, the contract's uint8. */
function parseLevel(input: string): number | undefined {
  const text = input.trim()
  if (text === '') return 0
  if (!/^\d+$/.test(text)) return undefined
  const level = Number(text)
  return level <= UINT8_MAX ? level : undefined
}

/** '' means no deadline. A date runs to the last second of that day in the merchant's time zone. */
function parseValidUntil(input: string, now: bigint): { value: bigint } | { error: MessageKey } {
  const text = input.trim()
  if (text === '') return { value: 0n }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (!match) return { error: 'formDateInvalid' }
  const [year, month, day] = match.slice(1).map(Number) as [number, number, number]
  const end = new Date(year, month - 1, day, 23, 59, 59)
  // Date rolls 2026-02-30 over into March; that is a typo, not a deadline.
  if (end.getFullYear() !== year || end.getMonth() !== month - 1 || end.getDate() !== day) {
    return { error: 'formDateInvalid' }
  }
  const seconds = BigInt(Math.floor(end.getTime() / 1000))
  return seconds < now ? { error: 'formDateInPast' } : { value: seconds }
}

export type TierInput = {
  deposit: string
  credit: string
  validUntil: string
  requiredLevel: string
  grantsLevel: string
}

export type NewTier = {
  depositAmount: bigint
  creditAmount: bigint
  validUntil: bigint
  requiredLevel: number
  grantsLevel: number
}

/** The add-tier form, checked the way addTier will check it. */
export function parseTierInput(
  input: TierInput,
  { decimals, now }: { decimals: number; now: bigint },
): Parsed<NewTier, Errors<keyof TierInput>> {
  const amounts = parseDepositAndCredit(input.deposit, input.credit, decimals)
  const errors: Errors<keyof TierInput> = { ...amounts.errors }
  const validUntil = parseValidUntil(input.validUntil, now)
  if ('error' in validUntil) errors.validUntil = validUntil.error
  const requiredLevel = parseLevel(input.requiredLevel)
  if (requiredLevel === undefined) errors.requiredLevel = 'formLevelInvalid'
  const grantsLevel = parseLevel(input.grantsLevel)
  if (grantsLevel === undefined) errors.grantsLevel = 'formLevelInvalid'

  const { depositAmount, creditAmount } = amounts
  // No recorded error means every field parsed; the other checks only narrow the types.
  if (
    Object.keys(errors).length > 0 ||
    !depositAmount ||
    creditAmount === undefined ||
    !('value' in validUntil) ||
    requiredLevel === undefined ||
    grantsLevel === undefined
  ) {
    return { ok: false, errors }
  }
  return {
    ok: true,
    value: {
      depositAmount,
      creditAmount,
      validUntil: validUntil.value,
      requiredLevel,
      grantsLevel,
    },
  }
}

export type StoreInput = {
  expireDays: string
  tiers: ReadonlyArray<{ deposit: string; credit: string }>
}

export type NewStore = { expireDays: bigint; depositAmounts: bigint[]; creditAmounts: bigint[] }

export type StoreErrors = {
  expireDays?: MessageKey
  tiers?: MessageKey
  rows: Array<Errors<'deposit' | 'credit'>>
}

/** The open-a-store form: a term and the initial tiers passed to createStoreContract. */
export function parseStoreInput(
  input: StoreInput,
  { decimals }: { decimals: number },
): Parsed<NewStore, StoreErrors> {
  const errors: StoreErrors = { rows: [] }
  const daysText = input.expireDays.trim()
  const days = /^\d+$/.test(daysText) ? Number(daysText) : Number.NaN
  if (!(days >= 1 && days <= MAX_TERM_DAYS)) errors.expireDays = 'formExpireDaysInvalid'
  if (input.tiers.length === 0) errors.tiers = 'formNeedOneTier'

  const depositAmounts: bigint[] = []
  const creditAmounts: bigint[] = []
  for (const row of input.tiers) {
    const amounts = parseDepositAndCredit(row.deposit, row.credit, decimals)
    errors.rows.push(amounts.errors)
    if (amounts.depositAmount && amounts.creditAmount !== undefined) {
      depositAmounts.push(amounts.depositAmount)
      creditAmounts.push(amounts.creditAmount)
    }
  }

  const invalid =
    errors.expireDays !== undefined ||
    errors.tiers !== undefined ||
    errors.rows.some((row) => Object.keys(row).length > 0)
  if (invalid) return { ok: false, errors }
  return { ok: true, value: { expireDays: BigInt(days), depositAmounts, creditAmounts } }
}
