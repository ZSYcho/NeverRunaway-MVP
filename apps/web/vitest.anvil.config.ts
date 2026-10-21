import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Flow tests against a real chain: a fresh anvil seeded with the contracts and demo data.
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.anvil.test.{ts,tsx}'],
    globalSetup: ['test/anvilGlobalSetup.ts'],
    // One chain is shared, so files run one after another; tests isolate with snapshots.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
})
