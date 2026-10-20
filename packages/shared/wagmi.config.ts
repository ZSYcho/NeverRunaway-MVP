import { defineConfig } from '@wagmi/cli'
import { foundry } from '@wagmi/cli/plugins'

// Typed ABIs straight from the Foundry build, so the TypeScript side can't drift from the contracts.
export default defineConfig({
  out: 'src/generated.ts',
  plugins: [
    foundry({
      project: '../../contracts',
      include: ['StoreDepositContract.sol/**', 'StoreDepositFactory.sol/**', 'MockUSDC.sol/**'],
    }),
  ],
})
