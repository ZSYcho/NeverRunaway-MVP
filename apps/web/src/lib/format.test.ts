import { describe, expect, it } from 'vitest'
import { shortAddress } from './format.ts'

describe('shortAddress', () => {
  it('keeps the 0x prefix, four leading and four trailing hex digits', () => {
    expect(shortAddress('0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512')).toBe('0xe7f1…0512')
  })
})
