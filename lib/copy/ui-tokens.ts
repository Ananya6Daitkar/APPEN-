// lib/copy/ui-tokens.ts
// UI display tokens: color maps, badge configs, labels, and display names.
// Import these wherever you need consistent visual treatment across components.

// ─── Trade State Color Map ────────────────────────────────────────────────────

export type TradeState =
  | 'CREATED'
  | 'FUNDED'
  | 'MARKED_PAID'
  | 'UNDER_REVIEW'
  | 'DISPUTED'
  | 'RELEASED'
  | 'REFUNDED'
  | 'CANCELLED'

export interface TradeStateToken {
  label: string
  /** Tailwind class string for text + border + bg */
  colorClasses: string
  /** Hex for non-Tailwind contexts (e.g. charts) */
  hex: string
  icon: string
}

export const TRADE_STATE_TOKENS: Record<TradeState, TradeStateToken> = {
  CREATED: {
    label: 'Created',
    colorClasses: 'text-slate-300 border-slate-600 bg-slate-700/30',
    hex: '#94A3B8',
    icon: '🕐',
  },
  FUNDED: {
    label: 'Funded',
    colorClasses: 'text-brand-blue border-brand-blue bg-brand-blue/20',
    hex: '#3B82F6',
    icon: 'LOCK',
  },
  MARKED_PAID: {
    label: 'Paid',
    colorClasses: 'text-brand-blue border-brand-blue bg-brand-blue/20',
    hex: '#3B82F6',
    icon: 'PAY',
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    colorClasses: 'text-brand-amber border-brand-amber bg-brand-amber/20',
    hex: '#F59E0B',
    icon: 'REVIEW',
  },
  DISPUTED: {
    label: 'Disputed',
    colorClasses: 'text-brand-violet border-brand-violet bg-brand-violet/20',
    hex: '#8B5CF6',
    icon: 'DISPUTE',
  },
  RELEASED: {
    label: 'Released',
    colorClasses: 'text-brand-emerald border-brand-emerald bg-brand-emerald/20',
    hex: '#10B981',
    icon: 'DONE',
  },
  REFUNDED: {
    label: 'Refunded',
    colorClasses: 'text-brand-amber border-brand-amber bg-brand-amber/20',
    hex: '#F59E0B',
    icon: 'REFUND',
  },
  CANCELLED: {
    label: 'Cancelled',
    colorClasses: 'text-slate-500 border-slate-600 bg-slate-700/30',
    hex: '#64748B',
    icon: '✕',
  },
}

// ─── Risk Recommendation Badge Tokens ────────────────────────────────────────

export type RiskRecommendation = 'auto_release' | 'challenge_window' | 'manual_review'

export interface RecommendationToken {
  label: string
  colorClasses: string
  hex: string
  icon: string
  description: string
}

export const RECOMMENDATION_TOKENS: Record<RiskRecommendation, RecommendationToken> = {
  auto_release: {
    label: 'Auto-Release',
    colorClasses: 'text-brand-emerald border-brand-emerald bg-brand-emerald/20',
    hex: '#10B981',
    icon: '✅',
    description: 'Trust score ≥ 80. Funds will be released automatically.',
  },
  challenge_window: {
    label: 'Challenge Window',
    colorClasses: 'text-brand-blue border-brand-blue bg-brand-blue/20',
    hex: '#3B82F6',
    icon: '⏱',
    description: 'Trust score 50–79. Seller has a window to raise a dispute.',
  },
  manual_review: {
    label: 'Manual Review',
    colorClasses: 'text-brand-amber border-brand-amber bg-brand-amber/20',
    hex: '#F59E0B',
    icon: '🔍',
    description: 'Trust score < 50. A resolver will review the evidence.',
  },
}

// ─── KYC Tier Tokens ──────────────────────────────────────────────────────────

export type KYCTier = 0 | 1 | 2 | 3

export interface KYCTierToken {
  label: string
  shortLabel: string
  colorClasses: string
  hex: string
  tradeLimit: string
  tradeLimitNumber: number
}

export const KYC_TIER_TOKENS: Record<KYCTier, KYCTierToken> = {
  0: {
    label: 'Unverified',
    shortLabel: 'Tier 0',
    colorClasses: 'text-slate-400 border-slate-600 bg-slate-700/50',
    hex: '#94A3B8',
    tradeLimit: '500 USDT/USDC',
    tradeLimitNumber: 500,
  },
  1: {
    label: 'Email Verified',
    shortLabel: 'Tier 1',
    colorClasses: 'text-brand-blue border-brand-blue bg-brand-blue/20',
    hex: '#3B82F6',
    tradeLimit: '2,000 USDT/USDC',
    tradeLimitNumber: 2000,
  },
  2: {
    label: 'ID Submitted',
    shortLabel: 'Tier 2',
    colorClasses: 'text-brand-amber border-brand-amber bg-brand-amber/20',
    hex: '#F59E0B',
    tradeLimit: '10,000 USDT/USDC',
    tradeLimitNumber: 10000,
  },
  3: {
    label: 'KYC Verified',
    shortLabel: 'Tier 3',
    colorClasses: 'text-brand-emerald border-brand-emerald bg-brand-emerald/20',
    hex: '#10B981',
    tradeLimit: '50,000 USDT/USDC',
    tradeLimitNumber: 50000,
  },
}

// ─── Reputation Tier Tokens ───────────────────────────────────────────────────

export interface ReputationTierToken {
  label: string
  colorClasses: string
  hex: string
  minScore: number
  maxScore: number
}

export const REPUTATION_TIERS: ReputationTierToken[] = [
  {
    label: 'Low Trust',
    colorClasses: 'text-brand-red border-brand-red bg-brand-red/20',
    hex: '#EF4444',
    minScore: 0,
    maxScore: 199,
  },
  {
    label: 'Building',
    colorClasses: 'text-brand-amber border-brand-amber bg-brand-amber/20',
    hex: '#F59E0B',
    minScore: 200,
    maxScore: 499,
  },
  {
    label: 'Trusted',
    colorClasses: 'text-brand-blue border-brand-blue bg-brand-blue/20',
    hex: '#3B82F6',
    minScore: 500,
    maxScore: 749,
  },
  {
    label: 'Highly Trusted',
    colorClasses: 'text-brand-emerald border-brand-emerald bg-brand-emerald/20',
    hex: '#10B981',
    minScore: 750,
    maxScore: 1000,
  },
]

export function getReputationTier(score: number): ReputationTierToken {
  return (
    REPUTATION_TIERS.find((t) => score >= t.minScore && score <= t.maxScore) ??
    REPUTATION_TIERS[0]
  )
}

// ─── Payment Rail Display Names ───────────────────────────────────────────────

export const PAYMENT_RAIL_NAMES: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  mobile_money: 'Mobile Money',
  wire_transfer: 'Wire Transfer',
  cash_deposit: 'Cash Deposit',
  sepa: 'SEPA',
  ach: 'ACH',
  faster_payments: 'Faster Payments',
  upi: 'UPI',
  pix: 'PIX',
  mpesa: 'M-Pesa',
}

/** Returns the display name for a rail key, falling back to the raw key. */
export function getRailLabel(railKey: string): string {
  return PAYMENT_RAIL_NAMES[railKey] ?? railKey
}

// ─── Stablecoin Display Names ─────────────────────────────────────────────────

export type Stablecoin = 'USDC' | 'USDT'

export interface StablecoinToken {
  symbol: string
  name: string
  /** Tailwind color class for the symbol chip */
  colorClasses: string
  hex: string
  decimals: number
}

export const STABLECOIN_TOKENS: Record<Stablecoin, StablecoinToken> = {
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    colorClasses: 'text-brand-blue border-brand-blue bg-brand-blue/20',
    hex: '#3B82F6',
    decimals: 6,
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    colorClasses: 'text-brand-emerald border-brand-emerald bg-brand-emerald/20',
    hex: '#10B981',
    decimals: 6,
  },
}

// ─── Audit Action Type Labels ─────────────────────────────────────────────────

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  USER_CREATED: 'User Created',
  SESSION_CREATED: 'Session Created',
  SESSION_INVALIDATED: 'Session Invalidated',
  OFFER_CREATED: 'Offer Created',
  OFFER_CANCELLED: 'Offer Cancelled',
  TRADE_CREATED: 'Trade Created',
  TRADE_STATE_CHANGED: 'Trade State Changed',
  PROOF_UPLOADED: 'Proof Uploaded',
  OCR_COMPLETED: 'OCR Completed',
  RISK_SCORED: 'Risk Scored',
  DISPUTE_CREATED: 'Dispute Created',
  DISPUTE_ASSIGNED: 'Dispute Assigned',
  DISPUTE_RESOLVED: 'Dispute Resolved',
  REPUTATION_UPDATED: 'Reputation Updated',
  KYC_SUBMITTED: 'KYC Submitted',
  KYC_APPROVED: 'KYC Approved',
  USER_SUSPENDED: 'User Suspended',
  RISK_CONFIG_CHANGED: 'Risk Config Changed',
  NOTIFICATION_FAILED: 'Notification Failed',
  AUDIT_WRITE_FAILED: 'Audit Write Failed',
}
