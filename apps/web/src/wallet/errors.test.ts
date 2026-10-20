import { ResourceUnavailableRpcError, SwitchChainError, UserRejectedRequestError } from 'viem'
import { describe, expect, it } from 'vitest'
import { walletErrorKey } from './errors.ts'

describe('walletErrorKey', () => {
  it('maps a rejected request (EIP-1193 code 4001), however deeply it is wrapped', () => {
    expect(walletErrorKey(new UserRejectedRequestError(new Error('User denied')))).toBe(
      'walletRejected',
    )
    expect(walletErrorKey(new Error('outer', { cause: { code: 4001 } }))).toBe('walletRejected')
  })

  it('maps a request that is already waiting in the wallet (-32002)', () => {
    expect(walletErrorKey(new ResourceUnavailableRpcError(new Error('pending')))).toBe(
      'walletRequestPending',
    )
  })

  it('maps a chain the wallet cannot switch to or add (4902)', () => {
    expect(walletErrorKey(new SwitchChainError(new Error('Unrecognized chain')))).toBe(
      'walletChainUnsupported',
    )
  })

  it('maps a missing provider', () => {
    const error = new Error('Provider not found.')
    error.name = 'ProviderNotFoundError'
    expect(walletErrorKey(error)).toBe('walletNotFound')
  })

  it('falls back to a generic message', () => {
    expect(walletErrorKey(new Error('boom'))).toBe('walletError')
    expect(walletErrorKey('not an error')).toBe('walletError')
  })
})
