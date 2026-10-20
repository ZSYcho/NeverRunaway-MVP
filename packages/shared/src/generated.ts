//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// MockUSDC
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const mockUsdcAbi = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
  {
    type: 'function',
    inputs: [
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'spender', internalType: 'address', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'spender', internalType: 'address', type: 'address' },
      { name: 'value', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', internalType: 'uint8', type: 'uint8' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'name',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'value', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'value', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'owner', internalType: 'address', type: 'address', indexed: true },
      { name: 'spender', internalType: 'address', type: 'address', indexed: true },
      { name: 'value', internalType: 'uint256', type: 'uint256', indexed: false },
    ],
    name: 'Approval',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'from', internalType: 'address', type: 'address', indexed: true },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      { name: 'value', internalType: 'uint256', type: 'uint256', indexed: false },
    ],
    name: 'Transfer',
  },
  {
    type: 'error',
    inputs: [
      { name: 'spender', internalType: 'address', type: 'address' },
      { name: 'allowance', internalType: 'uint256', type: 'uint256' },
      { name: 'needed', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'ERC20InsufficientAllowance',
  },
  {
    type: 'error',
    inputs: [
      { name: 'sender', internalType: 'address', type: 'address' },
      { name: 'balance', internalType: 'uint256', type: 'uint256' },
      { name: 'needed', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'ERC20InsufficientBalance',
  },
  {
    type: 'error',
    inputs: [{ name: 'approver', internalType: 'address', type: 'address' }],
    name: 'ERC20InvalidApprover',
  },
  {
    type: 'error',
    inputs: [{ name: 'receiver', internalType: 'address', type: 'address' }],
    name: 'ERC20InvalidReceiver',
  },
  {
    type: 'error',
    inputs: [{ name: 'sender', internalType: 'address', type: 'address' }],
    name: 'ERC20InvalidSender',
  },
  {
    type: 'error',
    inputs: [{ name: 'spender', internalType: 'address', type: 'address' }],
    name: 'ERC20InvalidSpender',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// StoreDepositContract
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const storeDepositContractAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: '_merchant', internalType: 'address', type: 'address' },
      { name: '_usdcToken', internalType: 'address', type: 'address' },
      { name: '_expireDays', internalType: 'uint256', type: 'uint256' },
      { name: '_depositAmounts', internalType: 'uint256[]', type: 'uint256[]' },
      { name: '_creditAmounts', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'CONSUME_TYPEHASH',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'DOMAIN_SEPARATOR',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_depositAmount', internalType: 'uint256', type: 'uint256' },
      { name: '_creditAmount', internalType: 'uint256', type: 'uint256' },
      { name: '_validUntil', internalType: 'uint64', type: 'uint64' },
      { name: '_requiredLevel', internalType: 'uint8', type: 'uint8' },
      { name: '_grantsLevel', internalType: 'uint8', type: 'uint8' },
    ],
    name: 'addTier',
    outputs: [{ name: 'tierId', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'bonusPool',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  { type: 'function', inputs: [], name: 'closeStore', outputs: [], stateMutability: 'nonpayable' },
  {
    type: 'function',
    inputs: [],
    name: 'closed',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '_tierId', internalType: 'uint256', type: 'uint256' }],
    name: 'disableTier',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'eip712Domain',
    outputs: [
      { name: 'fields', internalType: 'bytes1', type: 'bytes1' },
      { name: 'name', internalType: 'string', type: 'string' },
      { name: 'version', internalType: 'string', type: 'string' },
      { name: 'chainId', internalType: 'uint256', type: 'uint256' },
      { name: 'verifyingContract', internalType: 'address', type: 'address' },
      { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
      { name: 'extensions', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'expireTime',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '_amount', internalType: 'uint256', type: 'uint256' }],
    name: 'fundBonus',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_tierId', internalType: 'uint256', type: 'uint256' }],
    name: 'getTier',
    outputs: [
      {
        name: '',
        internalType: 'struct StoreDepositContract.Tier',
        type: 'tuple',
        components: [
          { name: 'depositAmount', internalType: 'uint256', type: 'uint256' },
          { name: 'creditAmount', internalType: 'uint256', type: 'uint256' },
          { name: 'validUntil', internalType: 'uint64', type: 'uint64' },
          { name: 'requiredLevel', internalType: 'uint8', type: 'uint8' },
          { name: 'grantsLevel', internalType: 'uint8', type: 'uint8' },
          { name: 'active', internalType: 'bool', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getTiers',
    outputs: [
      {
        name: '',
        internalType: 'struct StoreDepositContract.Tier[]',
        type: 'tuple[]',
        components: [
          { name: 'depositAmount', internalType: 'uint256', type: 'uint256' },
          { name: 'creditAmount', internalType: 'uint256', type: 'uint256' },
          { name: 'validUntil', internalType: 'uint64', type: 'uint64' },
          { name: 'requiredLevel', internalType: 'uint8', type: 'uint8' },
          { name: 'grantsLevel', internalType: 'uint8', type: 'uint8' },
          { name: 'active', internalType: 'bool', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '_user', internalType: 'address', type: 'address' }],
    name: 'getUserCredit',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'isActive',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'memberLevel',
    outputs: [{ name: '', internalType: 'uint8', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'merchant',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'merchantWithdraw',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'merchantWithdrawable',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'nonces',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'tierCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalLocked',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'usdcToken',
    outputs: [{ name: '', internalType: 'contract IERC20', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'userBonus',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_user', internalType: 'address', type: 'address' },
      { name: '_amount', internalType: 'uint256', type: 'uint256' },
      { name: '_deadline', internalType: 'uint256', type: 'uint256' },
      { name: '_signature', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'userConsume',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_tierId', internalType: 'uint256', type: 'uint256' }],
    name: 'userDeposit',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'userPrincipal',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  { type: 'function', inputs: [], name: 'userRefund', outputs: [], stateMutability: 'nonpayable' },
  {
    type: 'function',
    inputs: [{ name: '_amount', internalType: 'uint256', type: 'uint256' }],
    name: 'withdrawBonusPool',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'from', internalType: 'address', type: 'address', indexed: true },
      { name: 'amount', internalType: 'uint256', type: 'uint256', indexed: false },
    ],
    name: 'BonusFunded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'merchant', internalType: 'address', type: 'address', indexed: true },
      { name: 'amount', internalType: 'uint256', type: 'uint256', indexed: false },
    ],
    name: 'BonusWithdrawn',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'user', internalType: 'address', type: 'address', indexed: true },
      { name: 'merchant', internalType: 'address', type: 'address', indexed: true },
      { name: 'consumeAmount', internalType: 'uint256', type: 'uint256', indexed: false },
      { name: 'principalPart', internalType: 'uint256', type: 'uint256', indexed: false },
      { name: 'bonusPart', internalType: 'uint256', type: 'uint256', indexed: false },
      { name: 'nonce', internalType: 'uint256', type: 'uint256', indexed: false },
    ],
    name: 'Consume',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'user', internalType: 'address', type: 'address', indexed: true },
      { name: 'tierId', internalType: 'uint256', type: 'uint256', indexed: true },
      { name: 'depositAmount', internalType: 'uint256', type: 'uint256', indexed: false },
      { name: 'creditAmount', internalType: 'uint256', type: 'uint256', indexed: false },
    ],
    name: 'Deposit',
  },
  { type: 'event', anonymous: false, inputs: [], name: 'EIP712DomainChanged' },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'user', internalType: 'address', type: 'address', indexed: true },
      { name: 'newLevel', internalType: 'uint8', type: 'uint8', indexed: false },
    ],
    name: 'MemberLevelUpgraded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'user', internalType: 'address', type: 'address', indexed: true },
      { name: 'principalRefunded', internalType: 'uint256', type: 'uint256', indexed: false },
      { name: 'bonusReturned', internalType: 'uint256', type: 'uint256', indexed: false },
    ],
    name: 'Refund',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [{ name: 'timestamp', internalType: 'uint256', type: 'uint256', indexed: false }],
    name: 'StoreClosed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'tierId', internalType: 'uint256', type: 'uint256', indexed: true },
      { name: 'depositAmount', internalType: 'uint256', type: 'uint256', indexed: false },
      { name: 'creditAmount', internalType: 'uint256', type: 'uint256', indexed: false },
      { name: 'validUntil', internalType: 'uint64', type: 'uint64', indexed: false },
      { name: 'requiredLevel', internalType: 'uint8', type: 'uint8', indexed: false },
      { name: 'grantsLevel', internalType: 'uint8', type: 'uint8', indexed: false },
    ],
    name: 'TierAdded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [{ name: 'tierId', internalType: 'uint256', type: 'uint256', indexed: true }],
    name: 'TierDisabled',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'merchant', internalType: 'address', type: 'address', indexed: true },
      { name: 'withdrawAmount', internalType: 'uint256', type: 'uint256', indexed: false },
    ],
    name: 'Withdraw',
  },
  { type: 'error', inputs: [], name: 'AlreadyClosed' },
  {
    type: 'error',
    inputs: [
      { name: 'needed', internalType: 'uint256', type: 'uint256' },
      { name: 'available', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'InsufficientBonusPool',
  },
  {
    type: 'error',
    inputs: [
      { name: 'requested', internalType: 'uint256', type: 'uint256' },
      { name: 'available', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'InsufficientCredit',
  },
  {
    type: 'error',
    inputs: [
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'currentNonce', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'InvalidAccountNonce',
  },
  { type: 'error', inputs: [], name: 'InvalidShortString' },
  { type: 'error', inputs: [], name: 'InvalidSignature' },
  {
    type: 'error',
    inputs: [
      { name: 'depositAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'creditAmount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'InvalidTier',
  },
  {
    type: 'error',
    inputs: [{ name: 'tierId', internalType: 'uint256', type: 'uint256' }],
    name: 'InvalidTierId',
  },
  {
    type: 'error',
    inputs: [{ name: 'validUntil', internalType: 'uint64', type: 'uint64' }],
    name: 'InvalidValidUntil',
  },
  {
    type: 'error',
    inputs: [
      { name: 'required', internalType: 'uint8', type: 'uint8' },
      { name: 'actual', internalType: 'uint8', type: 'uint8' },
    ],
    name: 'MemberLevelTooLow',
  },
  { type: 'error', inputs: [], name: 'NothingToRefund' },
  { type: 'error', inputs: [], name: 'NothingToWithdraw' },
  { type: 'error', inputs: [], name: 'OnlyMerchant' },
  { type: 'error', inputs: [], name: 'ReentrancyGuardReentrantCall' },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'SafeERC20FailedOperation',
  },
  {
    type: 'error',
    inputs: [{ name: 'deadline', internalType: 'uint256', type: 'uint256' }],
    name: 'SignatureExpired',
  },
  { type: 'error', inputs: [], name: 'StoreNotActive' },
  { type: 'error', inputs: [], name: 'StoreStillActive' },
  {
    type: 'error',
    inputs: [{ name: 'str', internalType: 'string', type: 'string' }],
    name: 'StringTooLong',
  },
  {
    type: 'error',
    inputs: [
      { name: 'tierId', internalType: 'uint256', type: 'uint256' },
      { name: 'validUntil', internalType: 'uint64', type: 'uint64' },
    ],
    name: 'TierExpired',
  },
  {
    type: 'error',
    inputs: [{ name: 'tierId', internalType: 'uint256', type: 'uint256' }],
    name: 'TierInactive',
  },
  { type: 'error', inputs: [], name: 'TierLengthMismatch' },
  { type: 'error', inputs: [], name: 'ZeroAddress' },
  { type: 'error', inputs: [], name: 'ZeroAmount' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// StoreDepositFactory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const storeDepositFactoryAbi = [
  {
    type: 'constructor',
    inputs: [{ name: '_usdcToken', internalType: 'address', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'allStoreContracts',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_expireDays', internalType: 'uint256', type: 'uint256' },
      { name: '_depositAmounts', internalType: 'uint256[]', type: 'uint256[]' },
      { name: '_creditAmounts', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    name: 'createStoreContract',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getAllStoreContracts',
    outputs: [{ name: '', internalType: 'address[]', type: 'address[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '_merchant', internalType: 'address', type: 'address' }],
    name: 'getMerchantContracts',
    outputs: [{ name: '', internalType: 'address[]', type: 'address[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'address', type: 'address' },
      { name: '', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'merchantContracts',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'usdcToken',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'merchant', internalType: 'address', type: 'address', indexed: true },
      { name: 'storeContract', internalType: 'address', type: 'address', indexed: true },
    ],
    name: 'StoreContractCreated',
  },
] as const
