// lib/copy/microcopy.ts
// Form labels, validation errors, empty states, notification templates,
// trade state descriptions, KYC upgrade instructions, low-trust warning,
// and dispute rationale placeholder copy.

// ─── Form Labels ──────────────────────────────────────────────────────────────

export const FORM_LABELS = {
  // Create Offer
  stablecoin: 'Stablecoin',
  amount: 'Amount',
  amountHint: 'Min 10 · Max 50,000',
  fiatCurrency: 'Fiat Currency',
  fiatRate: 'Rate (per unit)',
  paymentRails: 'Payment Methods',
  paymentRailsHint: 'Select at least one',

  // Auth / Profile
  walletAddress: 'Wallet Address',
  email: 'Email Address',
  emailHint: 'Used for trade notifications',

  // KYC
  kycDocument: 'Identity Document',
  kycDocumentHint: 'Passport, national ID, or driver\'s license',

  // Dispute
  disputeRationale: 'Rationale',
  disputeRationalePlaceholder:
    'Describe why you are disputing this trade. Include any evidence of non-payment or incorrect payment details. Minimum 20 characters.',

  // Proof upload
  proofFile: 'Payment Receipt',
  proofFileHint: 'JPEG, PNG, or PDF · Max 10 MB',

  // Risk config (admin)
  autoReleaseCutoff: 'Auto-Release Threshold',
  challengeWindowCutoff: 'Challenge Window Threshold',
  challengeWindowSeconds: 'Challenge Window Duration (seconds)',
} as const

// ─── Validation Errors ────────────────────────────────────────────────────────

export const VALIDATION_ERRORS = {
  // Offer
  amountRequired: 'Amount is required.',
  amountMin: 'Minimum offer amount is 10 USDT/USDC.',
  amountMax: 'Maximum offer amount is 50,000 USDT/USDC.',
  amountPositive: 'Amount must be greater than zero.',
  rateRequired: 'Rate is required.',
  ratePositive: 'Rate must be greater than zero.',
  railsRequired: 'Select at least one payment method.',
  stablecoinRequired: 'Select a stablecoin.',
  fiatCurrencyRequired: 'Select a fiat currency.',
  duplicateOffer: 'You already have an identical active offer. Please wait 60 seconds before resubmitting.',

  // Auth
  emailInvalid: 'Enter a valid email address.',
  signatureInvalid: 'Wallet signature verification failed. Please try again.',

  // Proof upload
  fileTooLarge: 'File exceeds the 10 MB limit.',
  fileTypeInvalid: 'Only JPEG, PNG, and PDF files are accepted.',
  fileRequired: 'Upload a payment receipt to continue.',

  // Dispute
  rationaleRequired: 'Rationale is required.',
  rationaleTooShort: 'Rationale must be at least 20 characters.',

  // KYC
  documentRequired: 'Upload an identity document to continue.',

  // Trade
  kycLimitExceeded: (requiredTier: number) =>
    `This trade exceeds your KYC limit. Upgrade to Tier ${requiredTier} to proceed.`,
  activeTradeLimitReached: 'You have reached the maximum number of active trades for your trust level.',
  offerHasActiveTrade: 'This offer has an active trade and cannot be cancelled.',
} as const

// ─── Empty States ─────────────────────────────────────────────────────────────

export const EMPTY_STATES = {
  offerBook: {
    title: 'No offers found',
    description: 'Try adjusting your filters or check back later.',
    cta: 'Create an Offer',
  },
  tradeHistory: {
    title: 'No trades yet',
    description: 'Accept an offer from the marketplace to get started.',
    cta: 'Browse Marketplace',
  },
  disputeQueue: {
    title: 'No cases assigned',
    description: 'You have no pending dispute cases. Check back soon.',
  },
  notifications: {
    title: 'All caught up',
    description: 'No new notifications.',
  },
  auditLog: {
    title: 'No audit entries',
    description: 'No log entries match the current filters.',
  },
  analytics: {
    title: 'No data yet',
    description: 'Load demo data to populate the charts.',
    cta: 'Load Demo Data',
  },
} as const

// ─── Notification Templates ───────────────────────────────────────────────────

export const NOTIFICATION_TEMPLATES: Record<string, (params?: Record<string, string>) => string> = {
  trade_created: () => 'Your trade has been created. Waiting for escrow funding.',
  trade_funded: () => 'Escrow funded. Send your fiat payment and upload proof.',
  buyer_marked_paid: () => 'Buyer has marked the trade as paid. Review the proof.',
  challenge_window_started: (p) =>
    `Challenge window started. You have ${p?.minutes ?? '30'} minutes to raise a dispute.`,
  challenge_window_expiring: () =>
    'Challenge window expires in 10 minutes. Raise a dispute now if needed.',
  trade_released: () => 'Trade complete. Funds have been released to the buyer.',
  trade_refunded: () => 'Trade refunded. Stablecoins have been returned to the seller.',
  dispute_raised: () => 'A dispute has been raised on this trade. A resolver will be assigned shortly.',
  resolver_assigned: (p) =>
    `Dispute case assigned to resolver ${p?.resolverAddress ?? 'a resolver'}. Expect a decision within 48 hours.`,
  case_resolved: (p) =>
    `Dispute resolved: ${p?.decision ?? 'decision made'}. ${p?.rationale ?? ''}`,
  escalated_to_admin: () =>
    'This dispute has been escalated to admin due to inactivity. Both parties have been notified.',
}

// ─── Trade State Descriptions ─────────────────────────────────────────────────

export const TRADE_STATE_DESCRIPTIONS: Record<string, { label: string; description: string; hint: string }> = {
  CREATED: {
    label: 'Created',
    description: 'Trade initiated, waiting for escrow funding.',
    hint: 'The seller needs to fund the escrow contract.',
  },
  FUNDED: {
    label: 'Funded',
    description: 'Stablecoins locked in escrow.',
    hint: 'Send your fiat payment and upload proof of payment.',
  },
  MARKED_PAID: {
    label: 'Paid',
    description: 'Buyer has marked fiat as sent.',
    hint: 'Challenge window is active. Raise a dispute if payment was not received.',
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    description: 'Proof is being reviewed manually.',
    hint: 'A resolver has been notified and will review the evidence.',
  },
  DISPUTED: {
    label: 'Disputed',
    description: 'Dispute raised — awaiting resolver decision.',
    hint: 'A resolver will review all evidence and make a binding decision.',
  },
  RELEASED: {
    label: 'Released',
    description: 'Trade complete. Funds released to buyer.',
    hint: 'Reputation scores have been updated.',
  },
  REFUNDED: {
    label: 'Refunded',
    description: 'Trade refunded. Stablecoins returned to seller.',
    hint: 'Reputation scores have been updated.',
  },
  CANCELLED: {
    label: 'Cancelled',
    description: 'Trade cancelled before funding.',
    hint: 'No funds were moved.',
  },
}

// ─── KYC Upgrade Instructions ─────────────────────────────────────────────────

export const KYC_UPGRADE = {
  title: 'Increase Your Trade Limit',
  description: 'Verify your identity to unlock higher trade amounts.',
  tiers: {
    0: {
      limit: '500 USDT/USDC per trade',
      requirement: 'Wallet connection only',
      upgradePrompt: 'Link your email to reach Tier 1.',
      upgradeAction: 'Link Email',
    },
    1: {
      limit: '2,000 USDT/USDC per trade',
      requirement: 'Email verified',
      upgradePrompt: 'Submit a government ID to reach Tier 2.',
      upgradeAction: 'Submit ID',
    },
    2: {
      limit: '10,000 USDT/USDC per trade',
      requirement: 'Government ID submitted',
      upgradePrompt: 'Awaiting admin approval for Tier 3.',
      upgradeAction: null,
    },
    3: {
      limit: '50,000 USDT/USDC per trade',
      requirement: 'Government ID verified by admin',
      upgradePrompt: null,
      upgradeAction: null,
    },
  },
} as const

// ─── Low-Trust Warning ────────────────────────────────────────────────────────

export const LOW_TRUST_WARNING = {
  title: 'Low Trust Account',
  description:
    'Your reputation score is below 200. You are limited to 1 active trade at a time. Complete trades successfully to improve your score.',
  badge: 'Low Trust',
  hint: 'Reputation improves with each successfully completed trade.',
} as const

// ─── Proof Upload Copy ────────────────────────────────────────────────────────

export const PROOF_UPLOAD = {
  dragDropLabel: 'Drag & drop your receipt here',
  orLabel: 'or',
  browseLabel: 'Browse files',
  acceptedFormats: 'JPEG, PNG, PDF · Max 10 MB',
  uploadingLabel: 'Uploading…',
  processingLabel: 'Processing receipt…',
  successLabel: 'Receipt uploaded',
  hashLabel: 'Evidence Hash',
  hashHint: 'SHA-256 hash of your original file, stored on-chain.',
} as const

// ─── Dispute Copy ─────────────────────────────────────────────────────────────

export const DISPUTE_COPY = {
  raiseTitle: 'Raise a Dispute',
  raiseDescription:
    'Only raise a dispute if you have not received the fiat payment or the amount is incorrect. Frivolous disputes may affect your reputation score.',
  raiseConfirm: 'Raise Dispute',
  raiseCancel: 'Cancel',
  resolveTitle: 'Resolve Dispute',
  releaseLabel: 'Release to Buyer',
  refundLabel: 'Refund to Seller',
  rationaleLabel: 'Written Rationale',
  rationalePlaceholder:
    'Provide a clear explanation for your decision. Reference specific evidence from the proof and OCR results. Minimum 20 characters.',
  conflictOfInterestError:
    'You cannot resolve a dispute where you are a trade participant.',
  escalatedBadge: 'Escalated to Admin',
  pendingBadge: 'Awaiting Decision',
} as const
