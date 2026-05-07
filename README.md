# APPEN — Adaptive Proof-of-Payment Escrow Network

> **Hackathon submission** · Non-custodial P2P fiat-to-stablecoin escrow with AI proof verification, on-chain reputation, and structured dispute resolution.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.x-363636?logo=solidity)](https://soliditylang.org)
[![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-audited-4E5EE4)](https://openzeppelin.com)
[![Base Sepolia](https://img.shields.io/badge/Base-Sepolia-0052FF)](https://base.org)

---

## The Problem

Every P2P crypto trade has a trust gap on the fiat side. When a buyer sends a bank transfer, there's no cryptographic proof — just a screenshot that's easy to fake. Existing platforms rely on manual review (slow, biased) or blind trust (risky).

**APPEN solves this with three layers:**

1. **Non-custodial escrow** — seller locks USDC/USDT in a smart contract; funds never touch the platform
2. **AI proof verification** — OCR extracts structured data from payment receipts; a risk engine scores confidence 0–100
3. **Structured arbitration** — borderline trades get a human resolver with a full evidence bundle + AI pre-assessment

High-confidence proofs auto-release in seconds. Borderline proofs enter a challenge window. Low-confidence proofs go to a resolver. Every action is logged to a chained, tamper-evident audit trail.

---

## What's Built

### Smart Contracts (Hardhat + OpenZeppelin)
- `APPENEscrow.sol` — 8-state machine: Created → Funded → MarkedPaid → UnderReview → Disputed → Released / Refunded / Cancelled
- SafeERC20, ReentrancyGuard, AccessControl, Pausable
- Events on every state transition, 24h funded timeout, configurable challenge window
- 90%+ test coverage · Deployed to Base Sepolia + Polygon Mumbai

### Backend (Next.js API Routes + Prisma)
- SIWE wallet auth with JWT session cookies
- Offer book with duplicate detection, pagination, filters
- Trade lifecycle state machine with KYC tier limits
- Proof upload — SHA-256 hashing, AES-256 encryption, S3/MinIO
- Modular OCR engine — OpenAI Vision + Mock fallback
- Risk scoring — weighted formula (amount match, timestamp, KYC tier, dispute rates)
- Reputation service, dispute management, round-robin resolver assignment
- SSE real-time push, chained SHA-256 audit log

### Frontend (Next.js 15 + Framer Motion + React Three Fiber)
| Page | URL |
|---|---|
| Landing — 3D orbit, corridor map, how it works | `/` |
| Offers Marketplace | `/marketplace` |
| Create Offer | `/create-offer` |
| Trade Detail — state timeline, proof upload, OCR results | `/trade/[id]` |
| Dispute Center — case queue, evidence bundle | `/disputes` |
| Dispute Detail — AI pre-assessment, resolver form | `/disputes/[id]` |
| Merchant Profile | `/profile/[address]` |
| Trust Leaderboard | `/leaderboard` |
| Admin Dashboard — metrics, risk config, chain visualizer | `/admin` |
| Analytics + Demo Mode | `/analytics` |

### Add-ons (Hackathon Extras)
- **AI Dispute Pre-Assessment** — GPT-4o analyzes evidence, returns verdict + confidence arc + typewriter reasoning
- **Live Tx Links** — every on-chain action shows a Basescan/Polygonscan link with live confirmation status
- **Demo Control Panel** — floating panel to auto-walk all 8 trade states with confetti on release
- **Trust Leaderboard** — animated podium + rank table with score rings
- **Audit Chain Visualizer** — block-by-block chain view with hash integrity check

---

## Quick Start (5 minutes)

### Prerequisites
- Node.js 18+ · Docker · Git

### 1. Clone + install
```bash
git clone https://github.com/your-org/appen-p2p-escrow
cd appen-p2p-escrow
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# DEMO_MODE=true is already set — no API keys needed for demo
```

### 3. Start infrastructure
```bash
docker compose up -d
```

### 4. Migrate + seed
```bash
npx prisma migrate dev
npx prisma db seed
```

### 5. Run
```bash
npm run dev
# → http://localhost:3000
```

### 6. Load demo data
Open `http://localhost:3000/api/analytics/demo-seed` once to populate charts and offers.

---

## Demo Mode

`DEMO_MODE=true` bypasses all external dependencies:

| Feature | Demo behavior |
|---|---|
| Blockchain calls | Mock tx hashes returned instantly |
| OCR processing | MockOCRProvider with realistic fake data |
| Email delivery | Logged to console |
| SIWE verification | Accepts any wallet signature |
| AI assessment | Deterministic mock based on trust score |

**Connect any MetaMask wallet** — no testnet funds needed. The Demo Control Panel (bottom-left) lets judges walk through all 8 trade states in one click.

---

## Demo Wallets (pre-seeded)

| Role | Address |
|---|---|
| Buyer (KYC Tier 1) | `0xBuyer1111111111111111111111111111111111` |
| Seller (KYC Tier 2) | `0xSeller222222222222222222222222222222222` |
| Resolver | `0xResolver33333333333333333333333333333` |
| Admin | `0xAdmin4444444444444444444444444444444444` |

---

## 3-Minute Demo Script

```
0:00  Landing page — 3D orbit, scroll to corridor map
0:20  Connect wallet → marketplace → accept an offer
0:40  Trade detail — upload demo receipt from public/demo/
1:00  Watch OCR extract fields + trust score animate to 85 → auto-release
1:20  Open a pre-seeded disputed trade → disputes page
1:40  Dispute detail — AI pre-assessment card loads (verdict + confidence arc)
2:00  Resolver submits decision → confetti 🎉
2:20  Admin dashboard — metrics, risk config sliders, chain visualizer
2:40  Analytics page — 5 charts, leaderboard, demo walkthrough panel
3:00  "APPEN: non-custodial escrow, AI-verified proofs, on-chain reputation."
```

---

## Environment Variables

```env
DATABASE_URL="postgresql://appen:appen_secret@localhost:5432/appen"
REDIS_URL="redis://localhost:6379"
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET="appen-proofs"
JWT_SECRET="dev-secret-min-32-chars-long!!!"
OPENAI_API_KEY=""          # optional — MockOCRProvider used in DEMO_MODE
DEMO_MODE="true"
NEXT_PUBLIC_DEMO_MODE="true"
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=""
NEXT_PUBLIC_CHAIN_ID="84532"
```

---

## Smart Contract Deployment

```bash
# Base Sepolia
npx hardhat run scripts/deploy.ts --network baseSepolia

# Polygon Mumbai
npx hardhat run scripts/deploy.ts --network polygonMumbai

# Tests
npx hardhat test
npx hardhat coverage   # target ≥90%
```

---

## Project Structure

```
appen-p2p-escrow/
├── app/                    # Next.js 15 pages + API routes
│   ├── api/                # auth, offers, trades, disputes, admin, leaderboard
│   ├── leaderboard/        # Trust leaderboard page
│   ├── disputes/[id]/      # Dispute detail + AI pre-assessment
│   └── ...                 # 9 other pages
├── components/
│   ├── TxLink.tsx          # Live transaction status pill
│   ├── DemoControlPanel.tsx # Floating demo controls
│   ├── dispute/AIPreAssessment.tsx
│   ├── admin/AuditChainView.tsx
│   └── ...
├── contracts/              # Hardhat — APPENEscrow.sol, MockERC20.sol
├── lib/                    # OCR, risk scoring, reputation, audit, auth
├── prisma/                 # Schema + migrations + seed
├── public/demo/            # Mock receipt images
└── docker-compose.yml
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Framer Motion, React Three Fiber |
| Web3 | wagmi v2, viem, RainbowKit, WalletConnect |
| Smart Contracts | Solidity 0.8.x, OpenZeppelin, Hardhat |
| Backend | Next.js API Routes, Prisma ORM, PostgreSQL |
| Cache | Redis |
| Real-time | Server-Sent Events (SSE) |
| AI / OCR | OpenAI GPT-4o Vision (modular — swappable) |
| Storage | S3-compatible (MinIO locally, AWS S3 in production) |
| Auth | SIWE (Sign-In with Ethereum), JWT |

---

## License

MIT — built for hackathon demonstration purposes.
# APPEN-
# APPEN-
