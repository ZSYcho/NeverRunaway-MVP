// @vitest-environment happy-dom
import { act, cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import type { Address } from 'viem'
import { afterEach, describe, expect, it } from 'vitest'
import { connect } from 'wagmi/actions'
import { accounts, createTestConfig, isolateChainPerTest, stores } from '../test/anvil.ts'
import { renderWithWagmi } from '../test/renderWithWagmi.tsx'
import { ManageStorePage } from './ManageStorePage.tsx'
import { MerchantPage } from './MerchantPage.tsx'

isolateChainPerTest()
afterEach(cleanup)

async function renderAs(account: Address, path: string) {
  const router = createMemoryRouter(
    [
      { path: '/merchant', element: <MerchantPage /> },
      { path: '/merchant/stores/:address', element: <ManageStorePage /> },
      { path: '/stores/:address', element: <p>Customer page</p> },
    ],
    { initialEntries: [path] },
  )
  const config = createTestConfig(account)
  renderWithWagmi(<RouterProvider router={router} />, config)
  await act(() => connect(config, { connector: config.connectors[0]! }))
}

const chainWrite = { timeout: 15_000 }

describe('merchant pages', () => {
  it('opens a store, then funds its bonus pool for a planned promotion', async () => {
    await renderAs(accounts.dave, '/merchant')
    const user = userEvent.setup()

    expect(await screen.findByText('This wallet has not opened a store yet.')).toBeTruthy()
    await user.type(await screen.findByLabelText('Customer pays (USDC)'), '100')
    await user.type(screen.getByLabelText('Credit received (USDC)'), '120')
    await user.click(screen.getByRole('button', { name: 'Open store' }))

    // The new store's page, with a bonus tier nobody can buy until the pool is funded.
    expect(await screen.findByText(/Your store is on chain!/, {}, chainWrite)).toBeTruthy()
    expect(await screen.findByText("Sold out: customers can't buy it now")).toBeTruthy()

    const expected = screen.getByLabelText('Expected deposits')
    await user.clear(expected)
    await user.type(expected, '10')
    expect(
      screen.getByText('Needs 200 USDC of bonus, 200 USDC more than the pool holds.'),
    ).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Fund the difference' }))
    expect(screen.getByLabelText<HTMLInputElement>('Amount to add (USDC)').value).toBe('200')

    await user.click(screen.getByRole('button', { name: 'Fund' }))
    expect(await screen.findByText('The bonus pool is topped up.', {}, chainWrite)).toBeTruthy()
    expect(await screen.findByText('10 more deposits')).toBeTruthy()
  })

  it("points anyone but the merchant to the store's owner", async () => {
    await renderAs(accounts.carol, `/merchant/stores/${stores.cafe}`)
    expect(await screen.findByText(/This store belongs to 0x7099…79C8/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Fund' })).toBeNull()
  })
})
