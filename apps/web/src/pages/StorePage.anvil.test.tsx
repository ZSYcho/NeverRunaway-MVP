// @vitest-environment happy-dom
import { act, cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import type { Hex } from 'viem'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { connect } from 'wagmi/actions'
import { accounts, createTestConfig, stores, testClient } from '../test/anvil.ts'
import { renderWithWagmi } from '../test/renderWithWagmi.tsx'
import { StorePage } from './StorePage.tsx'

let snapshot: Hex
beforeEach(async () => {
  snapshot = await testClient.snapshot()
})
afterEach(async () => {
  cleanup()
  await testClient.revert({ id: snapshot })
})

function renderStore(address: string) {
  const router = createMemoryRouter([{ path: '/stores/:address', element: <StorePage /> }], {
    initialEntries: [`/stores/${address}`],
  })
  const config = createTestConfig(accounts.carol)
  renderWithWagmi(<RouterProvider router={router} />, config)
  return config
}

describe('StorePage', () => {
  it('deposits into a tier from the page, against the real contracts', async () => {
    const config = renderStore(stores.cafe)
    await act(() => connect(config, { connector: config.connectors[0]! }))
    const user = userEvent.setup()

    expect(await screen.findByText('Pay 50, get 55')).toBeTruthy()
    const [firstTier] = await screen.findAllByRole('button', { name: 'Deposit' })
    await user.click(firstTier!)
    await user.click(await screen.findByRole('button', { name: 'Start' }))

    expect(await screen.findByText(/Deposit complete/, {}, { timeout: 15_000 })).toBeTruthy()
    // The page reads the new balance back from the chain.
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(await screen.findByText('55')).toBeTruthy()
  })

  it('refuses to offer deposits for a contract the factory did not create', async () => {
    renderStore(accounts.dave)
    expect(await screen.findByText(/not a store created by NeverRunaway/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Deposit' })).toBeNull()
  })
})
