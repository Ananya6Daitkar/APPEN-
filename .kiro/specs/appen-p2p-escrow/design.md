# APPEN P2P Escrow — Technical Design Document

## Overview

APPEN (Adaptive Proof-of-Payment Escrow Network) is a full-stack Web3 P2P fiat-to-stablecoin trading platform. It solves the fundamental trust gap in P2P crypto trading: the fiat leg is unverifiable on-chain. APPEN bridges this gap by combining non-custodial smart-contract escrow with an AI-assisted proof-of-payment pipeline, adaptive risk scoring, on-chain reputation, and structured human arbitration fallback.

### Core Value Proposition

- Sellers lock stablecoins (USDC/USDT) into a non-custodial escrow contract on Base or Polygon
- Buyers send fiat via any supported payment rail and upload a receipt
- The OCR Engine extracts structured data from the receipt; the Risk Engine scores it
- High-confidence proofs auto-release; borderline proofs enter a challenge window; low-confidence proofs route to a human Resolver
- Every action is logged to a chained Audit_Log; every state transition emits an on-chain event

### Technology Stack Summary

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, React Three Fiber |
| Web3 Client | wagmi v2, viem, RainbowKit, WalletConnect |
| Backend | NestJS (TypeScript), PostgreSQL, Prisma ORM |
| Queue | Redis + BullMQ |
| Real-time | Socket.io (WebSocket) |
| Smart Contracts | Solidity 0.8.x, OpenZeppelin, Hardhat / Foundry |
| AI / OCR | OpenAI Vision API (modular provider interface) |
| Storage | S3-compatible object storage (AWS S3 / MinIO) |
| Auth | SIWE (Sign-In with Ethereum), JWT |
| Deployment | Vercel (frontend), Railway/Render (backend), Base Sepolia / Polygon Mumbai |


---

## Architecture

### System Architecture Diagram

```mermaid
graph TB
    subgraph Client["Browser / Mobile"]
        FE["Next.js 15 Frontend"]
        W3["wagmi + RainbowKit"]
    end

    subgraph Blockchain["EVM Blockchain (Base Sepolia / Polygon Mumbai)"]
        ESC["APPENEscrow.sol"]
        ERC["MockERC20.sol (USDC/USDT)"]
    end

    subgraph Backend["NestJS Backend"]
        API["REST API Gateway"]
        WS["Socket.io WebSocket Server"]
        AUTH["AuthModule (SIWE + JWT)"]
        OFFERS["OffersModule"]
        TRADES["TradesModule"]
        PROOF["ProofModule"]
        OCR["OCRModule"]
        RISK["RiskModule"]
        REP["ReputationModule"]
        DISP["DisputeModule"]
        NOTIF["NotificationModule"]
        ADMIN["AdminModule"]
        ANALYTICS["AnalyticsModule"]
    end

    subgraph Workers["BullMQ Workers"]
        W1["ocr-extraction"]
        W2["risk-scoring"]
        W3W["notification-delivery"]
        W4["reputation-update"]
        W5["challenge-window-expiry"]
        W6["case-escalation"]
    end

    subgraph Storage["Persistence"]
        PG["PostgreSQL (Prisma)"]
        REDIS["Redis (Cache + Queue)"]
        S3["S3 Object Storage"]
    end

    subgraph External["External Services"]
        OPENAI["OpenAI Vision API"]
        EMAIL["Resend / SendGrid"]
        RPC["EVM RPC (Alchemy/Infura)"]
    end

    FE --> API
    FE --> WS
    W3 --> ESC
    W3 --> ERC
    API --> AUTH
    API --> OFFERS
    API --> TRADES
    API --> PROOF
    API --> DISP
    API --> ADMIN
    API --> ANALYTICS
    TRADES --> REDIS
    PROOF --> S3
    PROOF --> REDIS
    OCR --> OPENAI
    NOTIF --> EMAIL
    NOTIF --> WS
    Backend --> PG
    Backend --> REDIS
    Workers --> PG
    Workers --> REDIS
    Workers --> OCR
    Workers --> RISK
    Workers --> NOTIF
    Workers --> REP
    TRADES --> RPC
    ESC --> RPC
```

### Request Flow: Happy Path Trade

```mermaid
sequenceDiagram
    participant S as Seller
    participant B as Buyer
    participant FE as Frontend
    participant API as NestJS API
    participant ESC as APPENEscrow.sol
    participant Q as BullMQ
    participant OCR as OCR Engine
    participant RISK as Risk Engine

    S->>FE: Create Offer (amount, rate, rail)
    FE->>ESC: approve() + createEscrow()
    ESC-->>FE: EscrowCreated event
    FE->>API: POST /offers (txHash)
    API-->>S: Offer published

    B->>FE: Accept Offer
    FE->>API: POST /trades
    API-->>B: Trade created (Created state)
    B->>FE: Send fiat, upload proof
    FE->>API: POST /trades/:id/proof
    API->>Q: enqueue ocr-extraction
    Q->>OCR: extract(proofFile)
    OCR-->>Q: ProofExtraction JSON
    Q->>RISK: score(extraction, trade)
    RISK-->>Q: Trust_Score=85 → auto-release
    Q->>ESC: releaseFunds()
    ESC-->>B: USDC transferred
    API-->>B: Trade Released notification
```

### Deployment Architecture

```mermaid
graph LR
    subgraph Vercel
        NEXT["Next.js App"]
    end
    subgraph Railway
        NEST["NestJS API"]
        WORKER["BullMQ Workers"]
    end
    subgraph Managed
        PG2["PostgreSQL"]
        REDIS2["Redis"]
    end
    subgraph CDN
        S3B["S3 Bucket"]
    end

    NEXT --> NEST
    NEST --> PG2
    NEST --> REDIS2
    NEST --> S3B
    WORKER --> PG2
    WORKER --> REDIS2
```


---

## Components and Interfaces

### Frontend Component Tree

```
app/
├── (public)/
│   └── page.tsx                    # Landing page
├── marketplace/
│   └── page.tsx                    # Offers marketplace
├── trade/
│   └── [id]/
│       └── page.tsx                # Trade detail
├── create-offer/
│   └── page.tsx                    # Create offer form
├── profile/
│   └── [address]/
│       └── page.tsx                # Merchant profile
├── disputes/
│   ├── page.tsx                    # Dispute center
│   └── [id]/
│       └── page.tsx                # Dispute detail
├── admin/
│   └── page.tsx                    # Admin dashboard
├── resolver/
│   └── page.tsx                    # Resolver console
└── analytics/
    └── page.tsx                    # Analytics + demo mode

components/
├── landing/
│   ├── HeroSection.tsx             # 3D escrow orbit + headline
│   ├── EscrowOrbit3D.tsx           # React Three Fiber scene
│   ├── ProblemSection.tsx
│   ├── HowItWorks.tsx              # Animated step timeline
│   ├── WhyAPPEN.tsx                # Feature comparison cards
│   ├── SecuritySection.tsx
│   ├── CorridorMap.tsx             # Global fiat/stablecoin flow map
│   └── CTASection.tsx
├── marketplace/
│   ├── OfferBook.tsx               # Paginated offer list
│   ├── OfferCard.tsx               # Animated glassmorphism card
│   ├── OfferFilters.tsx
│   └── OfferPagination.tsx
├── trade/
│   ├── TradeStateTimeline.tsx      # Animated state machine viz
│   ├── ProofUploader.tsx           # Drag-drop file upload
│   ├── ProofStatus.tsx             # OCR + risk score display
│   ├── DisputeActions.tsx
│   └── ChatThread.tsx
├── dispute/
│   ├── EvidenceBundle.tsx
│   ├── AISummary.tsx
│   ├── ResolverActions.tsx
│   └── ProofViewer.tsx
├── admin/
│   ├── MetricsGrid.tsx
│   ├── UserManagement.tsx
│   ├── RiskConfigPanel.tsx
│   └── AuditLogTable.tsx
├── resolver/
│   ├── CaseQueue.tsx
│   ├── CaseDetail.tsx
│   └── DecisionForm.tsx
├── analytics/
│   ├── TradeVolumeChart.tsx
│   ├── TrustScoreHistogram.tsx
│   ├── DisputeRateChart.tsx
│   └── TopTradersLeaderboard.tsx
└── shared/
    ├── WalletConnectButton.tsx
    ├── Navbar.tsx
    ├── NotificationBell.tsx
    ├── ReputationBadge.tsx
    ├── KYCTierBadge.tsx
    └── GlassCard.tsx
```

### Theme Tokens

```typescript
// tailwind.config.ts
const theme = {
  colors: {
    brand: {
      blue:    '#3B82F6',   // neon blue
      emerald: '#10B981',   // success / released
      violet:  '#8B5CF6',   // accent / disputed
      amber:   '#F59E0B',   // warning / under review
      red:     '#EF4444',   // danger / refunded
    },
    glass: {
      bg:      'rgba(15, 23, 42, 0.7)',
      border:  'rgba(255, 255, 255, 0.08)',
    },
    surface: {
      900: '#0F172A',
      800: '#1E293B',
      700: '#334155',
    }
  }
}
```

### Animation Plan (Framer Motion)

| Component | Animation |
|---|---|
| EscrowOrbit3D | Continuous rotation, particle trails (R3F) |
| OfferCard | Hover lift + glow, mount stagger |
| TradeStateTimeline | Sequential reveal on state change |
| ProofUploader | Drag-over pulse, upload progress ring |
| MetricsGrid | Count-up on mount |
| CorridorMap | Animated flow lines between corridors |
| HowItWorks | Scroll-triggered step reveal |

### Backend Module Interfaces

```typescript
// AuthModule
interface SIWEVerifyDto {
  message: string;   // EIP-4361 message
  signature: string;
}
interface AuthSession {
  userId: string;
  walletAddress: string;
  kycTier: number;
  jwt: string;
}

// OffersModule
interface CreateOfferDto {
  stablecoin: 'USDC' | 'USDT';
  amount: number;          // 10–50000
  fiatCurrency: string;    // ISO 4217
  fiatRate: number;
  paymentRails: string[];
  txHash: string;          // on-chain lock tx
}

// TradesModule
interface CreateTradeDto {
  offerId: string;
}
interface MarkPaidDto {
  tradeId: string;
}

// ProofModule
interface ProofUploadResult {
  proofId: string;
  evidenceHash: string;    // SHA-256
  storageKey: string;      // S3 path
}

// OCRModule
interface ProofExtraction {
  tradeId: string;
  amount: number | null;
  currency: string | null;
  timestamp: string | null;       // ISO 8601
  transactionId: string | null;
  payerName: string | null;
  payeeName: string | null;
  paymentRail: string | null;
  bankName: string | null;
  fieldConfidences: Record<string, number>;  // 0–1 per field
  overallConfidence: number;                 // 0–1
  verificationStatus: 'verified' | 'needs_review' | 'suspicious';
  explanation: string;
  resolverSummary: string;
}

// RiskModule
interface RiskScoringInput {
  extraction: ProofExtraction;
  trade: Trade;
  buyerProfile: UserRiskProfile;
  sellerProfile: UserRiskProfile;
}
interface RiskScoringOutput {
  trustScore: number;          // 0–100
  recommendation: 'auto_release' | 'challenge_window' | 'manual_review';
  fraudFlags: FraudFlag[];
  subScores: Record<string, number>;
  auditPayload: object;
}

// DisputeModule
interface ResolveDisputeDto {
  caseId: string;
  decision: 'release' | 'refund';
  rationale: string;           // min 20 chars
}
```

### Smart Contract Interfaces

```solidity
// APPENEscrow.sol — public interface
interface IAPPENEscrow {
    // State enum
    enum TradeState {
        Created, Funded, MarkedPaid, UnderReview,
        Disputed, Released, Refunded, Cancelled
    }

    // Core lifecycle
    function createEscrow(
        address stablecoin,
        uint256 amount,
        address buyer,
        uint256 challengeWindowSeconds
    ) external returns (bytes32 tradeId);

    function markPaid(bytes32 tradeId) external;
    function dispute(bytes32 tradeId) external;
    function release(bytes32 tradeId) external;   // resolver or auto
    function refund(bytes32 tradeId) external;    // resolver or timeout
    function cancel(bytes32 tradeId) external;    // seller, no active trade

    // Admin
    function pause() external;
    function unpause() external;
    function addWhitelistedToken(address token) external;

    // Events
    event EscrowCreated(bytes32 indexed tradeId, address seller, address buyer, uint256 amount);
    event StateMachineTransition(bytes32 indexed tradeId, TradeState from, TradeState to, address actor);
    event FundsReleased(bytes32 indexed tradeId, address recipient, uint256 amount);
    event FundsRefunded(bytes32 indexed tradeId, address recipient, uint256 amount);
    event Paused(address admin, uint256 timestamp);
    event Unpaused(address admin, uint256 timestamp);
}
```

### REST API Contract

```
POST   /auth/verify                  SIWE verification → JWT
POST   /auth/link-email              Link email to wallet

GET    /offers                       List offers (paginated, filtered)
POST   /offers                       Create offer
DELETE /offers/:id                   Cancel offer

POST   /trades                       Accept offer → create trade
GET    /trades/:id                   Get trade detail
POST   /trades/:id/proof             Upload proof file
POST   /trades/:id/mark-paid         Buyer marks fiat sent
POST   /trades/:id/dispute           Seller raises dispute

GET    /disputes                     List disputes (resolver)
GET    /disputes/:id                 Get dispute detail + evidence bundle
POST   /disputes/:id/resolve         Resolver submits decision

GET    /users/:address/profile       Public merchant profile
GET    /users/me                     Authenticated user profile
POST   /users/me/kyc                 Submit KYC document

GET    /admin/metrics                Real-time platform metrics
GET    /admin/audit-log              Paginated audit log
POST   /admin/risk-config            Update Risk_Engine thresholds
POST   /admin/users/:id/suspend      Suspend user
POST   /admin/users/:id/kyc-approve  Approve KYC tier upgrade

GET    /analytics                    Aggregated analytics data
GET    /analytics/demo-seed          Load demo dataset

GET    /proofs/:tradeId/verify       Evidence hash verification
```

### WebSocket Events

```typescript
// Server → Client
'trade:state_changed'    // { tradeId, from, to, actor, timestamp }
'trade:proof_processed'  // { tradeId, trustScore, recommendation }
'dispute:assigned'       // { caseId, resolverId }
'dispute:resolved'       // { caseId, decision }
'notification:new'       // { notificationId, type, message }
'analytics:update'       // { metric, value, timestamp }

// Client → Server
'subscribe:trade'        // { tradeId }
'subscribe:notifications' // {}
```


---

## Data Models

### Prisma Schema

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ────────────────────────────────────────────────────────────────────

enum TradeState {
  CREATED
  FUNDED
  MARKED_PAID
  UNDER_REVIEW
  DISPUTED
  RELEASED
  REFUNDED
  CANCELLED
}

enum VerificationStatus {
  VERIFIED
  NEEDS_REVIEW
  SUSPICIOUS
}

enum DisputeDecision {
  RELEASE
  REFUND
  PENDING
}

enum NotificationChannel {
  IN_APP
  EMAIL
}

enum AuditActionType {
  USER_CREATED
  SESSION_CREATED
  SESSION_INVALIDATED
  OFFER_CREATED
  OFFER_CANCELLED
  TRADE_CREATED
  TRADE_STATE_CHANGED
  PROOF_UPLOADED
  OCR_COMPLETED
  RISK_SCORED
  DISPUTE_CREATED
  DISPUTE_ASSIGNED
  DISPUTE_RESOLVED
  REPUTATION_UPDATED
  KYC_SUBMITTED
  KYC_APPROVED
  USER_SUSPENDED
  RISK_CONFIG_CHANGED
  NOTIFICATION_FAILED
  AUDIT_WRITE_FAILED
}

// ─── User ─────────────────────────────────────────────────────────────────────

model User {
  id              String   @id @default(cuid())
  walletAddress   String   @unique
  email           String?  @unique
  emailVerified   Boolean  @default(false)
  kycTier         Int      @default(0)
  kycDocRef       String?  // encrypted reference, no raw doc
  isSuspended     Boolean  @default(false)
  suspendedAt     DateTime?
  suspendedBy     String?  // admin wallet address
  suspendReason   String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  reputation      Reputation?
  offersAsSeller  Offer[]         @relation("SellerOffers")
  tradesAsBuyer   Trade[]         @relation("BuyerTrades")
  tradesAsSeller  Trade[]         @relation("SellerTrades")
  resolverCases   ResolverCase[]
  notifications   Notification[]
  auditLogs       AuditLog[]      @relation("ActorLogs")
  riskScores      RiskScore[]
}

// ─── Reputation ───────────────────────────────────────────────────────────────

model Reputation {
  id              String   @id @default(cuid())
  userId          String   @unique
  score           Int      @default(500)   // 0–1000
  totalTrades     Int      @default(0)
  totalVolume     Decimal  @default(0)
  disputeCount    Int      @default(0)
  updatedAt       DateTime @updatedAt

  user            User     @relation(fields: [userId], references: [id])
  events          ReputationEvent[]
}

model ReputationEvent {
  id              String   @id @default(cuid())
  reputationId    String
  tradeId         String
  delta           Int
  reason          String
  createdAt       DateTime @default(now())

  reputation      Reputation @relation(fields: [reputationId], references: [id])
}

// ─── Offer ────────────────────────────────────────────────────────────────────

model Offer {
  id              String   @id @default(cuid())
  sellerId        String
  stablecoin      String   // 'USDC' | 'USDT'
  amount          Decimal
  fiatCurrency    String
  fiatRate        Decimal
  paymentRails    String[] // array of rail identifiers
  isActive        Boolean  @default(true)
  onChainId       String?  // bytes32 escrow ID from contract
  txHash          String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  seller          User     @relation("SellerOffers", fields: [sellerId], references: [id])
  trade           Trade?
}

// ─── Trade ────────────────────────────────────────────────────────────────────

model Trade {
  id              String     @id @default(cuid())
  offerId         String     @unique
  buyerId         String
  sellerId        String
  stablecoin      String
  amount          Decimal
  fiatCurrency    String
  fiatRate        Decimal
  state           TradeState @default(CREATED)
  onChainId       String?    // bytes32 from contract
  challengeWindowSeconds Int @default(1800)
  markedPaidAt    DateTime?
  challengeExpiresAt DateTime?
  releasedAt      DateTime?
  refundedAt      DateTime?
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  offer           Offer      @relation(fields: [offerId], references: [id])
  buyer           User       @relation("BuyerTrades", fields: [buyerId], references: [id])
  seller          User       @relation("SellerTrades", fields: [sellerId], references: [id])
  proofs          Proof[]
  dispute         Dispute?
  auditLogs       AuditLog[] @relation("TradeLogs")
}

// ─── Proof ────────────────────────────────────────────────────────────────────

model Proof {
  id              String   @id @default(cuid())
  tradeId         String
  uploaderId      String
  evidenceHash    String   // SHA-256 of original file
  storageKey      String   // S3 path (AES-256 encrypted at rest)
  mimeType        String
  fileSizeBytes   Int
  createdAt       DateTime @default(now())

  trade           Trade    @relation(fields: [tradeId], references: [id])
  ocrResult       OCRResult?
  riskScore       RiskScore?
}

// ─── OCRResult ────────────────────────────────────────────────────────────────

model OCRResult {
  id                  String             @id @default(cuid())
  proofId             String             @unique
  amount              Decimal?
  currency            String?
  timestamp           DateTime?
  transactionId       String?
  payerName           String?
  payeeName           String?
  paymentRail         String?
  bankName            String?
  fieldConfidences    Json               // Record<string, number>
  overallConfidence   Float
  verificationStatus  VerificationStatus
  explanation         String
  resolverSummary     String
  rawProviderResponse Json?
  createdAt           DateTime           @default(now())

  proof               Proof              @relation(fields: [proofId], references: [id])
}

// ─── RiskScore ────────────────────────────────────────────────────────────────

model RiskScore {
  id              String   @id @default(cuid())
  proofId         String   @unique
  userId          String
  trustScore      Int      // 0–100
  recommendation  String   // 'auto_release' | 'challenge_window' | 'manual_review'
  fraudFlags      Json     // FraudFlag[]
  subScores       Json     // Record<string, number>
  auditPayload    Json
  createdAt       DateTime @default(now())

  proof           Proof    @relation(fields: [proofId], references: [id])
  user            User     @relation(fields: [userId], references: [id])
}

// ─── Dispute ──────────────────────────────────────────────────────────────────

model Dispute {
  id              String          @id @default(cuid())
  tradeId         String          @unique
  raisedById      String
  decision        DisputeDecision @default(PENDING)
  createdAt       DateTime        @default(now())
  resolvedAt      DateTime?

  trade           Trade           @relation(fields: [tradeId], references: [id])
  resolverCase    ResolverCase?
}

model ResolverCase {
  id              String          @id @default(cuid())
  disputeId       String          @unique
  assignedToId    String?
  assignedAt      DateTime?
  escalatedAt     DateTime?
  decision        DisputeDecision @default(PENDING)
  rationale       String?
  aiSummary       String?
  resolvedAt      DateTime?
  createdAt       DateTime        @default(now())

  dispute         Dispute         @relation(fields: [disputeId], references: [id])
  assignedTo      User?           @relation(fields: [assignedToId], references: [id])
}

// ─── Notification ─────────────────────────────────────────────────────────────

model Notification {
  id              String              @id @default(cuid())
  userId          String
  channel         NotificationChannel
  eventType       String
  payload         Json
  delivered       Boolean             @default(false)
  retryCount      Int                 @default(0)
  failedAt        DateTime?
  createdAt       DateTime            @default(now())

  user            User                @relation(fields: [userId], references: [id])
}

// ─── AuditLog ─────────────────────────────────────────────────────────────────

model AuditLog {
  id              String          @id @default(cuid())
  actorId         String?
  actorAddress    String?
  actionType      AuditActionType
  entityType      String
  entityId        String
  beforeState     Json?
  afterState      Json?
  metadata        Json?
  contentHash     String          // SHA-256 of this entry
  previousHash    String?         // chained to previous entry
  createdAt       DateTime        @default(now())

  actor           User?           @relation("ActorLogs", fields: [actorId], references: [id])
  trade           Trade?          @relation("TradeLogs", fields: [entityId], references: [id])
}

// ─── RiskConfig ───────────────────────────────────────────────────────────────

model RiskConfig {
  id                    String   @id @default(cuid())
  autoReleaseCutoff     Int      @default(80)
  challengeWindowCutoff Int      @default(50)
  manualReviewCutoff    Int      @default(50)
  challengeWindowSeconds Int     @default(1800)
  updatedBy             String
  updatedAt             DateTime @updatedAt
  createdAt             DateTime @default(now())
}
```

### Smart Contract Data Structures

```solidity
// APPENEscrow.sol — storage layout

struct EscrowTrade {
    address seller;
    address buyer;
    address resolver;
    address stablecoin;
    uint256 amount;
    TradeState state;
    uint256 createdAt;
    uint256 markedPaidAt;
    uint256 challengeWindowSeconds;
    uint256 challengeExpiresAt;
}

mapping(bytes32 => EscrowTrade) public trades;
mapping(address => bool) public whitelistedTokens;
bytes32[] public tradeIds;
```

### OCR Extraction JSON Schema

```typescript
interface ProofExtraction {
  tradeId: string;
  proofId: string;
  amount: number | null;
  currency: string | null;           // ISO 4217
  timestamp: string | null;          // ISO 8601
  transactionId: string | null;
  payerName: string | null;
  payeeName: string | null;
  paymentRail: string | null;
  bankName: string | null;
  fieldConfidences: {
    amount: number;
    currency: number;
    timestamp: number;
    transactionId: number;
    payerName: number;
    payeeName: number;
    paymentRail: number;
    bankName: number;
  };
  overallConfidence: number;         // 0–1
  verificationStatus: 'verified' | 'needs_review' | 'suspicious';
  explanation: string;
  resolverSummary: string;           // ≤300 words
}
```

### Risk Scoring Formula

```
Trust_Score = weighted_sum(
  amount_match_score    * 0.35,   // 100 if diff ≤1%, scaled down
  timestamp_score       * 0.20,   // 100 if within 2h, 0 if >24h
  kyc_tier_score        * 0.15,   // Tier0=40, Tier1=60, Tier2=80, Tier3=100
  buyer_dispute_score   * 0.10,   // 100 - (dispute_rate * 200), floor 0
  seller_dispute_score  * 0.10,   // same formula
  ocr_confidence_score  * 0.10    // overallConfidence * 100
)

// Fraud flag overrides (any flag → cap Trust_Score at 30)
FraudFlags:
  - DUPLICATE_HASH:      evidenceHash matches existing proof
  - TIMESTAMP_PREDATES:  extracted timestamp < trade.createdAt
  - AMOUNT_MISMATCH:     |extracted - expected| / expected > 0.01
  - METADATA_ANOMALY:    image EXIF edited/stripped signals
  - LOW_OCR_CONFIDENCE:  overallConfidence < 0.5
```

### OpenAI Vision Prompt Template

```
You are a payment receipt verification assistant for a P2P crypto escrow platform.

Extract the following fields from the provided payment receipt image:
- amount: numeric transaction amount (number or null)
- currency: ISO 4217 currency code (string or null)
- timestamp: transaction date/time in ISO 8601 format (string or null)
- transactionId: payment reference or transaction ID (string or null)
- payerName: name of the sender (string or null)
- payeeName: name of the recipient or account (string or null)
- paymentRail: payment method (e.g., "bank_transfer", "mobile_money") (string or null)
- bankName: name of the bank or payment provider (string or null)

For each field, provide a confidence score between 0 and 1.

Expected trade amount: {expectedAmount} {expectedCurrency}
Trade created at: {tradeCreatedAt}

Respond ONLY with valid JSON matching this schema:
{
  "amount": number | null,
  "currency": string | null,
  "timestamp": string | null,
  "transactionId": string | null,
  "payerName": string | null,
  "payeeName": string | null,
  "paymentRail": string | null,
  "bankName": string | null,
  "fieldConfidences": { ... },
  "overallConfidence": number,
  "verificationStatus": "verified" | "needs_review" | "suspicious",
  "explanation": string,
  "resolverSummary": string
}
```


---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

---

### Property 1: SIWE Authentication Correctness

*For any* valid EIP-4361 message and matching wallet signature, the authentication service should create a session; and for any invalid signature or mismatched message, no session should be created and an error should be returned.

**Validates: Requirements 1.1, 1.5**

---

### Property 2: New User Profile Initialization

*For any* wallet address that authenticates for the first time, the resulting user record should have `kycTier = 0` and the reputation record should be initialized with `score = 500` upon first trade completion.

**Validates: Requirements 1.2**

---

### Property 3: Offer Input Validation

*For any* offer submission where the stablecoin amount is ≤ 0, the fiat rate is ≤ 0, the payment rails array is empty, the amount is below 10, or the amount exceeds 50,000, the platform should reject the offer and return a validation error without persisting any record.

**Validates: Requirements 2.1, 2.7**

---

### Property 4: Escrow Lock Invariant

*For any* valid offer creation transaction, the APPENEscrow contract's balance for the specified stablecoin should increase by exactly the offer amount, and the seller's wallet balance should decrease by exactly the same amount.

**Validates: Requirements 2.2**

---

### Property 5: Offer Book Sort Order

*For any* set of active offers retrieved from the platform, the returned list should be sorted by `createdAt` descending, and any applied filter (stablecoin type, payment rail, fiat currency) should exclude all offers that do not match the filter criteria.

**Validates: Requirements 2.3**

---

### Property 6: Offer Cancellation Round Trip

*For any* active offer with no associated active trade, cancelling the offer should return the locked stablecoin amount to the seller's wallet and mark the offer as inactive; and for any offer with an active trade, cancellation should be rejected.

**Validates: Requirements 2.4, 2.5**

---

### Property 7: Duplicate Offer Prevention

*For any* two offer submissions from the same seller with identical amount, rate, and payment rail submitted within a 60-second window, the second submission should be rejected with a duplicate error.

**Validates: Requirements 2.6**

---

### Property 8: State Machine Validity

*For any* trade in any state, only the valid transitions defined by the state machine (Created→Funded, Funded→MarkedPaid, Funded→Cancelled, MarkedPaid→UnderReview, MarkedPaid→Disputed, UnderReview→Released, UnderReview→Refunded, Disputed→Released, Disputed→Refunded) should succeed; all other state-changing calls should revert.

**Validates: Requirements 3.1**

---

### Property 9: Trade State Initialization

*For any* accepted offer, the resulting trade should be created in `Created` state and transition to `Funded` state upon on-chain confirmation, with the `onChainId` field populated.

**Validates: Requirements 3.2**

---

### Property 10: Challenge Window Timer

*For any* trade in `Funded` state where the buyer calls `markPaid`, the trade should transition to `MarkedPaid` state and `challengeExpiresAt` should be set to `now + challengeWindowSeconds`.

**Validates: Requirements 3.3**

---

### Property 11: Challenge Window Expiry Auto-Release

*For any* trade in `MarkedPaid` state where the challenge window has expired and no dispute was raised, the trade should transition to `Released` state and the buyer's wallet balance should increase by the trade amount.

**Validates: Requirements 3.4**

---

### Property 12: Dispute Creation

*For any* trade in `MarkedPaid` state where the seller calls `dispute` before `challengeExpiresAt`, the trade should transition to `Disputed` state and a `ResolverCase` record should be created containing all required evidence fields.

**Validates: Requirements 3.5, 7.1**

---

### Property 13: Resolver Decision Fund Transfer

*For any* disputed trade, when a resolver submits a `release` decision the buyer's balance should increase by the trade amount and the trade state should become `Released`; when a resolver submits a `refund` decision the seller's balance should increase by the trade amount and the trade state should become `Refunded`.

**Validates: Requirements 3.6, 3.7**

---

### Property 14: On-Chain Event Emission

*For any* state transition in the APPENEscrow contract, a `StateMachineTransition` event should be emitted containing the trade ID, the `from` state, the `to` state, the actor address, and the block timestamp.

**Validates: Requirements 3.8**

---

### Property 15: Pause Circuit Breaker

*For any* state-changing function call on the APPENEscrow contract while the contract is paused (except `unpause` by admin), the call should revert with a `Pausable: paused` error and no state should change.

**Validates: Requirements 3.10, 10.4**

---

### Property 16: Proof File Validation

*For any* file upload where the MIME type is not `image/jpeg`, `image/png`, or `application/pdf`, or where the file size exceeds 10 MB, the upload should be rejected with a validation error and no file should be stored.

**Validates: Requirements 4.1**

---

### Property 17: Evidence Hash Integrity

*For any* uploaded proof file, the `evidenceHash` stored in the database should equal `SHA-256(originalFileBytes)`, and the evidence hash verification endpoint should return `true` for the original file and `false` for any modified version of the file.

**Validates: Requirements 4.2, 13.4, 13.5**

---

### Property 18: OCR Extraction Schema Completeness

*For any* proof file processed by the OCR engine, the returned `ProofExtraction` object should contain all required fields (`amount`, `currency`, `timestamp`, `transactionId`, `payerName`, `payeeName`, `paymentRail`, `bankName`), per-field confidence scores all in the range [0, 1], and an `overallConfidence` in the range [0, 1].

**Validates: Requirements 4.4, 4.5**

---

### Property 19: Low-Confidence OCR Routing

*For any* proof where the OCR engine returns `amount` confidence < 0.5 or `timestamp` confidence < 0.5, the trade should be routed to `UnderReview` state.

**Validates: Requirements 4.6**

---

### Property 20: Trust Score Range Invariant

*For any* risk scoring input, the computed `trustScore` should always be in the range [0, 100], and the `subScores` record should contain entries for all seven required signals (amount match, timestamp recency, KYC tier, buyer dispute rate, seller dispute rate, OCR confidence, duplicate detection).

**Validates: Requirements 5.1, 5.2**

---

### Property 21: Trust Score Threshold Routing

*For any* computed `trustScore`, the `recommendation` field should be `auto_release` if `trustScore >= autoReleaseCutoff`, `challenge_window` if `challengeWindowCutoff <= trustScore < autoReleaseCutoff`, and `manual_review` if `trustScore < challengeWindowCutoff`, where the cutoffs are read from the current `RiskConfig`.

**Validates: Requirements 5.3, 5.4, 5.5, 5.7**

---

### Property 22: Fraud Flag Detection

*For any* proof where the `evidenceHash` matches an existing proof's hash, or the extracted timestamp predates the trade's `createdAt`, or the extracted amount differs from the expected amount by more than 1%, the `fraudFlags` array should contain the corresponding flag (`DUPLICATE_HASH`, `TIMESTAMP_PREDATES`, or `AMOUNT_MISMATCH` respectively), and the `trustScore` should be capped at 30.

**Validates: Requirements 5.6**

---

### Property 23: Risk Scoring Audit Completeness

*For any* risk scoring decision, an `AuditLog` entry of type `RISK_SCORED` should be created containing the input signals, all sub-scores, the final `trustScore`, and the `recommendation`.

**Validates: Requirements 5.8**

---

### Property 24: Reputation Score Bounds

*For any* sequence of reputation update operations, the user's reputation score should always remain in the range [0, 1000].

**Validates: Requirements 6.1**

---

### Property 25: Reputation Score Updates

*For any* trade that reaches `Released` state, both the buyer's and seller's reputation scores should increase by a value in the range [0, 10] proportional to trade volume; and for any trade that reaches `Refunded` state following a resolver decision, the at-fault party's score should decrease by exactly 20 points.

**Validates: Requirements 6.2, 6.3, 6.4**

---

### Property 26: User Profile Data Completeness

*For any* user profile API response, the response should contain `totalCompletedTrades`, `totalVolume`, `reputationScore`, `disputeRate`, and `memberSince` fields.

**Validates: Requirements 6.5**

---

### Property 27: Low-Trust Trade Restriction

*For any* user with `reputationScore < 200`, attempting to create or accept a second concurrent active trade should be rejected with a low-trust restriction error.

**Validates: Requirements 6.6**

---

### Property 28: Reputation Audit Trail

*For any* reputation score change, a `ReputationEvent` record and an `AuditLog` entry of type `REPUTATION_UPDATED` should be created containing the triggering `tradeId`, the `delta` value, and the `createdAt` timestamp.

**Validates: Requirements 6.7**

---

### Property 29: AI Case Summary Length

*For any* generated `ResolverCase` AI summary, the word count of the `aiSummary` field should be ≤ 300.

**Validates: Requirements 7.2**

---

### Property 30: Round-Robin Resolver Assignment

*For any* sequence of N resolver cases assigned to a pool of M resolvers, each resolver should receive approximately N/M cases, and no resolver should receive two consecutive cases before all other resolvers have received one (strict round-robin).

**Validates: Requirements 7.3**

---

### Property 31: Resolver Decision Validation

*For any* resolver decision submission where the `rationale` field is fewer than 20 characters, the submission should be rejected; and for any valid decision, the `ResolverCase` record should be updated with the resolver's address, the decision timestamp, and the rationale before the escrow contract action is executed.

**Validates: Requirements 7.6**

---

### Property 32: Resolver Conflict of Interest

*For any* resolver attempting to adjudicate a case where their wallet address matches the buyer's or seller's wallet address, the resolution attempt should be rejected with a conflict-of-interest error.

**Validates: Requirements 7.8**

---

### Property 33: Notification Event Coverage

*For any* trade event of type (created, funded, marked-paid, challenge-window-started, challenge-window-expiring, released, refunded, dispute-raised, resolver-assigned, case-resolved, escalated), a `Notification` record should be created for each affected party.

**Validates: Requirements 8.3**

---

### Property 34: Notification Retry Bound

*For any* failed notification delivery, the `retryCount` field should never exceed 3, and after 3 failed attempts the notification should be marked as failed and an `AuditLog` entry of type `NOTIFICATION_FAILED` should be created.

**Validates: Requirements 8.4**

---

### Property 35: KYC Tier Trade Limit Enforcement

*For any* trade creation or acceptance attempt where the trade amount exceeds the user's KYC tier limit (Tier 0: 500, Tier 1: 2000, Tier 2: 10000, Tier 3: 50000), the action should be rejected with an error indicating the required tier.

**Validates: Requirements 9.2, 9.3**

---

### Property 36: KYC Tier 3 Approval Audit

*For any* KYC Tier 3 approval action by an admin, an `AuditLog` entry of type `KYC_APPROVED` should be created containing the approving admin's address, the approval timestamp, and the document reference.

**Validates: Requirements 9.4**

---

### Property 37: Admin Metrics Completeness

*For any* admin metrics API response, the response should contain `activeTrades`, `lockedStablecoinValue`, `openDisputeCount`, `averageResolutionTime`, and `trustScoreDistribution` fields.

**Validates: Requirements 10.1**

---

### Property 38: User Suspension Cascade

*For any* user suspension action by an admin, all of the suspended user's active offers should be cancelled, subsequent trade creation attempts by that user should be rejected, and an `AuditLog` entry of type `USER_SUSPENDED` should be created with the admin address and reason.

**Validates: Requirements 10.2**

---

### Property 39: Risk Config Change Audit

*For any* admin risk configuration update, an `AuditLog` entry of type `RISK_CONFIG_CHANGED` should be created, and subsequent risk scoring operations should use the new threshold values.

**Validates: Requirements 10.3**

---

### Property 40: Audit Log Access Control

*For any* API request to the audit log endpoint from a user who is neither an Admin nor a Resolver, the response should be HTTP 403; and for any admin or resolver request with filter parameters, the returned entries should only contain entries matching all specified filters.

**Validates: Requirements 14.3**

---

### Property 41: Analytics Data Completeness

*For any* analytics API response, the response should contain `tradesOverTime`, `volumeByStablecoin`, `trustScoreDistribution`, `disputeRateOverTime`, and `topTradersByVolume` fields.

**Validates: Requirements 11.1**

---

### Property 42: Real-Time Analytics WebSocket

*For any* trade event that occurs during an active WebSocket session, an `analytics:update` message should be emitted to all subscribed clients within the same event loop tick.

**Validates: Requirements 11.3**

---

### Property 43: Reentrancy Protection

*For any* reentrant call attempt on an APPENEscrow function that transfers tokens (release, refund, cancel), the reentrant call should revert due to the `ReentrancyGuard` lock.

**Validates: Requirements 12.2**

---

### Property 44: Admin Access Control

*For any* call to an admin-restricted function on the APPENEscrow contract (pause, unpause, addWhitelistedToken) from an address that does not hold the admin role, the call should revert with an access control error.

**Validates: Requirements 12.3**

---

### Property 45: Token Transfer Atomicity

*For any* token transfer within the APPENEscrow contract that fails (e.g., insufficient balance, transfer reverted), the entire transaction should revert and no state variables should be updated.

**Validates: Requirements 12.5**

---

### Property 46: Token Whitelist Enforcement

*For any* escrow creation attempt using a stablecoin address that is not in the whitelist, the transaction should revert; and the contract should reject any attempt to receive native ETH/MATIC.

**Validates: Requirements 12.6**

---

### Property 47: ProofExtraction Serialization Round Trip

*For any* valid `ProofExtraction` object, serializing it to JSON and then deserializing the JSON back to a `ProofExtraction` object should produce an object that is deeply equal to the original.

**Validates: Requirements 13.1, 13.2, 13.3**

---

### Property 48: Audit Log Completeness and Hash Chain

*For any* auditable action (state transition, user action, risk decision, reputation update, admin config change), an `AuditLog` entry should be created containing all required fields, and the `contentHash` of each entry should equal `SHA-256(entryContent)` chained to the `previousHash` of the preceding entry.

**Validates: Requirements 14.1, 14.2**

---

### Property 49: Audit Log Write Atomicity

*For any* operation that requires an audit log entry, if the audit log write fails, the triggering operation should also fail and no state change should be persisted.

**Validates: Requirements 14.5**


---

## Error Handling

### Backend Error Strategy

All NestJS controllers use a global exception filter that maps domain errors to HTTP responses:

```typescript
// Error hierarchy
class APPENError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

class ValidationError extends APPENError {}      // 400
class AuthError extends APPENError {}            // 401
class ForbiddenError extends APPENError {}       // 403
class NotFoundError extends APPENError {}        // 404
class ConflictError extends APPENError {}        // 409
class RateLimitError extends APPENError {}       // 429
class InternalError extends APPENError {}        // 500

// Error codes
SIWE_INVALID_SIGNATURE
SIWE_MESSAGE_EXPIRED
OFFER_INVALID_AMOUNT
OFFER_DUPLICATE
OFFER_CANCEL_ACTIVE_TRADE
TRADE_KYC_LIMIT_EXCEEDED
TRADE_INVALID_STATE_TRANSITION
TRADE_LOW_TRUST_RESTRICTION
PROOF_INVALID_FORMAT
PROOF_SIZE_EXCEEDED
DISPUTE_CONFLICT_OF_INTEREST
DISPUTE_RATIONALE_TOO_SHORT
AUDIT_WRITE_FAILED
```

### Smart Contract Error Strategy

```solidity
// Custom errors (gas-efficient)
error InvalidState(bytes32 tradeId, TradeState current, TradeState required);
error Unauthorized(address caller, bytes32 role);
error TokenNotWhitelisted(address token);
error ChallengeWindowActive(bytes32 tradeId, uint256 expiresAt);
error ChallengeWindowExpired(bytes32 tradeId);
error FundedTimeoutNotReached(bytes32 tradeId);
error ContractPaused();
error ZeroAmount();
error ConflictOfInterest(address resolver);
```

### Queue Job Error Handling

All BullMQ jobs implement exponential backoff with a maximum of 3 retries:

```typescript
const jobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: 100,
  removeOnFail: 500,
};
```

Failed jobs after max retries are moved to a dead-letter queue and trigger an admin alert.

### OCR Provider Fallback

```typescript
// OCRModule provider chain
class OCRService {
  private providers: OCRProvider[] = [
    new OpenAIVisionProvider(),
    new FallbackRuleBasedProvider(),  // returns low-confidence extraction
  ];

  async extract(file: Buffer): Promise<ProofExtraction> {
    for (const provider of this.providers) {
      try {
        return await provider.extract(file);
      } catch (err) {
        this.logger.warn(`OCR provider ${provider.name} failed`, err);
      }
    }
    throw new InternalError('OCR_ALL_PROVIDERS_FAILED', 'All OCR providers failed');
  }
}
```

### Audit Log Write Failure

If an audit log write fails, the platform halts the triggering operation:

```typescript
async function withAudit<T>(
  auditService: AuditService,
  entry: AuditLogEntry,
  operation: () => Promise<T>
): Promise<T> {
  await auditService.write(entry);  // throws if write fails → operation never runs
  return operation();
}
```

---

## Testing Strategy

### Dual Testing Approach

APPEN uses both unit/example tests and property-based tests. They are complementary:
- Unit tests verify specific examples, integration points, and error conditions
- Property tests verify universal invariants across randomly generated inputs

### Property-Based Testing Library

| Layer | Library |
|---|---|
| Backend (TypeScript) | `fast-check` |
| Smart Contracts (Solidity) | Foundry's built-in fuzzer (`forge test --fuzz-runs 1000`) |

Each property test runs a minimum of **100 iterations** (fast-check default) or **1000 fuzz runs** (Foundry).

### Property Test Tag Format

Each property test must include a comment referencing the design property:

```typescript
// Feature: appen-p2p-escrow, Property 47: ProofExtraction Serialization Round Trip
it('serialization round trip', () => {
  fc.assert(fc.property(arbitraryProofExtraction(), (extraction) => {
    const serialized = JSON.stringify(extraction);
    const deserialized = JSON.parse(serialized) as ProofExtraction;
    expect(deserialized).toEqual(extraction);
  }), { numRuns: 100 });
});
```

### Test File Structure

```
backend/
├── src/
│   └── **/__tests__/
│       ├── *.spec.ts          # Unit tests (Jest)
│       └── *.property.ts      # Property tests (fast-check)
contracts/
├── test/
│   ├── APPENEscrow.t.sol      # Foundry unit tests
│   └── APPENEscrow.fuzz.t.sol # Foundry fuzz tests
frontend/
├── __tests__/
│   └── *.test.tsx             # React Testing Library
```

### Smart Contract Test Coverage Requirements

The Hardhat/Foundry test suite must cover:
- Every state transition (happy path and invalid transitions)
- Every role-restricted function (authorized and unauthorized callers)
- Every timeout scenario (24h funded timeout, challenge window expiry)
- Every error condition (zero amount, non-whitelisted token, paused contract)
- Reentrancy attack simulation using a malicious ERC20 mock
- Minimum 90% line coverage verified by `forge coverage` or `hardhat coverage`

### Backend Unit Test Coverage

Key test areas per module:

| Module | Key Test Areas |
|---|---|
| AuthModule | SIWE verification, JWT generation, session invalidation |
| OffersModule | Validation, duplicate detection, pagination sort |
| TradesModule | State machine transitions, KYC limit enforcement |
| ProofModule | File validation, SHA-256 hashing, S3 path scoping |
| OCRModule | Schema validation, confidence score bounds, provider fallback |
| RiskModule | Trust score formula, fraud flag detection, threshold routing |
| ReputationModule | Score bounds, delta calculation, audit trail |
| DisputeModule | Conflict of interest check, rationale validation, round-robin |
| NotificationModule | Event coverage, retry bound, preference filtering |
| AuditModule | Hash chain integrity, write failure atomicity |

### Demo Mode and Seed Data

```typescript
// seed.ts — minimum dataset
const SEED = {
  completedTrades: 50,
  disputedTrades: 5,
  activeOffers: 10,
  users: {
    buyer:    { address: '0xBuyer...', kycTier: 1 },
    seller:   { address: '0xSeller...', kycTier: 2 },
    resolver: { address: '0xResolver...', role: 'resolver' },
    admin:    { address: '0xAdmin...', role: 'admin' },
  }
};
```

### Environment Configuration

```bash
# .env.example

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/appen

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRES_IN=7d

# S3
S3_BUCKET=appen-proofs
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_ENDPOINT=                    # for MinIO local dev

# OpenAI
OPENAI_API_KEY=

# Email
RESEND_API_KEY=
EMAIL_FROM=noreply@appen.xyz

# Blockchain
RPC_URL_BASE_SEPOLIA=https://sepolia.base.org
RPC_URL_POLYGON_MUMBAI=https://rpc-mumbai.maticvigil.com
ESCROW_CONTRACT_ADDRESS=
ADMIN_WALLET_ADDRESS=
DEPLOYER_PRIVATE_KEY=           # only for deployment scripts

# Frontend
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_CHAIN_ID=84532      # Base Sepolia

# Feature flags
DEMO_MODE=false
OCR_PROVIDER=openai             # openai | google | aws
```

### Docker Compose (Local Dev)

```yaml
# docker-compose.yml
version: '3.9'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: appen
      POSTGRES_USER: appen
      POSTGRES_PASSWORD: appen
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  minio_data:
```

### Production Deployment Notes

- **Frontend**: Deploy to Vercel. Set all `NEXT_PUBLIC_*` env vars in Vercel dashboard.
- **Backend**: Deploy to Railway or Render as a Node.js service. Run `prisma migrate deploy` on startup.
- **Workers**: Deploy as a separate Railway service running `npm run worker`.
- **Database**: Use Railway PostgreSQL or Supabase.
- **Redis**: Use Railway Redis or Upstash.
- **Smart Contracts**: Deploy with `npx hardhat run scripts/deploy.ts --network baseSepolia`.

### 3-Minute Demo Pitch Script

```
0:00 — Open landing page. Point to 3D escrow orbit. "APPEN solves the trust gap in P2P crypto."
0:20 — Connect demo seller wallet. Create an offer: 100 USDC at 1.05 USD/USDC via bank transfer.
0:40 — Switch to demo buyer wallet. Accept the offer. Show trade in Funded state.
1:00 — Upload mock payment receipt. Watch OCR extraction run live. Show extracted fields + confidence scores.
1:20 — Risk Engine scores 85 → auto-release recommendation. Trade moves to Released. Buyer receives USDC.
1:40 — Switch to disputed trade demo. Show Resolver Console with AI case summary and evidence bundle.
2:00 — Resolver submits Release decision with rationale. Show on-chain event in block explorer.
2:20 — Open Admin Dashboard. Show real-time metrics, Trust_Score distribution, audit log.
2:40 — Open Analytics page. Show 50+ seeded trades, dispute rate chart, top traders leaderboard.
3:00 — "APPEN: non-custodial escrow, AI-verified proofs, on-chain reputation. Production-ready."
```

