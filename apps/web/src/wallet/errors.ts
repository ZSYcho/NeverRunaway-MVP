import type { MessageKey } from '../i18n/messages.ts'

export type WalletErrorKey = Extract<
  MessageKey,
  | 'walletRejected'
  | 'walletRequestPending'
  | 'walletChainUnsupported'
  | 'walletNotFound'
  | 'walletError'
>

// EIP-1193 / EIP-3085 provider error codes.
const codeToKey: Record<number, WalletErrorKey> = {
  4001: 'walletRejected',
  [-32002]: 'walletRequestPending',
  4902: 'walletChainUnsupported',
}

/** Maps a wallet error to a user-facing message. viem and wagmi wrap provider errors in `cause`. */
export function walletErrorKey(error: unknown): WalletErrorKey {
  let current: unknown = error
  for (let depth = 0; current && typeof current === 'object' && depth < 10; depth++) {
    const { code, name, cause } = current as { code?: unknown; name?: unknown; cause?: unknown }
    if (typeof code === 'number' && code in codeToKey) return codeToKey[code]!
    if (name === 'ProviderNotFoundError') return 'walletNotFound'
    current = cause
  }
  return 'walletError'
}
