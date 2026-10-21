// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { I18nProvider } from '../../i18n/I18nProvider.tsx'
import { StorePosterDialog } from './StorePosterDialog.tsx'

const store = '0xCafac3dD18aC6c6e92c921884f9E4176737C052c'

afterEach(cleanup)

describe('StorePosterDialog', () => {
  it("encodes the store's public page, and warns while that page is only on this computer", () => {
    render(
      <I18nProvider>
        <StorePosterDialog store={store} onClose={() => {}} />
      </I18nProvider>,
    )

    // A plain web link to the customer page, not the merchant one: any scanner can open it.
    const link = `${window.location.origin}/stores/${store}`
    expect(screen.getByTitle(link)).toBeTruthy() // the QR code's accessible name
    expect(screen.getByText(link, { selector: 'span' })).toBeTruthy()
    // happy-dom serves the test page from localhost, which a phone can't reach.
    expect(screen.getByText(/points to this computer/)).toBeTruthy()
  })
})
