import type { Address } from 'viem'

/** 0x1234…abcd */
export function shortAddress(address: Address): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}
