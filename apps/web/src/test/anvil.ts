import { anvil, getDeployment } from '@neverrunaway/shared'
import {
  type Address,
  createTestClient,
  defineChain,
  erc20Abi,
  type Hex,
  http,
  publicActions,
} from 'viem'
import { afterEach, beforeEach, inject } from 'vitest'
import { type Config, createConfig } from 'wagmi'
import { connect, writeContract } from 'wagmi/actions'
import { type MockParameters, mock } from 'wagmi/connectors'
import type { TxProgress } from '../tx/confirmAndWait.ts'

const rpcUrl = inject('anvilRpcUrl')

/** The local chain at the test port. wagmi's mock connector sends wallet requests to this URL. */
export const testChain = defineChain({ ...anvil, rpcUrls: { default: { http: [rpcUrl] } } })

// Anvil mines instantly; the default 4 s polling would only slow the suite down.
const pollingInterval = 100

export const testClient = createTestClient({
  chain: testChain,
  mode: 'anvil',
  transport: http(rpcUrl),
  pollingInterval,
}).extend(publicActions)

/** Anvil default accounts, unlocked, with the roles DevSeed gives them. */
export const accounts = {
  cafeMerchant: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  alice: '0x90F79bf6EB2c4f870365E785982E1f101E93b906', // holds a cafe promo deposit
  carol: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc', // 10,000 USDC, no deposits
  dave: '0x976EA74026E726554dB657fA54763abd0C3a0aa9', // 10,000 USDC, no deposits
} as const satisfies Record<string, Address>

/** DevSeed addresses, the same on every fresh chain. */
export const stores = {
  cafe: '0xCafac3dD18aC6c6e92c921884f9E4176737C052c',
  barber: '0x9f1ac54BEF0DD2f6f3462EA0fa94fC62300d3a8e',
} as const satisfies Record<string, Address>

const deployment = getDeployment(anvil.id)
if (!deployment) throw new Error('No anvil deployment')
export const { factory, usdc } = deployment

/**
 * A wagmi config whose mock wallet controls `account` (connect it with wagmi's `connect`).
 * `features` makes the wallet misbehave, for example declining every signature request.
 */
export function createTestConfig(account: Address, features?: MockParameters['features']) {
  return createConfig({
    chains: [testChain],
    connectors: [mock({ accounts: [account], features })],
    transports: { [testChain.id]: http(rpcUrl) },
    multiInjectedProviderDiscovery: false,
    storage: null,
    pollingInterval,
  })
}

/** A wagmi config with a wallet connected as `account`, as the app would have it. */
export async function connectAs(account: Address) {
  const config = createTestConfig(account)
  await connect(config, { connector: config.connectors[0]! })
  return config
}

/** Reverts the chain after every test in the file, so each test starts from the seeded state. */
export function isolateChainPerTest() {
  let snapshot: Hex
  beforeEach(async () => {
    snapshot = await testClient.snapshot()
  })
  afterEach(async () => {
    await testClient.revert({ id: snapshot })
  })
}

export const usdcBalance = (account: Address) =>
  testClient.readContract({
    address: usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account],
  })

/** Records each step and phase a flow reports, i.e. every time the wallet would be involved. */
export function recordProgress() {
  const events: string[] = []
  return { events, onProgress: (p: TxProgress<string>) => events.push(`${p.step}:${p.phase}`) }
}

/** Sends a transaction as the config's connected account and waits until it is mined. */
export async function send(config: Config, request: Parameters<typeof writeContract>[1]) {
  await testClient.waitForTransactionReceipt({ hash: await writeContract(config, request) })
}
