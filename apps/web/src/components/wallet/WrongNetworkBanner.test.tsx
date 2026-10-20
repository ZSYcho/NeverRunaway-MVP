// @vitest-environment happy-dom
import { anvil, xLayerTestnet } from '@neverrunaway/shared'
import { act, cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { createConfig, http } from 'wagmi'
import { connect } from 'wagmi/actions'
import { mock } from 'wagmi/connectors'
import { renderWithWagmi } from '../../test/renderWithWagmi.tsx'
import { WrongNetworkBanner } from './WrongNetworkBanner.tsx'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('WrongNetworkBanner', () => {
  it('asks a wallet on another chain to switch to the target chain', async () => {
    // Tests run as a development build, so the target chain is anvil.
    const config = createConfig({
      chains: [anvil, xLayerTestnet],
      connectors: [mock({ accounts: ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'] })],
      transports: { [anvil.id]: http(), [xLayerTestnet.id]: http() },
      multiInjectedProviderDiscovery: false,
    })
    const user = userEvent.setup()
    renderWithWagmi(<WrongNetworkBanner />, config)
    expect(screen.queryByRole('alert')).toBeNull()

    await act(() =>
      connect(config, { connector: config.connectors[0]!, chainId: xLayerTestnet.id }),
    )
    expect(screen.getByRole('alert').textContent).toContain('#1952')

    await user.click(screen.getByRole('button', { name: 'Switch to Anvil (local)' }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  })
})
