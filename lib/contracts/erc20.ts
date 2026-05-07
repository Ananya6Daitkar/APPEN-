/**
 * ERC20 approve hook for use before createEscrow.
 * Req 2.2
 */
'use client'

import { useWriteContract } from 'wagmi'

export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

const DEMO_MODE =
  process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
  process.env.DEMO_MODE === 'true'

function mockTxHash(): `0x${string}` {
  const hex = Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('')
  return `0x${hex}` as `0x${string}`
}

/**
 * Hook for ERC20 approve().
 * In DEMO_MODE returns a mock tx hash without hitting the chain.
 */
export function useERC20Approve() {
  const { writeContractAsync } = useWriteContract()

  async function approve(
    tokenAddress: `0x${string}`,
    spender: `0x${string}`,
    amount: bigint
  ): Promise<`0x${string}`> {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 600))
      return mockTxHash()
    }

    return writeContractAsync({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spender, amount],
    })
  }

  return { approve }
}
