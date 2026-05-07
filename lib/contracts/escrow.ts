/**
 * APPENEscrow contract hooks — wagmi v2 / viem.
 * All write functions return a tx hash (`0x${string}`).
 * When DEMO_MODE=true, mock tx hashes are returned without chain calls.
 *
 * Req 2.2, 3.2–3.7
 */
'use client'

import { useWriteContract } from 'wagmi'
import { APPEN_ESCROW_ABI } from './abi'

// ── Config ────────────────────────────────────────────────────────────────────

export const ESCROW_CONTRACT_ADDRESS = (
  process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS ??
  process.env.NEXT_PUBLIC_ESCROW_ADDRESS ??
  '0x0000000000000000000000000000000000000000'
) as `0x${string}`

const DEMO_MODE =
  process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
  process.env.DEMO_MODE === 'true'

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockTxHash(): `0x${string}` {
  const hex = Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('')
  return `0x${hex}` as `0x${string}`
}

async function demoDelay(ms = 800) {
  await new Promise((r) => setTimeout(r, ms))
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * `useEscrowContract` — returns typed wrappers for every APPENEscrow write function.
 *
 * Usage:
 * ```ts
 * const { createEscrow, markPaid, dispute, release, refund, cancel } = useEscrowContract()
 * const txHash = await createEscrow(stablecoin, amount, buyer, challengeWindowSeconds)
 * ```
 */
export function useEscrowContract() {
  const { writeContractAsync } = useWriteContract()

  /**
   * Lock stablecoins and create an escrow trade.
   * @returns bytes32 tradeId encoded as the tx hash (live) or mock hash (demo)
   */
  async function createEscrow(
    stablecoin: `0x${string}`,
    amount: bigint,
    buyer: `0x${string}`,
    challengeWindowSeconds: bigint
  ): Promise<`0x${string}`> {
    if (DEMO_MODE) {
      await demoDelay()
      return mockTxHash()
    }

    return writeContractAsync({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: APPEN_ESCROW_ABI,
      functionName: 'createEscrow',
      args: [stablecoin, amount, buyer, challengeWindowSeconds],
    })
  }

  /**
   * Buyer marks fiat payment as sent — starts the challenge window.
   */
  async function markPaid(tradeId: `0x${string}`): Promise<`0x${string}`> {
    if (DEMO_MODE) {
      await demoDelay()
      return mockTxHash()
    }

    return writeContractAsync({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: APPEN_ESCROW_ABI,
      functionName: 'markPaid',
      args: [tradeId],
    })
  }

  /**
   * Seller raises a dispute during the challenge window.
   */
  async function dispute(tradeId: `0x${string}`): Promise<`0x${string}`> {
    if (DEMO_MODE) {
      await demoDelay()
      return mockTxHash()
    }

    return writeContractAsync({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: APPEN_ESCROW_ABI,
      functionName: 'dispute',
      args: [tradeId],
    })
  }

  /**
   * Resolver (or auto-release) releases funds to the buyer.
   */
  async function release(tradeId: `0x${string}`): Promise<`0x${string}`> {
    if (DEMO_MODE) {
      await demoDelay()
      return mockTxHash()
    }

    return writeContractAsync({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: APPEN_ESCROW_ABI,
      functionName: 'release',
      args: [tradeId],
    })
  }

  /**
   * Resolver refunds locked funds back to the seller.
   */
  async function refund(tradeId: `0x${string}`): Promise<`0x${string}`> {
    if (DEMO_MODE) {
      await demoDelay()
      return mockTxHash()
    }

    return writeContractAsync({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: APPEN_ESCROW_ABI,
      functionName: 'refund',
      args: [tradeId],
    })
  }

  /**
   * Seller cancels an escrow with no active trade (returns funds).
   */
  async function cancel(tradeId: `0x${string}`): Promise<`0x${string}`> {
    if (DEMO_MODE) {
      await demoDelay()
      return mockTxHash()
    }

    return writeContractAsync({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: APPEN_ESCROW_ABI,
      functionName: 'cancel',
      args: [tradeId],
    })
  }

  /**
   * Refund an escrow that has been in Funded state past the 24h timeout.
   */
  async function refundExpired(tradeId: `0x${string}`): Promise<`0x${string}`> {
    if (DEMO_MODE) {
      await demoDelay()
      return mockTxHash()
    }

    return writeContractAsync({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: APPEN_ESCROW_ABI,
      functionName: 'refundExpired',
      args: [tradeId],
    })
  }

  return { createEscrow, markPaid, dispute, release, refund, cancel, refundExpired }
}
