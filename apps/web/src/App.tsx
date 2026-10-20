import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { WagmiProvider } from 'wagmi'
import { Layout } from './components/Layout.tsx'
import { I18nProvider } from './i18n/I18nProvider.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'
import { wagmiConfig } from './wagmi.ts'

const queryClient = new QueryClient()

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export function App() {
  return (
    // Sessions are restored by useWalletBootstrap, which also covers WalletConnect.
    <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <RouterProvider router={router} />
        </I18nProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
