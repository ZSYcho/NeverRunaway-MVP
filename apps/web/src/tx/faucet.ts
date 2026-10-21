import { mockUsdcAbi } from '@neverrunaway/shared'
import {
  type Address,
  type Chain,
  createTestClient,
  createWalletClient,
  http,
  parseEther,
  publicActions,
} from 'viem'
import type { Config } from 'wagmi'
import { simulateContract, writeContract } from 'wagmi/actions'
import { TransactionRevertedError } from '../lib/txErrors.ts'
import { confirmAndWait, type TxProgress } from './confirmAndWait.ts'

/** Anvil's first default account. Anvil keeps it unlocked, so it signs its transactions. */
export const ANVIL_FUNDER: Address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'

/**
 * Local chain only. Tops up gas with anvil_setBalance and mints test USDC from an unlocked account,
 * so whichever wallet is connected can try every flow without a key import or a signature.
 */
export async function fundOnAnvil({
  chain,
  account,
  usdc,
  usdcAmount,
}: {
  chain: Chain
  account: Address
  usdc: Address
  usdcAmount: bigint
}) {
  const transport = http(chain.rpcUrls.default.http[0])
  const testClient = createTestClient({ chain, mode: 'anvil', transport }).extend(publicActions)
  if ((await testClient.getBalance({ address: account })) < parseEther('1')) {
    await testClient.setBalance({ address: account, value: parseEther('100') })
  }

  const funder = createWalletClient({ chain, transport, account: ANVIL_FUNDER })
  const hash = await funder.writeContract({
    address: usdc,
    abi: mockUsdcAbi,
    functionName: 'mint',
    args: [account, usdcAmount],
  })
  const receipt = await testClient.waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success') throw new TransactionRevertedError(`Mint ${hash} reverted`)
}

/** Test networks: the open-mint test USDC lets anyone mint for themselves, paying their own gas. */
export async function mintTestUsdc(
  config: Config,
  {
    chainId,
    account,
    usdc,
    amount,
  }: { chainId: number; account: Address; usdc: Address; amount: bigint },
  onProgress: (progress: TxProgress<'mint'>) => void,
) {
  const { request } = await simulateContract(config, {
    chainId,
    account,
    address: usdc,
    abi: mockUsdcAbi,
    functionName: 'mint',
    args: [account, amount],
  })
  return confirmAndWait(
    config,
    chainId,
    () => writeContract(config, request),
    (phase, hash) => onProgress({ step: 'mint', phase, hash }),
  )
}
