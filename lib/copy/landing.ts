// lib/copy/landing.ts
// All static copy for the landing page sections

export const HERO = {
  badge: 'Non-custodial · AI-verified · On-chain reputation',
  headline: 'P2P Trading',
  headlineHighlight: 'Without Trust Issues',
  subheadline:
    'Lock stablecoins in self-custodial escrow. Upload your payment receipt. AI verifies it instantly. Funds release automatically — no middleman needed.',
  ctaPrimary: 'Launch App',
  ctaSecondary: 'View Demo',
  trustBadges: [
    '✓ OpenZeppelin audited',
    '✓ Base Sepolia',
    '✓ Polygon Mumbai',
  ],
} as const

export const PROBLEMS = {
  sectionTitle: 'The Problem with P2P Today',
  sectionSubtitle: 'Every P2P trade carries hidden risks. APPEN eliminates them systematically.',
  items: [
    {
      icon: '🔓',
      title: 'The Trust Gap',
      description:
        'P2P crypto trades require trusting a stranger with your money. One party always has to go first — and hope the other follows through.',
    },
    {
      icon: '🧾',
      title: 'Fiat is Unverifiable',
      description:
        'Bank transfers and mobile money receipts are easy to fake. Existing platforms rely on manual review, creating delays and fraud risk.',
    },
    {
      icon: '⚖️',
      title: 'Manual Disputes',
      description:
        "When trades go wrong, resolution is slow, opaque, and often biased. There's no structured evidence trail or accountable arbitration.",
    },
  ],
} as const

export const HOW_IT_WORKS = {
  sectionTitle: 'How It Works',
  sectionSubtitle: 'Five steps from offer to settlement — fully automated.',
  steps: [
    {
      icon: '🔒',
      title: 'Lock',
      description: 'Seller locks USDC/USDT into non-custodial escrow smart contract.',
    },
    {
      icon: '💸',
      title: 'Send Fiat',
      description: 'Buyer sends fiat via bank transfer, mobile money, or any supported rail.',
    },
    {
      icon: '📄',
      title: 'Upload Proof',
      description: 'Buyer uploads payment receipt. SHA-256 hash stored on-chain immediately.',
    },
    {
      icon: '🤖',
      title: 'AI Verify',
      description: 'OCR engine extracts receipt data. Risk engine scores confidence 0–100.',
    },
    {
      icon: '✅',
      title: 'Release',
      description: 'High-confidence proofs auto-release. Disputes go to structured arbitration.',
    },
  ],
} as const

export const WHY_APPEN = {
  sectionTitle: 'Why APPEN?',
  sectionSubtitle: 'Built different from the ground up — not just another P2P exchange.',
  comparisons: [
    {
      icon: '🔐',
      feature: 'Custody',
      appen: 'Non-custodial smart contract',
      centralized: 'Platform holds your funds',
    },
    {
      icon: '🤖',
      feature: 'Proof Verification',
      appen: 'AI-verified OCR + risk scoring',
      centralized: 'Manual review (hours/days)',
    },
    {
      icon: '⭐',
      feature: 'Reputation',
      appen: 'On-chain, portable, tamper-proof',
      centralized: 'Siloed, platform-controlled',
    },
    {
      icon: '⚖️',
      feature: 'Disputes',
      appen: 'Structured arbitration + audit trail',
      centralized: 'Opaque, slow, biased',
    },
  ],
} as const

export const FAQ = {
  sectionTitle: 'Frequently Asked Questions',
  items: [
    {
      q: 'Is APPEN non-custodial?',
      a: 'Yes. Funds are locked in an audited smart contract. Neither APPEN nor any third party can access them — only the trade outcome determines release.',
    },
    {
      q: "What happens if the AI can't verify my receipt?",
      a: 'Low-confidence proofs enter a challenge window or manual review. A human resolver reviews the evidence and makes a binding decision.',
    },
    {
      q: 'How is my reputation calculated?',
      a: "Your on-chain reputation score (0–1000) increases with completed trades and decreases when you lose a dispute. It's portable and tamper-proof.",
    },
    {
      q: 'Which wallets are supported?',
      a: 'MetaMask, Coinbase Wallet, and any WalletConnect-compatible wallet.',
    },
    {
      q: 'What stablecoins are supported?',
      a: 'USDC and USDT on Base Sepolia and Polygon Mumbai testnets. Mainnet support is planned for production.',
    },
    {
      q: 'How long does dispute resolution take?',
      a: 'Resolvers are assigned within 15 minutes and must decide within 48 hours. Cases escalate to admin if unresolved.',
    },
  ],
} as const

export const CTA = {
  headline: 'Ready to trade without trust issues?',
  subheadline: 'Connect your wallet and start trading in under 60 seconds.',
  ctaPrimary: 'Launch App',
  ctaSecondary: 'View Demo',
  trustBadges: ['OpenZeppelin', 'Base Sepolia', 'Polygon Mumbai', 'SIWE Auth'],
} as const

export const FOOTER = {
  copyright: '© 2025 APPEN — Adaptive Proof-of-Payment Escrow Network',
  links: [
    { href: '/marketplace', label: 'Marketplace' },
    { href: '/analytics', label: 'Analytics' },
    { href: '/admin', label: 'Admin' },
  ],
} as const

export const NAV = {
  logoText: 'APPEN',
  links: [
    { href: '/marketplace', label: 'Marketplace' },
    { href: '/create-offer', label: 'Create Offer' },
    { href: '/analytics', label: 'Analytics' },
  ],
} as const
