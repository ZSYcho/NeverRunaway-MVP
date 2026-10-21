import { describe, expect, it } from 'vitest'
import { formatAmount, parseAmount } from './amount.ts'

describe('formatAmount', () => {
  it('formats base units exactly, grouping thousands', () => {
    expect(formatAmount(1_234_500_000n, 6)).toBe('1,234.5')
    expect(formatAmount(55_000_000n, 6)).toBe('55')
    expect(formatAmount(1n, 6)).toBe('0.000001')
    expect(formatAmount(0n, 6)).toBe('0')
  })
})

describe('parseAmount', () => {
  it('parses decimal input into base units without floating point', () => {
    // 8.2 * 1e6 is 8199999.999999999 in floating point, the bug in the legacy page.
    expect(parseAmount('8.2', 6)).toBe(8_200_000n)
    expect(parseAmount('100', 6)).toBe(100_000_000n)
    expect(parseAmount(' 0.5 ', 6)).toBe(500_000n)
  })

  it('rejects more fraction digits than the token has instead of rounding', () => {
    expect(parseAmount('1.0000001', 6)).toBeUndefined()
  })

  it('rejects input that is not a plain non-negative decimal', () => {
    for (const input of ['', '.', '-1', '1e6', '1,000', 'abc', '0x10']) {
      expect(parseAmount(input, 6), input).toBeUndefined()
    }
  })
})
