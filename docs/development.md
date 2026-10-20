# Development

## Prerequisites

| Tool    | Version                                     | Install                                                                   |
| ------- | ------------------------------------------- | ------------------------------------------------------------------------- |
| Node.js | 24 LTS, pinned in `.node-version`           | [fnm](https://github.com/Schniz/fnm), then `fnm install` in the repo root |
| pnpm    | pinned in `package.json` (`packageManager`) | `npm install -g pnpm`; pnpm then switches to the pinned version by itself |
| Foundry | 1.8.5, same as CI                           | [foundryup](https://getfoundry.sh), then `foundryup --install v1.8.5`     |

On Windows, use WSL2 and keep the repository and every toolchain inside the Linux filesystem
(for example `~/code`, not `/mnt/c`). Browsers and wallet extensions stay on Windows: WSL2
forwards `localhost`, so `http://localhost:5173` and the anvil RPC at `http://127.0.0.1:8545`
work from Windows Chrome.

## First run

```sh
git clone --recurse-submodules git@github.com:ZSYcho/NeverRunaway-MVP.git
cd NeverRunaway-MVP
pnpm install
pnpm dev
```

`pnpm dev` starts a fresh anvil chain, seeds it with `contracts/script/DevSeed.s.sol`, then runs
the API on `:8787` and the web app on `:5173` (which proxies `/api`). Ctrl+C stops everything.

### Demo data

The seed always produces the same addresses on a fresh chain.

| Account | Role                              | Address                                      |
| ------- | --------------------------------- | -------------------------------------------- |
| #0      | Deployer                          | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` |
| #1      | Internet cafe merchant            | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` |
| #2      | Barber merchant                   | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` |
| #3      | Alice, holds a cafe promo deposit | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` |
| #4      | Bob, barber member                | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` |

Accounts #1 to #9 each hold 10,000 test USDC. The cafe store offers 50 → 55 and a 30-day
100 → 200 promo; the barber store offers 30 → 30, a 200 → 240 membership tier and a
members-only 100 → 120 top-up.

To use these accounts in a browser wallet, add the network (RPC `http://127.0.0.1:8545`, chain
ID `31337`) and import keys derived from anvil's default mnemonic
(`test test test test test test test test test test test junk`). These keys are public: never
send real funds to them.

## Everyday commands

| Command               | What it does                                                          |
| --------------------- | --------------------------------------------------------------------- |
| `pnpm dev`            | Local chain, demo data, API and web app                               |
| `pnpm test`           | Unit tests in every package                                           |
| `pnpm test:contracts` | `forge test`                                                          |
| `pnpm typecheck`      | TypeScript across the workspace                                       |
| `pnpm lint`           | oxlint                                                                |
| `pnpm format`         | Prettier (`forge fmt` formats Solidity)                               |
| `pnpm gen`            | Regenerate typed ABIs after a contract change (CI fails if it drifts) |
| `pnpm build`          | Production build of the web app                                       |

## Layout

| Path              | Contents                                                                    |
| ----------------- | --------------------------------------------------------------------------- |
| `apps/web`        | React + Vite dApp (wagmi, viem)                                             |
| `apps/api`        | Hono API, run by Node's built-in TypeScript support                         |
| `packages/shared` | Generated ABIs, chain definitions and the per-chain deployment address book |
| `contracts`       | Foundry project: contracts, tests and deploy scripts                        |

## Testnet staging (X Layer)

1. Create a dedicated deployer key in an encrypted keystore. The private key is never printed:
   ```sh
   cast wallet new nr-deployer
   cast wallet address --account nr-deployer
   ```
2. Get test OKB for that address from the [X Layer faucet](https://web3.okx.com/xlayer/faucet).
   A deployment uses about 4.2M gas.
3. Deploy the test token and the factory. Without `--broadcast` the same command is a dry run.
   ```sh
   cd contracts
   forge script script/DeployStaging.s.sol --rpc-url https://testrpc.xlayer.tech/terigon \
     --account nr-deployer --broadcast
   ```
   Broadcasting writes `packages/shared/src/deployments/1952.json`. Register it in
   `packages/shared/src/deployments.ts` and commit both.
4. Point the web app at it: `VITE_CHAIN_ID=1952 pnpm --filter @neverrunaway/web dev`.

## Dependency policy

- pnpm skips package versions published in the last 24 hours and only runs install scripts for
  packages listed under `allowBuilds` in `pnpm-workspace.yaml`.
- Shared dependency versions live in the pnpm catalog in `pnpm-workspace.yaml`.
- GitHub Actions are pinned to full commit SHAs.
