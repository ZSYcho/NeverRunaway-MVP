// @vitest-environment happy-dom
import { decodePayCode } from '@neverrunaway/shared'
import { act, cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import type { Address } from 'viem'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { connect } from 'wagmi/actions'
import {
  accounts,
  connectAs,
  createTestConfig,
  isolateChainPerTest,
  stores,
} from '../test/anvil.ts'
import { renderWithWagmi } from '../test/renderWithWagmi.tsx'
import { chargePayCode } from '../tx/payCode.ts'
import { StorePage } from './StorePage.tsx'

isolateChainPerTest()
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderStore(address: string, account: Address = accounts.carol) {
  const router = createMemoryRouter([{ path: '/stores/:address', element: <StorePage /> }], {
    initialEntries: [`/stores/${address}`],
  })
  const config = createTestConfig(account)
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

const USDC = 1_000_000n
const chainWrite = { timeout: 15_000 }

/** Alice, who holds 200 USDC of cafe credit, opens a 30 USDC pay code on the store page. */
async function alicePaysThirty() {
  const config = renderStore(stores.cafe, accounts.alice)
  await act(() => connect(config, { connector: config.connectors[0]! }))
  const user = userEvent.setup()

  await user.click(await screen.findByRole('button', { name: 'Pay at the counter' }))
  await user.type(await screen.findByLabelText('Amount (USDC)'), '30')
  expect(screen.getByText(/30000000 means 30 USDC/)).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Create pay code' }))

  // The QR code's accessible name is the link it encodes: the cashier page, code in the fragment.
  const qr = await screen.findByTitle(/\/merchant\/cashier#v=1&/, {}, chainWrite)
  const code = decodePayCode(qr.textContent ?? '')
  if (!code) throw new Error('The QR code does not hold a pay code')
  return { code, user }
}

describe('paying at the counter', () => {
  it('shows a signed code, then sees the store charge it', async () => {
    const { code } = await alicePaysThirty()
    expect(code).toMatchObject({ store: stores.cafe, user: accounts.alice, amount: 30n * USDC })
    expect(screen.getByText(/Waiting for the store to charge it/)).toBeTruthy()

    // The cafe charges it from its own wallet, as its cashier page would.
    const merchant = await connectAs(accounts.cafeMerchant)
    await chargePayCode(merchant, { account: accounts.cafeMerchant, code }, () => {})

    expect(await screen.findByText('Paid 30 USDC', {}, chainWrite)).toBeTruthy()
    expect(screen.getByText('15 principal + 15 bonus')).toBeTruthy()
  })

  it('lets an unused code run out and makes a new one for the same amount', async () => {
    const { user } = await alicePaysThirty()

    // Five minutes later.
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now + 301_000)
    expect(
      await screen.findByText('This code expired without being charged.', {}, chainWrite),
    ).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'New code' }))
    expect(screen.getByLabelText<HTMLInputElement>('Amount (USDC)').value).toBe('30')
  })
})
