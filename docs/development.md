# Development

## Prerequisites

| Tool        | Version                                     | Install                                                                                               |
| ----------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Node.js     | 24 LTS, pinned in `.node-version`           | [fnm](https://github.com/Schniz/fnm), then `fnm install` in the repo root                             |
| pnpm        | pinned in `package.json` (`packageManager`) | `npm install -g pnpm`; pnpm then switches to the pinned version by itself                             |
| Foundry     | 1.8.5, same as CI                           | [foundryup](https://getfoundry.sh), then `foundryup --install v1.8.5`                                 |
| cloudflared | optional, for `pnpm dev:phone`              | [downloads](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) |

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

Wallet extensions connect out of the box. To offer WalletConnect as well, put a Reown project ID
in `apps/web/.env.local` (see `apps/web/.env.example`). How wallets connect, and how to test in a
phone wallet, is described in [wallet-access.md](wallet-access.md).

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

To try the flows with your own wallet, connect it, let the banner add the local network
(chain ID `31337`), then press **Get test funds** on a store page: it gives the connected address
100 ETH for gas and 1,000 test USDC through anvil's dev RPC, without a signature. There's no need
to import the demo accounts' keys; they come from anvil's public mnemonic, so never put them in a
wallet that holds real funds.

The merchant side works the same way. Under **Merchant**, open a store from your own wallet, fund
its bonus pool and add or retire tiers; the bonus pool card shows how many more deposits each
bonus tier can take, and plans the funding for a promotion. Each store's management page also has
a QR code of its public page for the counter. A phone can only open it from a public URL, such as
the one `pnpm dev:phone` prints.

`pnpm dev` starts a new chain each time. If MetaMask then reports a nonce error, clear its record
of the old chain: Settings → Advanced → Clear activity tab data.

## Everyday commands

| Command               | What it does                                                                           |
| --------------------- | -------------------------------------------------------------------------------------- |
| `pnpm dev`            | Local chain, demo data, API and web app                                                |
| `pnpm dev:phone`      | X Layer testnet build behind an HTTPS tunnel, with a QR code to scan in a phone wallet |
| `pnpm test`           | Unit tests in every package                                                            |
| `pnpm test:anvil`     | Customer and merchant flows and pages against a fresh anvil chain                      |
| `pnpm test:contracts` | `forge test`                                                                           |
| `pnpm typecheck`      | TypeScript across the workspace                                                        |
| `pnpm lint`           | oxlint                                                                                 |
| `pnpm format`         | Prettier (`forge fmt` formats Solidity)                                                |
| `pnpm gen`            | Regenerate typed ABIs after a contract change (CI fails if it drifts)                  |
| `pnpm build`          | Production build of the web app                                                        |

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
   Broadcasting writes `packages/shared/src/deployments/1952.json` and the transaction record
   `contracts/broadcast/DeployStaging.s.sol/1952/run-latest.json`. Register the deployment file in
   `packages/shared/src/deployments.ts` and commit all three.
4. Point the web app at it: `VITE_CHAIN_ID=1952 pnpm --filter @neverrunaway/web dev`.

## Deployments

### X Layer testnet (chain ID 1952)

| Contract                          | Address                                                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `StoreDepositFactory`             | [`0x57C16A1Dcc467d475CE25AFBcD76172EF592611f`](https://web3.okx.com/explorer/x-layer-testnet/address/0x57C16A1Dcc467d475CE25AFBcD76172EF592611f) |
| Test USDC (`MockUSDC`, open mint) | [`0x83EF7d930c5730Fe01fF485828AF7ADF8e1c1DcB`](https://web3.okx.com/explorer/x-layer-testnet/address/0x83EF7d930c5730Fe01fF485828AF7ADF8e1c1DcB) |

Deployed in block 44027029 with `DeployStaging.s.sol`. The deployer account holds no privileges:
neither contract has an owner. Source verification on the explorer is still pending.

## Dependency policy

- pnpm skips package versions published in the last 24 hours and only runs install scripts for
  packages listed under `allowBuilds` in `pnpm-workspace.yaml`.
- Shared dependency versions live in the pnpm catalog in `pnpm-workspace.yaml`.
- GitHub Actions are pinned to full commit SHAs.
