import {
  consumeTypes,
  domainFromErc5267,
  type PayCode,
  storeDepositContractAbi,
} from '@neverrunaway/shared'
import {
  type Address,
  type Hash,
  type Hex,
  isAddressEqual,
  isErc6492Signature,
  parseEventLogs,
} from 'viem'
import type { Config } from 'wagmi'
import {
  getBlock,
  getBytecode,
  getContractEvents,
  readContracts,
  signTypedData,
  simulateContract,
  writeContract,
} from 'wagmi/actions'
import {
  chargeBlocker,
  normalizeV,
  PAY_CODE_TTL,
  type PayCodeStatus,
} from '../features/pay/codes.ts'
import type { MessageKey } from '../i18n/messages.ts'
import { nowInSeconds } from '../lib/time.ts'
import { PreflightError, revertErrorName } from '../lib/txErrors.ts'
import { storeAbi } from './abis.ts'
import { confirmAndWait, type TxProgress } from './confirmAndWait.ts'

export type SignedPayCode = {
  code: PayCode
  /** The latest block when the code was made. Its charge can't be in an earlier one. */
  fromBlock: bigint
  /** Seconds the device clock runs behind the chain (usually 0), for countdowns. */
  clockOffset: bigint
}

/** A charge as the store's Consume event records it. */
export type Charge = { amount: bigint; principalPart: bigint; bonusPart: bigint; hash: Hash }

/**
 * The time deadlines are measured against: the later of the device clock and the latest block. A
 * phone whose clock runs slow would otherwise sign codes the chain already sees as expired, while
 * anvil's latest block is only as recent as the last transaction.
 */
async function readChainClock(config: Config, chainId: number) {
  const block = await getBlock(config, { chainId })
  const device = nowInSeconds()
  const offset = block.timestamp > device ? block.timestamp - device : 0n
  return { now: device + offset, offset, blockNumber: block.number }
}

/**
 * The signature as the contract needs it. OpenZeppelin's ECDSA only takes v = 27 or 28, so an EOA's
 * v = 0 or 1 is rewritten. A contract account's signature stays as it is: a smart account can give
 * those values a meaning of its own (Safe uses v = 0 and 1 for contract and approved-hash
 * signatures), and the contract checks it through ERC-1271 instead.
 */
export async function canonicalSignature(
  config: Config,
  chainId: number,
  account: Address,
  signature: Hex,
): Promise<Hex> {
  const normalized = normalizeV(signature)
  if (!normalized) return signature
  const code = await getBytecode(config, { chainId, address: account })
  return code ? signature : normalized
}

/**
 * userConsume as an eth_call from the store's merchant: the contract's own verdict on the code,
 * signature included, without a wallet or gas. The cashier and the customer both run it.
 */
async function dryRun(
  config: Config,
  code: PayCode,
  merchant: Address,
): Promise<'ready' | 'invalid' | 'expired'> {
  try {
    await simulateContract(config, {
      chainId: code.chainId,
      account: merchant,
      address: code.store,
      abi: storeAbi,
      functionName: 'userConsume',
      args: [code.user, code.amount, code.deadline, code.signature],
    })
    return 'ready'
  } catch (error) {
    const errorName = revertErrorName(error)
    if (errorName === 'InvalidSignature') return 'invalid'
    if (errorName === 'SignatureExpired') return 'expired'
    throw error
  }
}

/**
 * Asks the wallet to sign a pay code for `amount` at `store`. Signing costs no gas: the merchant
 * submits the code and pays for it. The new code goes through the cashier's dry run before it is
 * shown, so a signature the contract won't accept (from some smart accounts, say) never reaches the
 * counter.
 */
export async function signPayCode(
  config: Config,
  {
    chainId,
    account,
    store,
    amount,
  }: { chainId: number; account: Address; store: Address; amount: bigint },
  onProgress: (progress: TxProgress<'sign'>) => void,
): Promise<SignedPayCode> {
  const contract = { chainId, address: store, abi: storeDepositContractAbi } as const
  const [merchant, storeActive, credit, nonce, domain] = await readContracts(config, {
    allowFailure: false,
    contracts: [
      { ...contract, functionName: 'merchant' },
      { ...contract, functionName: 'isActive' },
      { ...contract, functionName: 'getUserCredit', args: [account] },
      { ...contract, functionName: 'nonces', args: [account] },
      // ERC-5267: the store reports the EIP-712 domain it verifies signatures against.
      { ...contract, functionName: 'eip712Domain' },
    ],
  })
  if (!storeActive) throw new PreflightError('payStoreNotActive')
  if (credit < amount) throw new PreflightError('txInsufficientCredit')

  const clock = await readChainClock(config, chainId)
  const deadline = clock.now + PAY_CODE_TTL
  onProgress({ step: 'sign', phase: 'confirm' })
  const signature = await signTypedData(config, {
    account,
    domain: domainFromErc5267(domain),
    types: consumeTypes,
    primaryType: 'Consume',
    message: { user: account, amount, nonce, deadline },
  })
  const code: PayCode = {
    chainId,
    store,
    user: account,
    amount,
    nonce,
    deadline,
    signature: await canonicalSignature(config, chainId, account, signature),
  }

  // ERC-6492 wraps the signature of a smart account that isn't deployed yet. Checking a signature
  // through ERC-1271 needs the account's code on chain, and the store doesn't deploy accounts.
  if (isErc6492Signature(code.signature)) throw new PreflightError('paySmartAccountUndeployed')
  const verdict = await dryRun(config, code, merchant)
  // The deadline was set before the wallet opened, and a prompt can stay open for minutes.
  if (verdict === 'expired') throw new PreflightError('txSignatureExpired')
  if (verdict === 'invalid') throw new PreflightError('paySignatureUnusable')
  onProgress({ step: 'sign', phase: 'done' })
  return { code, fromBlock: clock.blockNumber, clockOffset: clock.offset }
}

async function readBlocker(config: Config, code: PayCode) {
  const contract = {
    chainId: code.chainId,
    address: code.store,
    abi: storeDepositContractAbi,
  } as const
  const [nonce, credit, storeActive] = await readContracts(config, {
    allowFailure: false,
    contracts: [
      { ...contract, functionName: 'nonces', args: [code.user] },
      { ...contract, functionName: 'getUserCredit', args: [code.user] },
      { ...contract, functionName: 'isActive' },
    ],
  })
  const clock = await readChainClock(config, code.chainId)
  const blocker = chargeBlocker(code, { now: clock.now, nonce, credit, storeActive })
  return { blocker, credit, clockOffset: clock.offset }
}

export type PayCodeCheck = { status: PayCodeStatus; credit: bigint; clockOffset: bigint }

/** What the cashier shows for a scanned code: whether the store's merchant can charge it now. */
export async function checkPayCode(
  config: Config,
  code: PayCode,
  merchant: Address,
): Promise<PayCodeCheck> {
  const { blocker, credit, clockOffset } = await readBlocker(config, code)
  const status = blocker ?? (await dryRun(config, code, merchant))
  return { status, credit, clockOffset }
}

const blockerKeys = {
  charged: 'codeCharged',
  expired: 'codeExpired',
  storeInactive: 'codeStoreInactive',
  insufficientCredit: 'codeInsufficientCredit',
  invalid: 'codeInvalid',
} as const satisfies Record<Exclude<PayCodeStatus, 'ready'>, MessageKey>

/**
 * Charges a pay code from the merchant's wallet: userConsume(user, amount, deadline, signature).
 * Chain state is checked first and the call simulated, so a code that can't go through never opens
 * the wallet.
 */
export async function chargePayCode(
  config: Config,
  { account, code }: { account: Address; code: PayCode },
  onProgress: (progress: TxProgress<'charge'>) => void,
): Promise<Charge> {
  const { blocker } = await readBlocker(config, code)
  if (blocker) throw new PreflightError(blockerKeys[blocker])

  const { request } = await simulateContract(config, {
    chainId: code.chainId,
    account,
    address: code.store,
    abi: storeAbi,
    functionName: 'userConsume',
    args: [code.user, code.amount, code.deadline, code.signature],
  })
  const receipt = await confirmAndWait(
    config,
    code.chainId,
    () => writeContract(config, request),
    (phase, hash) => onProgress({ step: 'charge', phase, hash }),
  )
  const consumed = parseEventLogs({
    abi: storeDepositContractAbi,
    eventName: 'Consume',
    logs: receipt.logs,
  }).find((log) => isAddressEqual(log.address, code.store))
  if (!consumed) throw new Error(`No Consume event in ${receipt.transactionHash}`)
  const { consumeAmount, principalPart, bonusPart } = consumed.args
  return { amount: consumeAmount, principalPart, bonusPart, hash: receipt.transactionHash }
}

/**
 * The charge that used the code's nonce, if any. It may be another code signed with the same nonce,
 * for a different amount. The search starts at the block the code was made in.
 */
export async function findCharge(
  config: Config,
  code: PayCode,
  fromBlock: bigint,
): Promise<Charge | undefined> {
  const events = await getContractEvents(config, {
    chainId: code.chainId,
    address: code.store,
    abi: storeDepositContractAbi,
    eventName: 'Consume',
    args: { user: code.user },
    fromBlock,
    strict: true,
  })
  const used = events.find((event) => event.args.nonce === code.nonce)
  if (!used) return undefined
  const { consumeAmount, principalPart, bonusPart } = used.args
  return { amount: consumeAmount, principalPart, bonusPart, hash: used.transactionHash }
}
