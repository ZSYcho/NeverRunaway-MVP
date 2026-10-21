import { describe, expect, it } from 'vitest'
import { formatCountdown } from './time.ts'

describe('formatCountdown', () => {
  it('shows minutes and seconds', () => {
    expect(formatCountdown(300)).toBe('5:00')
    expect(formatCountdown(65)).toBe('1:05')
    expect(formatCountdown(9)).toBe('0:09')
  })

  it('stops at zero instead of counting below it', () => {
    expect(formatCountdown(0)).toBe('0:00')
    expect(formatCountdown(-12)).toBe('0:00')
  })
})
