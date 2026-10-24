import { decodePayCode, type PayCode } from '@neverrunaway/shared'
import { type Hex, size, slice } from 'viem'
import { describe, expect, it } from 'vitest'
import { cashierLink, chargeBlocker, normalizeV } from './codes.ts'

const USDC = 1_000_000n
const now = 1_800_000_000n

const code: PayCode = {
  chainId: 31337,
  store: '0xCafac3dD18aC6c6e92c921884f9E4176737C052c',
  user: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
  amount: 30n * USDC,
  nonce: 2n,
  deadline: now + 300n,
  signature: `0x${'ab'.repeat(64)}1b`,
}

describe('cashierLink', () => {
  it("is an https link to the merchant's cashier page with the code in the fragment", () => {
    const link = cashierLink(code, 'https://pay.example')
    expect(link.startsWith('https://pay.example/merchant/cashier#v=1&')).toBe(true)
    expect(decodePayCode(link)).toEqual(code)
  })
})

describe('chargeBlocker', () => {
  const ready = { now, nonce: 2n, credit: 200n * USDC, storeActive: true }

  it('has nothing against a fresh code', () => {
    expect(chargeBlocker(code, ready)).toBeUndefined()
  })

  it('sees a used code by its nonce, also once it has expired', () => {
    // The nonce moves on whenever a code with this nonce is charged: this one or a twin of it.
    expect(chargeBlocker(code, { ...ready, nonce: 3n, now: now + 1_000n })).toBe('charged')
  })

  it('refuses a nonce the customer has not reached, which the app never signs', () => {
    expect(chargeBlocker(code, { ...ready, nonce: 1n })).toBe('invalid')
  })

  it('accepts a code up to its deadline second, as the contract does', () => {
    expect(chargeBlocker(code, { ...ready, now: code.deadline })).toBeUndefined()
    expect(chargeBlocker(code, { ...ready, now: code.deadline + 1n })).toBe('expired')
  })

  it('checks the store, then the credit', () => {
    const broke = { ...ready, credit: 29n * USDC }
    expect(chargeBlocker(code, { ...broke, storeActive: false })).toBe('storeInactive')
    expect(chargeBlocker(code, broke)).toBe('insufficientCredit')
    expect(chargeBlocker(code, { ...broke, credit: 30n * USDC })).toBeUndefined()
  })
})

describe('normalizeV', () => {
  const rs = `0x${'12'.repeat(64)}` as const

  it('rewrites v = 0 or 1, which some wallets return, as 27 or 28', () => {
    expect(normalizeV(`${rs}00`)).toBe(`${rs}1b`)
    expect(normalizeV(`${rs}01`)).toBe(`${rs}1c`)
  })

  it('leaves alone signatures that already use 27 or 28, or are not 65 bytes', () => {
    const others: Hex[] = [`${rs}1b`, `${rs}1c`, slice(`${rs}00`, 0, 64), `${rs}0000`]
    for (const signature of others) {
      expect(normalizeV(signature), `${size(signature)} bytes`).toBeUndefined()
    }
  })
})
