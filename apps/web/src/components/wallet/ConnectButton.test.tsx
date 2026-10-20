// @vitest-environment happy-dom
import { anvil } from '@neverrunaway/shared'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { renderWithWagmi } from '../../test/renderWithWagmi.tsx'
import { ConnectButton } from './ConnectButton.tsx'

const account = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
const iphoneUserAgent =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'

/** A minimal EIP-1193 provider that approves every request. */
function fakeProvider(flags: Record<string, boolean> = {}) {
  return {
    ...flags,
    async request({ method }: { method: string }) {
      if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [account]
      if (method === 'eth_chainId') return `0x${anvil.id.toString(16)}`
      if (method === 'wallet_requestPermissions') return [{ parentCapability: 'eth_accounts' }]
      return null
    },
    on() {},
    removeListener() {},
  }
}

/** Installs a wallet that announces itself the way EIP-6963 specifies. */
function installAnnouncingWallet(info: { name: string; rdns: string }) {
  const provider = fakeProvider()
  const detail = Object.freeze({ info: { ...info, uuid: crypto.randomUUID(), icon: '' }, provider })
  const announce = () =>
    window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail }))
  // Dapps ask with eip6963:requestProvider; wallets answer, and also announce once on load.
  window.addEventListener('eip6963:requestProvider', announce)
  announce()
}

const desktopUserAgent = navigator.userAgent

afterEach(() => {
  cleanup()
  localStorage.clear()
  Object.defineProperty(navigator, 'userAgent', { value: desktopUserAgent, configurable: true })
  delete (window as { ethereum?: unknown }).ethereum
})

describe('ConnectButton', () => {
  it('lists a wallet announced through EIP-6963, connects, then disconnects', async () => {
    installAnnouncingWallet({ name: 'Test Wallet', rdns: 'com.example.testwallet' })
    const config = createConfig({ chains: [anvil], transports: { [anvil.id]: http() } })
    const user = userEvent.setup()
    renderWithWagmi(<ConnectButton />, config)

    await user.click(screen.getByRole('button', { name: 'Connect wallet' }))
    expect(screen.getByText('Installed wallets')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /Test Wallet/ }))
    await user.click(await screen.findByRole('button', { name: /0xf39F…2266/ }))
    await user.click(screen.getByRole('button', { name: 'Disconnect' }))
    expect(await screen.findByRole('button', { name: 'Connect wallet' })).toBeTruthy()
  })

  it("connects in one tap inside a wallet app's browser, without the picker", async () => {
    Object.defineProperty(navigator, 'userAgent', { value: iphoneUserAgent, configurable: true })
    ;(window as { ethereum?: unknown }).ethereum = fakeProvider({ isOkxWallet: true })
    const config = createConfig({
      chains: [anvil],
      connectors: [injected()],
      transports: { [anvil.id]: http() },
      multiInjectedProviderDiscovery: false,
    })
    const user = userEvent.setup()
    renderWithWagmi(<ConnectButton />, config)

    await user.click(screen.getByRole('button', { name: 'Connect wallet' }))
    expect(await screen.findByRole('button', { name: /0xf39F…2266/ })).toBeTruthy()
    expect(screen.queryByText('Installed wallets')).toBeNull()
  })
})
