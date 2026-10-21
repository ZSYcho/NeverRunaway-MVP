import { execFile, spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import type { TestProject } from 'vitest/node'

const run = promisify(execFile)

// Not 8545, so the suite can run next to `pnpm dev`.
const PORT = 8546
const RPC_URL = `http://127.0.0.1:${PORT}`
const contractsDir = fileURLToPath(new URL('../../../contracts', import.meta.url))

async function chainId(): Promise<string | undefined> {
  try {
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }),
    })
    return ((await response.json()) as { result?: string }).result
  } catch {
    return undefined
  }
}

/** Starts a fresh anvil chain seeded by DevSeed, the same demo data as `pnpm dev`. */
export default async function setup(project: TestProject) {
  if (await chainId()) throw new Error(`Port ${PORT} is already in use; stop that process first.`)

  const anvil = spawn('anvil', ['--port', String(PORT), '--silent'], { stdio: 'ignore' })
  for (let attempt = 0; !(await chainId()); attempt++) {
    if (attempt > 100) throw new Error('anvil did not start')
    await sleep(100)
  }
  await run(
    'forge',
    ['script', 'script/DevSeed.s.sol', '--rpc-url', RPC_URL, '--broadcast', '--silent'],
    { cwd: contractsDir },
  )

  project.provide('anvilRpcUrl', RPC_URL)
  return () => {
    anvil.kill()
  }
}
