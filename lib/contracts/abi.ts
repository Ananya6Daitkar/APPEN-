/**
 * APPENEscrow contract ABI — sourced from compiled artifact.
 * Req 2.2, 3.2–3.7
 */
export const APPEN_ESCROW_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'admin', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  // ── Errors ──────────────────────────────────────────────────────────────────
  { inputs: [], name: 'AccessControlBadConfirmation', type: 'error' },
  {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'bytes32', name: 'neededRole', type: 'bytes32' },
    ],
    name: 'AccessControlUnauthorizedAccount',
    type: 'error',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'tradeId', type: 'bytes32' },
      { internalType: 'uint256', name: 'expiresAt', type: 'uint256' },
    ],
    name: 'ChallengeWindowActive',
    type: 'error',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'tradeId', type: 'bytes32' },
      { internalType: 'uint256', name: 'expiredAt', type: 'uint256' },
    ],
    name: 'ChallengeWindowExpired',
    type: 'error',
  },
  {
    inputs: [
      { internalType: 'address', name: 'resolver', type: 'address' },
      { internalType: 'bytes32', name: 'tradeId', type: 'bytes32' },
    ],
    name: 'ConflictOfInterest',
    type: 'error',
  },
  { inputs: [], name: 'EnforcedPause', type: 'error' },
  { inputs: [], name: 'ExpectedPause', type: 'error' },
  {
    inputs: [
      { internalType: 'bytes32', name: 'tradeId', type: 'bytes32' },
      { internalType: 'uint256', name: 'unlocksAt', type: 'uint256' },
    ],
    name: 'FundedTimeoutNotReached',
    type: 'error',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'tradeId', type: 'bytes32' },
      { internalType: 'uint8', name: 'current', type: 'uint8' },
      { internalType: 'uint8', name: 'required', type: 'uint8' },
    ],
    name: 'InvalidState',
    type: 'error',
  },
  { inputs: [], name: 'ReentrancyGuardReentrantCall', type: 'error' },
  {
    inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
    name: 'SafeERC20FailedOperation',
    type: 'error',
  },
  {
    inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
    name: 'TokenNotWhitelisted',
    type: 'error',
  },
  {
    inputs: [{ internalType: 'address', name: 'caller', type: 'address' }],
    name: 'Unauthorized',
    type: 'error',
  },
  { inputs: [], name: 'ZeroAmount', type: 'error' },
  // ── Events ───────────────────────────────────────────────────────────────────
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'tradeId', type: 'bytes32' },
      { indexed: true, internalType: 'address', name: 'seller', type: 'address' },
      { indexed: true, internalType: 'address', name: 'buyer', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'EscrowCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'tradeId', type: 'bytes32' },
      { indexed: true, internalType: 'address', name: 'recipient', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'FundsRefunded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'tradeId', type: 'bytes32' },
      { indexed: true, internalType: 'address', name: 'recipient', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'FundsReleased',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: false, internalType: 'address', name: 'account', type: 'address' }],
    name: 'Paused',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'tradeId', type: 'bytes32' },
      { indexed: false, internalType: 'uint8', name: 'from', type: 'uint8' },
      { indexed: false, internalType: 'uint8', name: 'to', type: 'uint8' },
      { indexed: false, internalType: 'address', name: 'actor', type: 'address' },
    ],
    name: 'StateMachineTransition',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: false, internalType: 'address', name: 'account', type: 'address' }],
    name: 'Unpaused',
    type: 'event',
  },
  // ── Functions ────────────────────────────────────────────────────────────────
  {
    inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
    name: 'addWhitelistedToken',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'tradeId', type: 'bytes32' }],
    name: 'cancel',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'stablecoin', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'address', name: 'buyer', type: 'address' },
      { internalType: 'uint256', name: 'challengeWindowSeconds', type: 'uint256' },
    ],
    name: 'createEscrow',
    outputs: [{ internalType: 'bytes32', name: 'tradeId', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'tradeId', type: 'bytes32' }],
    name: 'dispute',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'tradeId', type: 'bytes32' }],
    name: 'getTradeState',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'tradeId', type: 'bytes32' }],
    name: 'markPaid',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'paused',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'tradeId', type: 'bytes32' }],
    name: 'refund',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'tradeId', type: 'bytes32' }],
    name: 'refundExpired',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'tradeId', type: 'bytes32' }],
    name: 'release',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'tradeId', type: 'bytes32' }],
    name: 'trades',
    outputs: [
      { internalType: 'address', name: 'seller', type: 'address' },
      { internalType: 'address', name: 'buyer', type: 'address' },
      { internalType: 'address', name: 'resolver', type: 'address' },
      { internalType: 'address', name: 'stablecoin', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint8', name: 'state', type: 'uint8' },
      { internalType: 'uint256', name: 'createdAt', type: 'uint256' },
      { internalType: 'uint256', name: 'markedPaidAt', type: 'uint256' },
      { internalType: 'uint256', name: 'challengeWindowSeconds', type: 'uint256' },
      { internalType: 'uint256', name: 'challengeExpiresAt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'whitelistedTokens',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const
