import type { Abi, AbiFunction, ContractFunctionName } from 'viem'
import { describe, expect, it } from 'vitest'
import { storeDepositContractAbi } from './generated.ts'

// TypeScript catches arity and type changes in the generated ABI, but not a parameter whose meaning
// changes under the same type (P0 turned userDeposit(uint256 amount) into userDeposit(uint256 tierId)).
// These pin the call shapes the app depends on.
function signature(name: ContractFunctionName<typeof storeDepositContractAbi>): string[] {
  const abi: Abi = storeDepositContractAbi
  const item = abi.find(
    (entry): entry is AbiFunction => entry.type === 'function' && entry.name === name,
  )
  if (!item) throw new Error(`${name} is not a function in the ABI`)
  return item.inputs.map((input) => `${input.type} ${input.name}`)
}

describe('StoreDepositContract ABI surface', () => {
  it('deposits by tier id', () => {
    expect(signature('userDeposit')).toEqual(['uint256 _tierId'])
  })

  it('consumes with a user signature relayed by the merchant', () => {
    expect(signature('userConsume')).toEqual([
      'address _user',
      'uint256 _amount',
      'uint256 _deadline',
      'bytes _signature',
    ])
  })

  it('exposes its EIP-712 domain (EIP-5267) and per-user nonces', () => {
    expect(signature('eip712Domain')).toEqual([])
    expect(signature('nonces')).toEqual(['address owner'])
  })
})
