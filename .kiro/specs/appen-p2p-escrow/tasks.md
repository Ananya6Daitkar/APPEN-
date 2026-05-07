# APPEN — Implementation Tasks

> Monorepo: Next.js 15 (frontend + API routes) · Hardhat · Prisma/PostgreSQL · Modular OCR/Risk engine
> `DEMO_MODE=true` bypasses blockchain, OCR, and email — safe for hackathon judging
> Tasks marked `*` are optional property-based tests (skip for faster MVP)

---

## SECTION A — Foundation

- [ ] 1. Monorepo scaffold and tooling
  - Init Next.js 15 + TypeScript + Tailwind + shadcn/ui
  - Add `contracts/` Hardhat workspace
  - Configure Prisma with PostgreSQL datasource
  - Add `docker-compose.yml` (PostgreSQL, Redis, MinIO)
  - Add `.env.example` and `setup.sh` one-click bootstrap
  - _Req: all_

- [x] 2. Tailwind theme + shared UI components
  - `tailwind.config.ts` — brand colors: neon blue, emerald, violet, amber, red; glass surface tokens
  - `GlassCard` — glassmorphism, border, backdrop-blur
  - `Navbar` — logo, wallet connect slot, notification bell slot
  - `WalletConnectButton` — RainbowKit + wagmi v2
  - `ReputationBadge` — score chip with color tiers
  - `KYCTierBadge` — tier 0–3 pill
  - `NotificationBell` — unread count badge, dropdown list
  - _Req: all frontend_

- [x] 3. Prisma schema + migrations
  - Models: User, Reputation, ReputationEvent, Offer, Trade, Proof, OCRResult, RiskScore, Dispute, ResolverCase, Notification, AuditLog, RiskConfig
  - Enums: TradeState, VerificationStatus, DisputeDecision, NotificationChannel, AuditActionType
  - Run initial migration
  - _Req: all data persistence_

- [x] 4. Database seed script (`prisma/seed.ts`)
  - 4 demo users: buyer (KYC1), seller (KYC2), resolver, admin
  - 50 completed trades + 5 disputed trades + 10 active offers (USDC/USDT, multiple rails)
  - Reputation records, events, risk scores, OCR results for all seeded trades
  - _Req: 11.2_

---

## SECTION B — Smart Contracts

- [x] 5. `APPENEscrow.sol`
  - [x] 5.1 Full 8-state enum: Created, Funded, MarkedPaid, UnderReview, Disputed, Released, Refunded, Cancelled
    - Struct: `EscrowTrade`; mappings: `trades`, `whitelistedTokens`
    - Functions: `createEscrow`, `markPaid`, `dispute`, `release`, `refund`, `cancel`, `refundExpired`
    - 24h funded timeout + configurable `challengeWindowSeconds`
    - OZ: `SafeERC20`, `ReentrancyGuard`, `AccessControl`, `Pausable`
    - Events: `EscrowCreated`, `StateMachineTransition`, `FundsReleased`, `FundsRefunded`, `Paused`, `Unpaused`
    - Custom errors: `InvalidState`, `Unauthorized`, `TokenNotWhitelisted`, `ChallengeWindowActive`, `ChallengeWindowExpired`, `FundedTimeoutNotReached`, `ZeroAmount`, `ConflictOfInterest`
    - Reject native ETH via `receive()` revert
    - _Req: 3.1–3.10, 12.1–12.6_
  - [ ]* 5.2 Property test — state machine validity _(Prop 8 · Req 3.1)_
  - [ ]* 5.3 Property test — reentrancy protection _(Prop 43 · Req 12.2)_
  - [ ]* 5.4 Property test — token transfer atomicity _(Prop 45 · Req 12.5)_

- [x] 6. `MockERC20.sol` + Hardhat config
  - `MockERC20.sol` — ERC20, mintable, 6 decimals (USDC/USDT simulation)
  - `hardhat.config.ts` — Base Sepolia + Polygon Mumbai networks
  - `scripts/deploy.ts` — deploy MockERC20 ×2 + APPENEscrow, whitelist tokens
  - _Req: 12.1, 12.6_

- [x] 7. Smart contract unit tests (≥90% coverage)
  - [x] 7.1 Happy path: Created→Funded→MarkedPaid→Released, dispute path, refund path, cancel path _(Req 3.1–3.9, 12.4)_
  - [x] 7.2 Invalid transitions revert with `InvalidState` _(Req 3.1, 12.4)_
  - [x] 7.3 Role-restricted functions reject unauthorized callers _(Req 3.10, 12.3)_
  - [x] 7.4 24h funded timeout + challenge window expiry _(Req 3.4, 3.9)_
  - [x] 7.5 Paused contract rejects all state-changing calls _(Req 3.10, 10.4)_
  - [x] 7.6 Token whitelist enforcement + ETH rejection _(Req 12.6)_
  - [ ]* 7.7 Property test — escrow lock invariant _(Prop 4 · Req 2.2)_
  - [ ]* 7.8 Property test — on-chain event emission _(Prop 14 · Req 3.8)_
  - [ ]* 7.9 Property test — pause circuit breaker _(Prop 15 · Req 3.10, 10.4)_
  - [ ]* 7.10 Property test — admin access control _(Prop 44 · Req 12.3)_
  - [ ]* 7.11 Property test — token whitelist enforcement _(Prop 46 · Req 12.6)_

- [x] 8. ✅ Checkpoint — contracts
  - All tests pass; `hardhat coverage` ≥90% line coverage

---

## SECTION C — Backend API Routes

- [x] 9. Auth — SIWE + JWT
  - [x] 9.1 `POST /api/auth/verify` — verify EIP-4361 message + signature, issue JWT, upsert User (kycTier=0) + Reputation
    - `lib/auth/siwe.ts`, `lib/auth/jwt.ts`, `lib/auth/session.ts` middleware
    - _Req: 1.1, 1.2, 1.5_
  - [x] 9.2 `POST /api/auth/link-email` — link email to wallet, emailVerified=false _(Req 1.4)_
  - [x] 9.3 `DELETE /api/auth/session` — invalidate session on disconnect _(Req 1.3)_
  - [ ]* 9.4 Property test — SIWE auth correctness _(Prop 1 · Req 1.1, 1.5)_
  - [ ]* 9.5 Property test — new user profile init _(Prop 2 · Req 1.2)_

- [x] 10. Offers API
  - [x] 10.1 `GET /api/offers` — paginated, sorted createdAt desc, filters: stablecoin/rail/fiatCurrency _(Req 2.3)_
  - [x] 10.2 `POST /api/offers` — validate amount (10–50000), rate>0, rails non-empty; 60s duplicate check; persist + AuditLog _(Req 2.1, 2.6, 2.7)_
  - [x] 10.3 `DELETE /api/offers/:id` — reject if active trade; AuditLog _(Req 2.4, 2.5)_
  - [ ]* 10.4 Property test — offer input validation _(Prop 3 · Req 2.1, 2.7)_
  - [ ]* 10.5 Property test — offer book sort order _(Prop 5 · Req 2.3)_
  - [ ]* 10.6 Property test — duplicate offer prevention _(Prop 7 · Req 2.6)_
  - [ ]* 10.7 Property test — offer cancellation round trip _(Prop 6 · Req 2.4, 2.5)_

- [x] 11. Trades API + state machine
  - [x] 11.1 `POST /api/trades` — accept offer, enforce KYC limit + low-trust restriction (rep<200→max 1 active), create CREATED, AuditLog _(Req 3.2, 6.6, 9.2, 9.3)_
  - [x] 11.2 `GET /api/trades/:id` — full detail: offer, buyer, seller, proofs, dispute _(Req 3.1)_
  - [x] 11.3 `POST /api/trades/:id/mark-paid` — FUNDED→MARKED_PAID, set markedPaidAt + challengeExpiresAt, AuditLog _(Req 3.3)_
  - [x] 11.4 `POST /api/trades/:id/dispute` — MARKED_PAID→DISPUTED, create Dispute + ResolverCase, round-robin assign, AuditLog _(Req 3.5, 7.1, 7.3)_
  - [ ]* 11.5 Property test — trade state init _(Prop 9 · Req 3.2)_
  - [ ]* 11.6 Property test — challenge window timer _(Prop 10 · Req 3.3)_
  - [ ]* 11.7 Property test — KYC tier trade limit _(Prop 35 · Req 9.2, 9.3)_
  - [ ]* 11.8 Property test — low-trust trade restriction _(Prop 27 · Req 6.6)_

- [x] 12. Proof upload + hash verification
  - [x] 12.1 `POST /api/trades/:id/proof` — validate MIME (jpeg/png/pdf) + size (≤10MB), SHA-256 hash before transform, store to S3/MinIO (trade-scoped path), persist Proof, AuditLog _(Req 4.1–4.3)_
  - [x] 12.2 `GET /api/proofs/:tradeId/verify` — recompute SHA-256, compare to stored hash, return boolean _(Req 13.4, 13.5)_
  - [ ]* 12.3 Property test — proof file validation _(Prop 16 · Req 4.1)_
  - [ ]* 12.4 Property test — evidence hash integrity _(Prop 17 · Req 4.2, 13.4, 13.5)_

- [x] 13. OCR engine — modular provider
  - [x] 13.1 `OCRProvider` abstract class — `extract(file, context): Promise<ProofExtraction>`; define `ProofExtraction` interface _(Req 4.4, 4.5, 4.8)_
  - [x] 13.2 `MockOCRProvider` — realistic fake extraction, configurable confidence, supports low-confidence + fraud scenarios, reads `DEMO_MODE` _(Req 4.4, 4.5, 4.8)_
  - [x] 13.3 `OpenAIVisionProvider` — Vision API call with design prompt template, parse JSON→ProofExtraction, fallback to Mock on error _(Req 4.4, 4.5, 4.7, 4.8)_
  - [x] 13.4 `OCRService` — provider chain (OpenAI→Mock); route to UNDER_REVIEW if amount/timestamp confidence <0.5 _(Req 4.6–4.8)_
  - [ ]* 13.5 Property test — OCR schema completeness _(Prop 18 · Req 4.4, 4.5)_
  - [ ]* 13.6 Property test — low-confidence routing _(Prop 19 · Req 4.6)_
  - [ ]* 13.7 Property test — ProofExtraction round trip _(Prop 47 · Req 13.1–13.3)_

- [x] 14. Risk scoring engine
  - [x] 14.1 `RiskService.score()` — weighted formula: amount_match×0.35, timestamp×0.20, kyc_tier×0.15, buyer_dispute×0.10, seller_dispute×0.10, ocr_confidence×0.10; fraud flags cap score at 30; read thresholds from RiskConfig; AuditLog RISK_SCORED _(Req 5.1–5.8)_
  - [x] 14.2 Wire into proof pipeline — auto-release→RELEASED, challenge_window→MARKED_PAID, manual_review→UNDER_REVIEW _(Req 5.3–5.5)_
  - [ ]* 14.3 Property test — trust score range [0,100] _(Prop 20 · Req 5.1, 5.2)_
  - [ ]* 14.4 Property test — threshold routing _(Prop 21 · Req 5.3–5.5, 5.7)_
  - [ ]* 14.5 Property test — fraud flag detection _(Prop 22 · Req 5.6)_
  - [ ]* 14.6 Property test — risk scoring audit _(Prop 23 · Req 5.8)_

- [x] 15. ✅ Checkpoint — backend core pipeline
  - Auth → offers → trades → proof upload → OCR → risk scoring work end-to-end in DEMO_MODE

- [x] 16. Reputation service
  - [x] 16.1 `onTradeReleased(tradeId)` — increment buyer+seller by min(10, vol-proportional), ReputationEvent, AuditLog REPUTATION_UPDATED _(Req 6.1, 6.2, 6.7)_
  - [x] 16.2 `onTradeRefunded(tradeId, faultParty)` — decrement fault party by 20, clamp [0,1000], ReputationEvent, AuditLog _(Req 6.3, 6.4, 6.7)_
  - [x] 16.3 `GET /api/users/:address/profile` — totalCompletedTrades, totalVolume, reputationScore, disputeRate, memberSince _(Req 6.5)_
  - [x] 16.4 `GET /api/users/me` — authenticated profile with KYC tier + active trade count _(Req 6.5)_
  - [ ]* 16.5 Property test — reputation score bounds [0,1000] _(Prop 24 · Req 6.1)_
  - [ ]* 16.6 Property test — score update deltas _(Prop 25 · Req 6.2–6.4)_
  - [ ]* 16.7 Property test — profile data completeness _(Prop 26 · Req 6.5)_
  - [ ]* 16.8 Property test — reputation audit trail _(Prop 28 · Req 6.7)_

- [x] 17. Dispute + resolver API
  - [x] 17.1 `GET /api/disputes` — resolver's assigned/unassigned cases, paginated _(Req 7.1)_
  - [x] 17.2 `GET /api/disputes/:id` — full evidence bundle: trade, proof, OCR, risk score, buyer/seller profiles, AI summary _(Req 7.1, 7.5)_
  - [x] 17.3 `lib/disputes/aiSummary.ts` — DEMO_MODE: mock summary ≤300 words; production: OpenAI call _(Req 7.2)_
  - [x] 17.4 `lib/disputes/assignment.ts` — round-robin assign to resolver pool, set assignedAt, AuditLog DISPUTE_ASSIGNED _(Req 7.3)_
  - [x] 17.5 `POST /api/disputes/:id/resolve` — rationale ≥20 chars, conflict-of-interest check, record decision, trigger release/refund, update reputation, AuditLog DISPUTE_RESOLVED _(Req 7.6, 7.8)_
  - [x] 17.6 `lib/disputes/escalation.ts` — setInterval on startup; escalate unresolved cases after 48h, AuditLog _(Req 7.7)_
  - [ ]* 17.7 Property test — AI summary ≤300 words _(Prop 29 · Req 7.2)_
  - [ ]* 17.8 Property test — round-robin assignment _(Prop 30 · Req 7.3)_
  - [ ]* 17.9 Property test — resolver decision validation _(Prop 31 · Req 7.6)_
  - [ ]* 17.10 Property test — conflict of interest _(Prop 32 · Req 7.8)_

- [x] 18. Notification service
  - [x] 18.1 `NotificationService.send(userId, eventType, payload)` — persist record, WebSocket push if connected, email stub (log or Resend) _(Req 8.1, 8.2)_
  - [x] 18.2 Wire all 11 event types: trade_created, trade_funded, buyer_marked_paid, challenge_window_started, challenge_window_expiring, trade_released, trade_refunded, dispute_raised, resolver_assigned, case_resolved, escalated_to_admin _(Req 8.3)_
  - [x] 18.3 Retry with exponential backoff (max 3); on final failure → mark failed + AuditLog NOTIFICATION_FAILED _(Req 8.4)_
  - [x] 18.4 `POST /api/users/me/notifications/preferences` — per-event email preference _(Req 8.5)_
  - [ ]* 18.5 Property test — notification event coverage _(Prop 33 · Req 8.3)_
  - [ ]* 18.6 Property test — retry bound _(Prop 34 · Req 8.4)_

- [x] 19. KYC + admin API
  - [x] 19.1 `POST /api/users/me/kyc` — store encrypted doc ref, set kycTier=2, AuditLog KYC_SUBMITTED _(Req 9.1, 9.5)_
  - [x] 19.2 `POST /api/admin/users/:id/kyc-approve` — admin only, set kycTier=3, AuditLog KYC_APPROVED _(Req 9.4)_
  - [x] 19.3 `GET /api/admin/metrics` — activeTrades, lockedStablecoinValue, openDisputeCount, avgResolutionTime, trustScoreDistribution _(Req 10.1)_
  - [x] 19.4 `POST /api/admin/users/:id/suspend` — cancel active offers, block trades, AuditLog USER_SUSPENDED _(Req 10.2)_
  - [x] 19.5 `POST /api/admin/risk-config` — update thresholds, AuditLog RISK_CONFIG_CHANGED _(Req 10.3)_
  - [x] 19.6 `GET /api/admin/audit-log` — paginated, filterable by actor/entity/actionType/date; 403 for non-admin/resolver _(Req 10.5, 14.3)_
  - [ ]* 19.7 Property test — admin metrics completeness _(Prop 37 · Req 10.1)_
  - [ ]* 19.8 Property test — user suspension cascade _(Prop 38 · Req 10.2)_
  - [ ]* 19.9 Property test — risk config change audit _(Prop 39 · Req 10.3)_
  - [ ]* 19.10 Property test — audit log access control _(Prop 40 · Req 14.3)_
  - [ ]* 19.11 Property test — KYC tier 3 approval audit _(Prop 36 · Req 9.4)_

- [x] 20. Audit log service
  - [x] 20.1 `AuditService.write(entry)` — SHA-256 contentHash chained to previousHash; throw on write failure _(Req 14.1, 14.2, 14.5)_
  - [x] 20.2 `withAudit<T>(entry, operation)` helper — audit write first; operation never runs if write fails _(Req 14.5)_
  - [ ]* 20.3 Property test — hash chain integrity _(Prop 48 · Req 14.1, 14.2)_
  - [ ]* 20.4 Property test — write atomicity _(Prop 49 · Req 14.5)_

- [x] 21. Analytics API + WebSocket server
  - [x] 21.1 `GET /api/analytics` — tradesOverTime, volumeByStablecoin, trustScoreDistribution, disputeRateOverTime, topTradersByVolume _(Req 11.1)_
  - [x] 21.2 `GET /api/analytics/demo-seed` — trigger seed loader; only when DEMO_MODE=true _(Req 11.2)_
  - [x] 21.3 WebSocket server (ws/socket.io) — emit: `trade:state_changed`, `trade:proof_processed`, `dispute:assigned`, `dispute:resolved`, `notification:new`, `analytics:update` _(Req 8.1, 11.3)_
  - [x] 21.4 `useWebSocket` client hook — subscribe to trade + notification events, update local state _(Req 8.1, 11.3)_
  - [ ]* 21.5 Property test — analytics data completeness _(Prop 41 · Req 11.1)_

- [x] 22. ✅ Checkpoint — all API routes + services
  - All routes respond correctly; audit log chains; notifications fire; demo seed loads cleanly

---

## SECTION D — Frontend Pages

- [x] 23. Landing page (`app/page.tsx`)
  - [x] 23.1 `EscrowOrbit3D` — R3F scene: orbiting token spheres, particle trails, continuous rotation; fallback static SVG
  - [x] 23.2 `HeroSection` — headline, subheadline, CTA buttons (Launch App / View Demo), embed EscrowOrbit3D
  - [x] 23.3 `ProblemSection` — 3-column cards: trust gap, fiat unverifiable, manual disputes
  - [x] 23.4 `HowItWorks` — scroll-triggered 5-step timeline: Lock → Send Fiat → Upload Proof → AI Verify → Release
  - [x] 23.5 `WhyAPPEN` — comparison cards vs. centralized P2P (non-custodial, AI-verified, on-chain rep, structured disputes)
  - [x] 23.6 `CorridorMap` — animated SVG/Canvas world map with fiat corridor flow lines
  - [x] 23.7 `CTASection` — CTA, trust badges (OpenZeppelin/Base/Polygon), FAQ accordion, footer

- [x] 24. Offers marketplace (`app/marketplace/page.tsx`)
  - [x] 24.1 `OfferFilters` — stablecoin, payment rail, fiat currency dropdowns; URL-synced params
  - [x] 24.2 `OfferCard` — glassmorphism card: rep badge, KYC badge, amount, rate, rails, Accept button; hover lift+glow
  - [x] 24.3 `OfferBook` — paginated OfferCards with stagger animation; empty state

- [x] 25. Create offer page (`app/create-offer/page.tsx`)
  - Form: stablecoin selector, amount (10–50000), fiat currency, rate, payment rail multi-select
  - On submit: wagmi approve + createEscrow on-chain → POST /api/offers with txHash
  - Transaction status: pending → confirmed → offer live
  - _Req: 2.1, 2.2, 2.7_

- [x] 26. Trade detail page (`app/trade/[id]/page.tsx`)
  - [x] 26.1 `TradeStateTimeline` — animated 8-state timeline; current state pulses; completed states checkmarked
  - [x] 26.2 `ProofUploader` — drag-drop, client-side validation, upload progress ring, show evidenceHash post-upload
  - [x] 26.3 `ProofStatus` — OCR fields, per-field confidence bars, trust score, recommendation badge
  - [x] 26.4 `DisputeActions` — seller: dispute button (challenge window only); buyer: mark paid; resolver: release/refund
  - [x] 26.5 `ChatThread` — buyer/seller message thread; real-time via WebSocket
  - Real-time state updates via WebSocket

- [x] 27. Merchant profile (`app/profile/[address]/page.tsx`)
  - Display: totalCompletedTrades, totalVolume, ReputationBadge, disputeRate, memberSince, KYCTierBadge, recent trade history table
  - _Req: 6.5_

- [x] 28. Dispute center + resolver console
  - [x] 28.1 `app/disputes/page.tsx` — resolver's case queue with priority indicators
  - [x] 28.2 `app/disputes/[id]/page.tsx` — EvidenceBundle, AISummary, ProofViewer, ResolverActions (Release/Refund + rationale ≥20 chars)
  - [x] 28.3 `ProofViewer` — inline image/PDF embed + download button

- [x] 29. Admin dashboard (`app/admin/page.tsx`)
  - [x] 29.1 `MetricsGrid` — count-up animation: active trades, locked value, open disputes, avg resolution time, trust score histogram
  - [x] 29.2 `UserManagement` — search by address, suspend (reason modal), KYC approve button
  - [x] 29.3 `RiskConfigPanel` — sliders for autoReleaseCutoff, challengeWindowCutoff, challengeWindowSeconds
  - [x] 29.4 `AuditLogTable` — paginated, filterable (actor/entity/type/date), export CSV

- [x] 30. Analytics + demo mode (`app/analytics/page.tsx`)
  - [x] 30.1 Charts (Recharts): TradeVolumeChart (line), VolumeByStablecoin (bar), TrustScoreHistogram, DisputeRateChart (line), TopTradersLeaderboard
  - [x] 30.2 Demo mode toggle — "Load Demo Data" → GET /api/analytics/demo-seed; charts update
  - [x] 30.3 Demo walkthrough panel — step-by-step guide with "Next Step" button using seeded accounts
  - Real-time chart updates via `analytics:update` WebSocket

- [x] 31. ✅ Checkpoint — all frontend pages
  - All pages render; wallet connect works; demo mode populates charts + offer book; trade flow navigates correctly

---

## SECTION E — Copy, Assets & Deployment

- [x] 32. Brand copy + UI content tokens
  - [x] 32.1 `lib/copy/landing.ts` — hero headline/subheadline, problem titles, how-it-works steps, why-APPEN features, FAQ, footer links, trust badge labels, CTA text
  - [x] 32.2 `lib/copy/microcopy.ts` — form labels, validation errors, empty states, notification templates, trade state descriptions, KYC upgrade instructions, low-trust warning, dispute rationale placeholder
  - [x] 32.3 `lib/copy/ui-tokens.ts` — trade state color map, recommendation badge labels/colors, KYC tier labels, payment rail names, stablecoin display names

- [x] 33. Demo assets + mock proof images
  - `public/demo/` — base64 placeholder receipts (bank transfer, mobile money, wire transfer)
  - `lib/demo/mockProofs.ts` — mock proof buffers + expected OCR results per demo scenario
  - _Req: 11.2_

- [x] 34. README + deployment docs
  - Project overview, tech stack, prerequisites
  - Setup: `docker-compose up` → `prisma migrate` → seed → `npm run dev`
  - Demo wallet addresses + private keys
  - 3-minute demo script walkthrough
  - Contract deployment instructions (Base Sepolia / Polygon Mumbai)
  - Vercel + Railway deployment notes

- [x] 35. Final integration wiring
  - [x] 35.1 wagmi/viem contract calls — `createEscrow`, `markPaid`, `dispute`, `release`, `refund`, `cancel`; DEMO_MODE returns mock tx hashes _(Req 2.2, 3.2–3.7)_
  - [x] 35.2 Challenge window expiry — setInterval every 60s; auto-release MARKED_PAID trades past challengeExpiresAt; update reputation + notify _(Req 3.4)_
  - [x] 35.3 24h funded timeout — same interval; expose `POST /api/trades/:id/refund-expired` for seller _(Req 3.9)_
  - [x] 35.4 DEMO_MODE bypass — accept any SIWE signature, mock tx hashes, MockOCRProvider, log-only email _(Req 11.2)_

- [x] 36. ✅ Final checkpoint — end-to-end demo
  - Seed → dev server → walk 3-min demo script: create offer → accept → upload proof → auto-release → disputed trade → resolver decision → admin dashboard → analytics

---

## Notes

| Topic | Detail |
|---|---|
| Optional tasks | Marked `*` — skip for faster MVP |
| DEMO_MODE | Set `DEMO_MODE=true` in `.env` to bypass blockchain, OCR, and email |
| Property tests | Use `fast-check` (TypeScript) or Hardhat fuzzer (Solidity) |
| Property tag format | Each test references `Prop N · Req X.Y` |
| Checkpoints | Tasks 8, 15, 22, 31, 36 — validate each layer before proceeding |
