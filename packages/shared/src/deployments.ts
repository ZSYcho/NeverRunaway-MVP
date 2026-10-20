import { getAddress, isAddress } from 'viem'
import { z } from 'zod'
import anvilDeployment from './deployments/31337.json' with { type: 'json' }

const address = z
  .string()
  .refine((value) => isAddress(value, { strict: false }), 'Invalid address')
  .transform((value) => getAddress(value))

/** Shape of the files written by contracts/script/utils/DeploymentWriter.sol. */
export const deploymentSchema = z.object({
  chainId: z.number().int().positive(),
  factory: address,
  usdc: address,
  /** First block worth scanning for this deployment's events. */
  startBlock: z
    .number()
    .int()
    .nonnegative()
    .transform((value) => BigInt(value)),
  /** `usdc` is a test token with an open mint, so the UI may offer a faucet. */
  usdcFaucet: z.boolean(),
})

export type Deployment = z.output<typeof deploymentSchema>

export const deployments: ReadonlyMap<number, Deployment> = new Map(
  [anvilDeployment].map((raw) => {
    const deployment = deploymentSchema.parse(raw)
    return [deployment.chainId, deployment]
  }),
)

export function getDeployment(chainId: number): Deployment | undefined {
  return deployments.get(chainId)
}
