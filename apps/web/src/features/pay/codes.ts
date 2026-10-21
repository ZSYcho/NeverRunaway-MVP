import { encodePayCode, type PayCode } from '@neverrunaway/shared'
import { concat, type Hex, hexToNumber, size, slice, toHex } from 'viem'

/**
 * How long a pay code can be charged, in seconds. Enough to reach the counter and confirm in the
 * merchant's wallet, and short because nothing can cancel a code once it is signed.
 */
export const PAY_CODE_TTL = 300n

/** The merchant page a pay code opens. */
export const CASHIER_PATH = '/merchant/cashier'

/**
 * The link a pay code's QR carries. A plain https link: a wallet app's scanner opens it in the
 * wallet's browser, and the fragment never reaches a server, so no log keeps the signature.
 */
export function cashierLink(code: PayCode, origin: string): string {
  return `${origin}${CASHIER_PATH}#${encodePayCode(code)}`
}

export type PayCodeStatus =
  'ready' | 'charged' | 'expired' | 'storeInactive' | 'insufficientCredit' | 'invalid'

/**
 * Why a code can't be charged now, judged from chain state; undefined when nothing stands in the
 * way. Whether the signature is good is the contract's call, made by a dry run of userConsume.
 */
export function chargeBlocker(
  code: PayCode,
  chain: { now: bigint; nonce: bigint; credit: bigint; storeActive: boolean },
): Exclude<PayCodeStatus, 'ready'> | undefined {
  // Each nonce is charged once, in order. A higher one means this code was charged, or another
  // code signed with the same nonce was, which voids this one.
  if (chain.nonce > code.nonce) return 'charged'
  // The app always signs with the customer's current nonce.
  if (chain.nonce < code.nonce) return 'invalid'
  // The contract rejects a code only once block.timestamp is past its deadline.
  if (chain.now > code.deadline) return 'expired'
  if (!chain.storeActive) return 'storeInactive'
  if (chain.credit < code.amount) return 'insufficientCredit'
  return undefined
}

/**
 * A 65-byte signature whose v is 0 or 1, rewritten with v = 27 or 28; undefined for any other.
 * Some wallets, hardware wallets especially, return 0 or 1, and OpenZeppelin's ECDSA only takes
 * 27 or 28.
 */
export function normalizeV(signature: Hex): Hex | undefined {
  if (size(signature) !== 65) return undefined
  const v = hexToNumber(slice(signature, 64))
  if (v !== 0 && v !== 1) return undefined
  return concat([slice(signature, 0, 64), toHex(v + 27, { size: 1 })])
}
