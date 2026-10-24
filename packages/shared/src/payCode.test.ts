import {
  type Address,
  concat,
  encodeAbiParameters,
  type Hex,
  hashTypedData,
  keccak256,
  maxUint256,
  parseAbiParameters,
  toHex,
} from 'viem'
import { describe, expect, it } from 'vitest'
import {
  consumeTypes,
  decodePayCode,
  domainFromErc5267,
  type Erc5267Domain,
  encodePayCode,
  type PayCode,
} from './payCode.ts'

const store: Address = '0xCafac3dD18aC6c6e92c921884f9E4176737C052c'
const user: Address = '0x90F79bf6EB2c4f870365E785982E1f101E93b906'
const signature: Hex = `0x${'ab'.repeat(65)}`

const code: PayCode = {
  chainId: 1952,
  store,
  user,
  amount: 30_000_000n,
  nonce: 0n,
  deadline: 1_761_000_000n,
  signature,
}

/** The encoded code with some parameters replaced, removed (null) or added. */
function fragmentWith(changes: Record<string, string | null>): string {
  const params = new Map(
    encodePayCode(code)
      .split('&')
      .map((pair) => pair.split('=') as [string, string]),
  )
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) params.delete(key)
    else params.set(key, value)
  }
  return [...params].map(([key, value]) => `${key}=${value}`).join('&')
}

describe('encodePayCode', () => {
  it('writes readable key=value pairs, with the long signature last', () => {
    expect(encodePayCode(code)).toBe(
      `v=1&chain=1952&store=${store}&user=${user}&amount=30000000&nonce=0&deadline=1761000000&sig=${signature}`,
    )
  })
})

describe('decodePayCode', () => {
  it('reads back what encodePayCode wrote', () => {
    expect(decodePayCode(encodePayCode(code))).toEqual(code)
  })

  it('reads a whole cashier link, as a scanner or a paste delivers it', () => {
    const link = `https://example.com/merchant/cashier#${encodePayCode(code)}`
    expect(decodePayCode(link)).toEqual(code)
    // Scanner guns type the code like a keyboard and end it with Enter.
    expect(decodePayCode(`  ${link}\n`)).toEqual(code)
    expect(decodePayCode(`#${encodePayCode(code)}`)).toEqual(code)
  })

  it('reads a link that was percent-encoded on the way, as deep links and chat apps do', () => {
    const link = `https://example.com/merchant/cashier#${encodePayCode(code)}`
    expect(decodePayCode(encodeURIComponent(link))).toEqual(code)
    expect(
      decodePayCode(
        `https://example.com/merchant/cashier#${encodeURIComponent(encodePayCode(code))}`,
      ),
    ).toEqual(code)
    expect(decodePayCode('https://example.com/merchant/cashier#%E0%A4%A')).toBeUndefined()
  })

  it('checksums addresses written in any case', () => {
    const decoded = decodePayCode(
      fragmentWith({ store: store.toLowerCase(), user: user.toUpperCase().replace('0X', '0x') }),
    )
    expect(decoded?.store).toBe(store)
    expect(decoded?.user).toBe(user)
  })

  it('ignores parameters it does not know, so later versions can add some', () => {
    expect(decodePayCode(fragmentWith({ memo: 'table 4' }))).toEqual(code)
  })

  it('rejects anything malformed instead of guessing', () => {
    const malformed: Array<Record<string, string | null>> = [
      { v: '2' },
      { v: null },
      { chain: '0' },
      { chain: '1e3' },
      { chain: '99999999999999999' },
      { store: '0x1234' },
      { user: 'alice.eth' },
      { amount: '0' },
      { amount: '-1' },
      { amount: '1.5' },
      { amount: '0x10' },
      { amount: (maxUint256 + 1n).toString() },
      { nonce: '' },
      { deadline: null },
      { sig: '0x' },
      { sig: '0xabc' },
      { sig: 'ab'.repeat(65) },
      { sig: `0x${'zz'.repeat(65)}` },
    ]
    for (const changes of malformed) {
      expect(decodePayCode(fragmentWith(changes)), JSON.stringify(changes)).toBeUndefined()
    }
    expect(decodePayCode('https://example.com/merchant/cashier')).toBeUndefined()
    expect(decodePayCode('not a link')).toBeUndefined()
  })
})

describe('consumeTypes', () => {
  it("hash like the contract's _hashTypedDataV4(keccak256(abi.encode(CONSUME_TYPEHASH, ...)))", () => {
    const domain = {
      name: 'NeverRunaway Store',
      version: '1',
      chainId: 1952,
      verifyingContract: store,
    }
    const message = { user, amount: code.amount, nonce: code.nonce, deadline: code.deadline }

    // The same digest, assembled the way StoreDepositContract and OpenZeppelin's EIP712 do it.
    const typeHash = keccak256(
      toHex('Consume(address user,uint256 amount,uint256 nonce,uint256 deadline)'),
    )
    const domainTypeHash = keccak256(
      toHex('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
    )
    const separator = keccak256(
      encodeAbiParameters(parseAbiParameters('bytes32, bytes32, bytes32, uint256, address'), [
        domainTypeHash,
        keccak256(toHex(domain.name)),
        keccak256(toHex(domain.version)),
        BigInt(domain.chainId),
        domain.verifyingContract,
      ]),
    )
    const structHash = keccak256(
      encodeAbiParameters(parseAbiParameters('bytes32, address, uint256, uint256, uint256'), [
        typeHash,
        message.user,
        message.amount,
        message.nonce,
        message.deadline,
      ]),
    )

    expect(hashTypedData({ domain, types: consumeTypes, primaryType: 'Consume', message })).toBe(
      keccak256(concat(['0x1901', separator, structHash])),
    )
  })
})

describe('domainFromErc5267', () => {
  const zeroSalt: Hex = `0x${'00'.repeat(32)}`
  // What OpenZeppelin's EIP712 returns from eip712Domain(): fields 0x0f, an unused zero salt.
  const reported: Erc5267Domain = ['0x0f', 'NeverRunaway Store', '1', 1952n, store, zeroSalt, []]

  it("keeps only the fields the bitmap marks as used, so an unused salt can't change the domain", () => {
    expect(domainFromErc5267(reported)).toEqual({
      name: 'NeverRunaway Store',
      version: '1',
      chainId: 1952,
      verifyingContract: store,
    })
  })

  it('keeps the salt of a contract that uses one', () => {
    const salt: Hex = `0x${'11'.repeat(32)}`
    expect(
      domainFromErc5267(['0x1f', 'NeverRunaway Store', '1', 1952n, store, salt, []]).salt,
    ).toBe(salt)
  })

  it('refuses a domain with extensions, which it could not sign correctly', () => {
    expect(() =>
      domainFromErc5267(['0x0f', 'NeverRunaway Store', '1', 1952n, store, zeroSalt, [1n]]),
    ).toThrow()
  })
})
