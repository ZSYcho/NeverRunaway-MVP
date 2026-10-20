import { describe, expect, it } from 'vitest'
import { getKnownChain } from './chains.ts'
import { deploymentSchema, deployments, getDeployment } from './deployments.ts'

const valid = {
  chainId: 31337,
  factory: '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512',
  usdc: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  startBlock: 0,
  usdcFaucet: true,
}

describe('deploymentSchema', () => {
  it('checksums addresses and converts startBlock to bigint', () => {
    const deployment = deploymentSchema.parse(valid)
    expect(deployment.factory).toBe('0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512')
    expect(deployment.startBlock).toBe(0n)
  })

  it('rejects malformed addresses', () => {
    expect(() => deploymentSchema.parse({ ...valid, factory: '0x1234' })).toThrow()
  })

  it('rejects missing fields', () => {
    const { usdc: _usdc, ...withoutUsdc } = valid
    expect(() => deploymentSchema.parse(withoutUsdc)).toThrow()
  })
})

describe('committed deployments', () => {
  it('only target chains the app knows how to reach', () => {
    for (const chainId of deployments.keys()) {
      expect(getKnownChain(chainId), `chain ${chainId}`).toBeDefined()
    }
  })

  it('include the local anvil chain', () => {
    expect(getDeployment(31337)?.usdcFaucet).toBe(true)
  })
})
