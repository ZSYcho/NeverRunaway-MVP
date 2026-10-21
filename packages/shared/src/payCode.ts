import {
  type Address,
  getAddress,
  type Hex,
  hexToNumber,
  isAddress,
  maxUint256,
  type TypedDataDomain,
} from 'viem'
import { z } from 'zod'

/**
 * A customer's signed permission for one store to charge their credit once: the EIP-712 message
 * StoreDepositContract.userConsume verifies, plus where to send it. Codes travel in the fragment of
 * an https link to the merchant's cashier page (docs/pay-codes.md).
 */
export type PayCode = {
  chainId: number
  /** The store contract, which is also the EIP-712 verifying contract. */
  store: Address
  /** The customer who signed. */
  user: Address
  /** In base units of the store's token. */
  amount: bigint
  /** The customer's nonce at this store when they signed. Each nonce can be charged once. */
  nonce: bigint
  /** Unix seconds. The contract refuses the code after this. */
  deadline: bigint
  signature: Hex
}

/** The struct userConsume verifies. Field names, types and order must match CONSUME_TYPEHASH. */
export const consumeTypes = {
  Consume: [
    { name: 'user', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const

const PAY_CODE_VERSION = '1'

/** The link fragment for a code: readable key=value pairs, the long signature last. */
export function encodePayCode(code: PayCode): string {
  const params = [
    ['v', PAY_CODE_VERSION],
    ['chain', String(code.chainId)],
    ['store', code.store],
    ['user', code.user],
    ['amount', code.amount.toString()],
    ['nonce', code.nonce.toString()],
    ['deadline', code.deadline.toString()],
    ['sig', code.signature],
  ]
  // Every value is decimal digits or hex, which a URL carries without escaping.
  return params.map(([key, value]) => `${key}=${value}`).join('&')
}

const address = z
  .string()
  .refine((value) => isAddress(value, { strict: false }))
  .transform((value) => getAddress(value))

const uint256 = z
  .string()
  .regex(/^\d{1,78}$/)
  .transform((value) => BigInt(value))
  .refine((value) => value <= maxUint256)

// Unknown parameters are dropped, so a later version can add optional ones.
const payCodeParams = z.object({
  v: z.literal(PAY_CODE_VERSION),
  chain: z
    .string()
    .regex(/^[1-9]\d{0,15}$/)
    .transform(Number)
    .refine(Number.isSafeInteger),
  store: address,
  user: address,
  amount: uint256.refine((value) => value > 0n),
  nonce: uint256,
  deadline: uint256,
  // Any length: an ERC-1271 smart account's signature is not limited to 65 bytes.
  sig: z
    .string()
    .regex(/^0x(?:[0-9a-fA-F]{2})+$/)
    .transform((value) => value as Hex),
})

/**
 * Reads a code from a cashier link, or from the link's fragment alone. Anything malformed gives
 * undefined: whether the signature is any good is for the contract to say.
 */
export function decodePayCode(input: string): PayCode | undefined {
  const text = input.trim()
  // A code never needs escaping, so '%' means a deep link or a chat app encoded the link on the way.
  return readFragment(text) ?? (text.includes('%') ? readFragment(decodeOnce(text)) : undefined)
}

function readFragment(text: string): PayCode | undefined {
  // A whole link or just its fragment: either way the code is what follows the '#'.
  const fragment = text.slice(text.indexOf('#') + 1)
  const params = fragment.split('&').map((pair) => {
    const separator = pair.indexOf('=')
    return separator < 0 ? [pair, ''] : [pair.slice(0, separator), pair.slice(separator + 1)]
  })
  const parsed = payCodeParams.safeParse(Object.fromEntries(params))
  if (!parsed.success) return undefined
  const { chain, store, user, amount, nonce, deadline, sig } = parsed.data
  return { chainId: chain, store, user, amount, nonce, deadline, signature: sig }
}

function decodeOnce(text: string): string {
  try {
    return decodeURIComponent(text)
  } catch {
    // A malformed escape: leave the text as it is, which then fails to parse.
    return text
  }
}

/** eip712Domain() as viem decodes it (ERC-5267). */
export type Erc5267Domain = readonly [
  fields: Hex,
  name: string,
  version: string,
  chainId: bigint,
  verifyingContract: Address,
  salt: Hex,
  extensions: readonly bigint[],
]

/**
 * The EIP-712 domain a contract reports through ERC-5267, with only the fields its bitmap marks as
 * used. viem builds the domain type from whichever fields are present, so the zero salt that
 * OpenZeppelin's EIP712 returns but doesn't use (fields 0x0f) would change the domain separator.
 */
export function domainFromErc5267([
  fields,
  name,
  version,
  chainId,
  verifyingContract,
  salt,
  extensions,
]: Erc5267Domain): TypedDataDomain {
  // ERC-5267: extensions add rules to the domain that a signer must know to sign correctly.
  if (extensions.length > 0) throw new Error('EIP-712 domain extensions are not supported')
  const used = hexToNumber(fields)
  return {
    ...(used & 0x01 ? { name } : {}),
    ...(used & 0x02 ? { version } : {}),
    // A number: wallets compare it with the chain they are on.
    ...(used & 0x04 ? { chainId: Number(chainId) } : {}),
    ...(used & 0x08 ? { verifyingContract } : {}),
    ...(used & 0x10 ? { salt } : {}),
  }
}
