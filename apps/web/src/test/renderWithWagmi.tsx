import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { type Config, type ResolvedRegister, WagmiProvider } from 'wagmi'
import { I18nProvider } from '../i18n/I18nProvider.tsx'

/** Renders UI with the same providers as the app, around a config built by the test. */
export function renderWithWagmi(ui: ReactNode, config: Config) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    // The provider's prop type is the app's registered config; tests bring their own chains.
    <WagmiProvider
      config={config as unknown as ResolvedRegister['config']}
      reconnectOnMount={false}
    >
      <QueryClientProvider client={queryClient}>
        <I18nProvider>{ui}</I18nProvider>
      </QueryClientProvider>
    </WagmiProvider>,
  )
}
