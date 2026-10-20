import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const apiPort = process.env.API_PORT ?? '8787'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        // Vendor code changes far less often than app code; separate chunks keep it cached across
        // deploys. Only libraries the app imports up front are grouped: a catch-all node_modules
        // group would also pull lazily imported SDKs (WalletConnect) into the first page load.
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/,
            },
            {
              name: 'web3',
              test: /node_modules[\\/](viem|ox|abitype|wagmi|@wagmi|@tanstack|@noble|@scure|mipd|zustand)[\\/]/,
            },
          ],
        },
      },
    },
  },
  server: {
    // Keep /api same-origin in development, as in production where the API serves the built app.
    proxy: { '/api': `http://127.0.0.1:${apiPort}` },
    // HTTPS tunnels for testing in phone wallets (docs/wallet-access.md).
    allowedHosts: ['.trycloudflare.com'],
  },
})
