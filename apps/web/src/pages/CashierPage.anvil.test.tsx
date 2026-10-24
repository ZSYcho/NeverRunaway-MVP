// @vitest-environment happy-dom
import { encodePayCode } from '@neverrunaway/shared'
import { act, cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import type { Address } from 'viem'
import { afterEach, describe, expect, it } from 'vitest'
import { connect } from 'wagmi/actions'
import {
  accounts,
  connectAs,
  createTestConfig,
  isolateChainPerTest,
  stores,
  testChain,
} from '../test/anvil.ts'
import { renderWithWagmi } from '../test/renderWithWagmi.tsx'
import { chargePayCode, signPayCode } from '../tx/payCode.ts'
import { CashierPage } from './CashierPage.tsx'

isolateChainPerTest()
afterEach(cleanup)

const USDC = 1_000_000n
const chainWrite = { timeout: 15_000 }

/** A 30 USDC code from Alice, who holds 100 principal and 100 bonus at the cafe. */
async function aliceSignsThirty() {
  const config = await connectAs(accounts.alice)
  const { code } = await signPayCode(
    config,
    { chainId: testChain.id, account: accounts.alice, store: stores.cafe, amount: 30n * USDC },
    () => {},
  )
  return code
}

/** The cashier as `account` sees it, opened from a link whose fragment is `hash`. */
async function renderCashier(account: Address, hash = '') {
  const router = createMemoryRouter(
    [
      { path: '/merchant/cashier', element: <CashierPage /> },
      { path: '/merchant/stores/:address', element: <p>Manage store</p> },
      { path: '/merchant', element: <p>Merchant center</p> },
    ],
    { initialEntries: [`/merchant/cashier${hash}`] },
  )
  const config = createTestConfig(account)
  renderWithWagmi(<RouterProvider router={router} />, config)
  await act(() => connect(config, { connector: config.connectors[0]! }))
  return router
}

describe('cashier page', () => {
  it('charges a scanned pay code, then waits for the next customer', async () => {
    const code = await aliceSignsThirty()
    const router = await renderCashier(accounts.cafeMerchant, `#${encodePayCode(code)}`)
    const user = userEvent.setup()

    expect(await screen.findByText('Signature valid. Ready to charge.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Charge 30 USDC' }))

    expect(await screen.findByText('Charged 30 USDC', {}, chainWrite)).toBeTruthy()
    expect(screen.getByText('15 principal + 15 bonus')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Next customer' }))
    expect(router.state.location.hash).toBe('')
    expect(screen.getByLabelText('Payment link')).toBeTruthy()
  })

  it('opens a payment link pasted in, or typed by a scanner gun ending with Enter', async () => {
    const code = await aliceSignsThirty()
    await renderCashier(accounts.cafeMerchant)
    const user = userEvent.setup()

    await user.click(screen.getByLabelText('Payment link'))
    await user.paste(`https://another-host.example/merchant/cashier#${encodePayCode(code)}`)
    await user.keyboard('{Enter}')

    expect(await screen.findByRole('button', { name: 'Charge 30 USDC' })).toBeTruthy()
  })

  it('says when a code was already charged, and offers no second charge', async () => {
    const code = await aliceSignsThirty()
    const merchant = await connectAs(accounts.cafeMerchant)
    await chargePayCode(merchant, { account: accounts.cafeMerchant, code }, () => {})

    await renderCashier(accounts.cafeMerchant, `#${encodePayCode(code)}`)

    expect(await screen.findByText('This code has already been charged.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Charge/ })).toBeNull()
  })

  it("points any other wallet to the store's merchant account", async () => {
    const code = await aliceSignsThirty()
    await renderCashier(accounts.carol, `#${encodePayCode(code)}`)

    expect(await screen.findByText(/This code is for a store run by 0x7099…79C8/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Charge/ })).toBeNull()
  })

  it('refuses a link that does not hold a pay code', async () => {
    await renderCashier(accounts.cafeMerchant, '#v=1&chain=31337&store=0x1234')
    expect(await screen.findByText("That isn't a valid pay code link.")).toBeTruthy()
  })
})
