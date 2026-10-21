import { formatUnits } from 'viem'

/** Formats base units exactly, grouping thousands: (1_234_500_000n, 6) gives "1,234.5". */
export function formatAmount(value: bigint, decimals: number): string {
  const [whole = '0', fraction] = formatUnits(value, decimals).split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return fraction ? `${grouped}.${fraction}` : grouped
}

/**
 * Parses a plain decimal string into base units, with integer math only. Anything else returns
 * undefined, including more fraction digits than the token has: money input is rejected, never
 * silently rounded.
 */
export function parseAmount(input: string, decimals: number): bigint | undefined {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(input.trim())
  if (!match) return undefined
  const [, whole = '', fraction = ''] = match
  if (fraction.length > decimals) return undefined
  return BigInt(whole + fraction.padEnd(decimals, '0'))
}
