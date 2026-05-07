/**
 * Demo wallet addresses and helper utilities for DEMO_MODE.
 * These are well-known Hardhat/Anvil test accounts — no real funds.
 * Req 11.2, 11.4
 */

export const DEMO_WALLETS = {
  buyer:    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  seller:   '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  resolver: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  admin:    '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
} as const

export type DemoRole = keyof typeof DEMO_WALLETS

/**
 * Returns a minimal session-like object for a demo wallet.
 * Useful in DEMO_MODE API routes that need a pre-authenticated session.
 */
export function getDemoSession(role: DemoRole = 'buyer') {
  return {
    address: DEMO_WALLETS[role],
    role,
    isDemo: true,
  }
}
