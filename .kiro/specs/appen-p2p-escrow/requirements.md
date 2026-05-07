# Requirements Document

## Introduction

APPEN (Adaptive Proof-of-Payment Escrow Network) is a production-grade Web3 P2P fiat-to-stablecoin trading platform. It enables secure peer-to-peer exchange of USDT/USDC for fiat currency using self-custodial smart-contract escrow, AI-assisted proof-of-payment verification, adaptive risk scoring, on-chain reputation, and structured dispute resolution.

The core problem APPEN solves is the trust gap on the fiat side of P2P trades: stablecoins are locked on-chain in a non-custodial escrow contract while fiat payment proof is verified through a layered pipeline of OCR extraction, deterministic rule matching, fraud heuristics, and human arbitration fallback. The platform targets hackathon judges evaluating clarity, trust, UX, and technical depth, while remaining realistically extensible for production corridors.

## Glossary

- **Platform**: The APPEN web application and its backend services collectively
- **Escrow_Contract**: The Solidity smart contract that holds stablecoin funds during a trade
- **Buyer**: A user who accepts an offer and sends fiat in exchange for stablecoins
- **Seller**: A user who creates an offer and locks stablecoins into the Escrow_Contract
- **Resolver**: A trusted arbitrator who adjudicates disputed trades
- **Admin**: A compliance operator with elevated platform privileges
- **Offer**: A Seller's published intent to sell a specific stablecoin amount at a specific fiat rate
- **Trade**: An active escrow instance created when a Buyer accepts an Offer
- **Proof**: A Buyer-uploaded payment receipt (image or PDF) evidencing fiat transfer
- **OCR_Engine**: The backend service that extracts structured data from Proof documents
- **Risk_Engine**: The backend service that computes a trust score for a given Proof and Trade
- **Reputation_Service**: The backend service that maintains and updates trader scores
- **Dispute**: A formal challenge raised by either party when a Trade cannot be auto-resolved
- **Resolver_Case**: A structured evidence bundle created when a Trade enters Disputed state
- **KYC_Tier**: A compliance level (0–3) assigned to a user based on identity verification
- **Payment_Rail**: A supported fiat transfer method (e.g., bank transfer, mobile money)
- **Stablecoin**: USDT or USDC on Base or Polygon testnet
- **Trust_Score**: A numeric value (0–100) computed by the Risk_Engine for a given Proof
- **Challenge_Window**: A configurable time period during which a Seller may dispute a marked-paid Trade
- **Audit_Log**: An immutable append-only record of all platform actions and state changes
- **Evidence_Hash**: A SHA-256 hash of a Proof file stored on-chain for tamper evidence
- **Notification_Service**: The backend service that delivers in-app, email, and WebSocket notifications

---

## Requirements

### Requirement 1: Wallet Authentication and User Onboarding

**User Story:** As a Buyer or Seller, I want to connect my self-custodial wallet and create a platform profile, so that I can trade without surrendering custody of my funds.

#### Acceptance Criteria

1. WHEN a user connects a wallet via WalletConnect or RainbowKit, THE Platform SHALL authenticate the user by verifying a signed message (SIWE — Sign-In with Ethereum) without storing private keys.
2. WHEN a user authenticates for the first time, THE Platform SHALL create a user profile with a default KYC_Tier of 0 and a default Trust_Score of 50.
3. WHEN a user disconnects their wallet, THE Platform SHALL invalidate the active session within 5 seconds.
4. WHERE email/OTP authentication is enabled, THE Platform SHALL allow a user to link an email address to their wallet address for notification delivery.
5. IF a wallet signature verification fails, THEN THE Platform SHALL return an error message identifying the failure reason and SHALL NOT create a session.
6. THE Platform SHALL support MetaMask, Coinbase Wallet, and WalletConnect-compatible wallets.

---

### Requirement 2: Offer Creation and Management

**User Story:** As a Seller, I want to create, publish, and manage stablecoin sell offers, so that Buyers can discover and accept my terms.

#### Acceptance Criteria

1. WHEN a Seller submits an Offer, THE Platform SHALL validate that the specified stablecoin amount is greater than zero, the fiat rate is greater than zero, and at least one Payment_Rail is selected before persisting the Offer.
2. WHEN a valid Offer is submitted, THE Escrow_Contract SHALL lock the specified stablecoin amount from the Seller's wallet into escrow within the same transaction.
3. THE Platform SHALL display all active Offers in a paginated Offer book sorted by creation time descending, with filters for stablecoin type, Payment_Rail, and fiat currency.
4. WHEN a Seller cancels an Offer that has no active Trade, THE Escrow_Contract SHALL release the locked stablecoins back to the Seller's wallet.
5. IF a Seller attempts to cancel an Offer with an active Trade, THEN THE Platform SHALL reject the cancellation and SHALL display the active Trade identifier to the Seller.
6. WHILE an Offer is active, THE Platform SHALL prevent the same Seller from creating a duplicate Offer with identical amount, rate, and Payment_Rail within a 60-second window.
7. THE Platform SHALL support a minimum Offer amount of 10 USDT/USDC and a maximum of 50,000 USDT/USDC per Offer.

---

### Requirement 3: Trade Lifecycle and Escrow State Machine

**User Story:** As a Buyer or Seller, I want a transparent, on-chain trade lifecycle with clear state transitions, so that both parties know exactly where funds are at all times.

#### Acceptance Criteria

1. THE Escrow_Contract SHALL enforce the following state machine: Created → Funded → MarkedPaid → UnderReview → Released or Refunded; and Created → Cancelled; and Funded → Disputed → Released or Refunded.
2. WHEN a Buyer accepts an Offer, THE Platform SHALL create a Trade record in Created state and SHALL transition it to Funded state upon confirmation of the Escrow_Contract lock transaction.
3. WHEN a Buyer marks a Trade as paid, THE Escrow_Contract SHALL transition the Trade to MarkedPaid state and SHALL start the Challenge_Window timer.
4. WHEN the Challenge_Window expires without a Seller dispute, THE Escrow_Contract SHALL automatically transition the Trade to Released state and SHALL transfer stablecoins to the Buyer's wallet.
5. WHEN a Seller raises a dispute before the Challenge_Window expires, THE Escrow_Contract SHALL transition the Trade to Disputed state and THE Platform SHALL create a Resolver_Case.
6. WHEN a Resolver resolves a Resolver_Case in favor of the Buyer, THE Escrow_Contract SHALL transition the Trade to Released state and SHALL transfer stablecoins to the Buyer's wallet.
7. WHEN a Resolver resolves a Resolver_Case in favor of the Seller, THE Escrow_Contract SHALL transition the Trade to Refunded state and SHALL return stablecoins to the Seller's wallet.
8. THE Escrow_Contract SHALL emit a distinct on-chain event for every state transition, including the actor address, timestamp, and new state.
9. IF a Trade remains in Funded state for more than 24 hours without a MarkedPaid action, THEN THE Escrow_Contract SHALL allow the Seller to trigger a Refunded transition.
10. THE Escrow_Contract SHALL be pausable by the Admin address for emergency circuit-breaking, and WHILE paused, THE Escrow_Contract SHALL reject all state-changing calls except Admin unpause.

---

### Requirement 4: Proof-of-Payment Upload and Parsing

**User Story:** As a Buyer, I want to upload my payment receipt and have it automatically verified, so that the trade can be resolved quickly without manual intervention.

#### Acceptance Criteria

1. WHEN a Buyer uploads a Proof file, THE Platform SHALL accept JPEG, PNG, and PDF formats up to 10 MB in size.
2. WHEN a Proof file is received, THE Platform SHALL compute a SHA-256 Evidence_Hash of the file and SHALL store the hash in the Trade record before processing begins.
3. WHEN a Proof file is stored, THE Platform SHALL encrypt the file at rest using AES-256 and SHALL store it in S3-compatible object storage with a path scoped to the Trade identifier.
4. WHEN a Proof file is stored, THE OCR_Engine SHALL extract the following fields: transaction amount, transaction timestamp, payment reference number, payer name, recipient name or account, and payment rail identifier.
5. WHEN OCR extraction completes, THE OCR_Engine SHALL return a structured JSON payload containing each extracted field, a per-field confidence score between 0 and 1, and an overall extraction confidence score between 0 and 1.
6. IF the OCR_Engine fails to extract the transaction amount or transaction timestamp with a confidence score above 0.5, THEN THE Platform SHALL flag the Proof as low-confidence and SHALL route the Trade to UnderReview state.
7. THE OCR_Engine SHALL complete extraction within 30 seconds of file receipt under normal load conditions.
8. THE Platform SHALL support a modular OCR_Engine interface so that the underlying AI provider (e.g., OpenAI Vision, Google Document AI, AWS Textract) can be swapped without changing the Trade lifecycle logic.

---

### Requirement 5: Risk Scoring Engine

**User Story:** As the Platform, I want to automatically assess the trustworthiness of each payment proof, so that low-risk trades release instantly while high-risk trades receive additional scrutiny.

#### Acceptance Criteria

1. WHEN OCR extraction completes for a Trade, THE Risk_Engine SHALL compute a Trust_Score between 0 and 100 for the Proof.
2. THE Risk_Engine SHALL incorporate the following signals into the Trust_Score: extracted amount vs. expected trade amount match, extracted timestamp recency (within 2 hours of MarkedPaid action), Seller's historical dispute rate, Buyer's historical dispute rate, Buyer's KYC_Tier, image metadata anomaly flags, and duplicate receipt detection.
3. WHEN the Trust_Score is 80 or above, THE Risk_Engine SHALL recommend auto-release and THE Platform SHALL transition the Trade to Released state without human review.
4. WHEN the Trust_Score is between 50 and 79 inclusive, THE Risk_Engine SHALL recommend a Challenge_Window of 30 minutes during which the Seller may raise a dispute.
5. WHEN the Trust_Score is below 50, THE Risk_Engine SHALL recommend manual review and THE Platform SHALL transition the Trade to UnderReview state and SHALL notify the assigned Resolver.
6. THE Risk_Engine SHALL flag a Proof as potentially fraudulent when any of the following conditions are detected: the Evidence_Hash matches a previously submitted Proof, the extracted timestamp predates the Trade creation time, or the extracted amount differs from the expected amount by more than 1%.
7. THE Risk_Engine SHALL expose configurable thresholds for auto-release, challenge window, and manual review cutoffs via an Admin-accessible configuration interface.
8. THE Risk_Engine SHALL log every scoring decision with the input signals, computed sub-scores, final Trust_Score, and recommended action to the Audit_Log.

---

### Requirement 6: Reputation and Trader History

**User Story:** As a Buyer or Seller, I want my trading history and reputation score to be visible on my profile, so that counterparties can make informed trust decisions.

#### Acceptance Criteria

1. THE Reputation_Service SHALL maintain a reputation score between 0 and 1000 for every user, initialized at 500 on first trade completion.
2. WHEN a Trade reaches Released state, THE Reputation_Service SHALL increment both the Buyer's and Seller's reputation scores by a value proportional to the trade volume, capped at 10 points per trade.
3. WHEN a Trade reaches Refunded state following a Resolver decision against the Buyer, THE Reputation_Service SHALL decrement the Buyer's reputation score by 20 points.
4. WHEN a Trade reaches Refunded state following a Resolver decision against the Seller, THE Reputation_Service SHALL decrement the Seller's reputation score by 20 points.
5. THE Platform SHALL display on each user's public profile: total completed trades, total volume traded, reputation score, dispute rate as a percentage, and member since date.
6. WHEN a user's reputation score falls below 200, THE Platform SHALL restrict the user to a maximum active Trade count of 1 and SHALL display a low-trust warning on their profile.
7. THE Reputation_Service SHALL record every score change with the triggering Trade identifier, delta value, and timestamp in the Audit_Log.

---

### Requirement 7: Dispute Center and Resolver Console

**User Story:** As a Resolver, I want a structured console with all trade evidence and an AI-generated case summary, so that I can adjudicate disputes fairly and efficiently.

#### Acceptance Criteria

1. WHEN a Trade enters Disputed state, THE Platform SHALL create a Resolver_Case containing: the Trade record, the Proof file reference, the OCR extraction result, the Risk_Engine scoring report, the Buyer's and Seller's message thread, and both parties' wallet addresses and reputation scores.
2. WHEN a Resolver_Case is created, THE Platform SHALL generate an AI-produced case summary of no more than 300 words describing the trade details, the disputed claim, the extracted proof data, and the Risk_Engine recommendation.
3. THE Platform SHALL assign a Resolver_Case to an available Resolver within 15 minutes of creation using a round-robin assignment algorithm.
4. WHEN a Resolver is assigned a case, THE Notification_Service SHALL deliver an in-app notification and an email notification to the Resolver within 60 seconds.
5. THE Resolver console SHALL display the Resolver_Case evidence bundle, the AI case summary, the Proof image or PDF inline, and action buttons for Release and Refund decisions.
6. WHEN a Resolver submits a Release or Refund decision, THE Platform SHALL record the decision with the Resolver's address, timestamp, and a mandatory written rationale of at least 20 characters before executing the Escrow_Contract action.
7. IF a Resolver_Case is not resolved within 48 hours of assignment, THEN THE Platform SHALL escalate the case to the Admin and SHALL notify both trade parties of the escalation.
8. THE Platform SHALL prevent a Resolver from adjudicating a case where the Resolver's wallet address matches either the Buyer's or Seller's wallet address.

---

### Requirement 8: Notification Service

**User Story:** As a Buyer, Seller, or Resolver, I want timely notifications for every trade event, so that I can act promptly and never miss a critical state change.

#### Acceptance Criteria

1. THE Notification_Service SHALL deliver in-app notifications via WebSocket push to connected clients within 5 seconds of a triggering trade event.
2. THE Notification_Service SHALL deliver email notifications within 2 minutes of a triggering trade event for users who have linked an email address.
3. THE Notification_Service SHALL send notifications for the following events: Trade created, Trade funded, Buyer marked paid, Challenge_Window started, Challenge_Window expiring (10 minutes remaining), Trade released, Trade refunded, Dispute raised, Resolver assigned, Resolver_Case resolved, and escalation to Admin.
4. WHEN a notification delivery fails, THE Notification_Service SHALL retry delivery up to 3 times with exponential backoff before marking the notification as failed and logging the failure to the Audit_Log.
5. THE Platform SHALL allow users to configure notification preferences per event type for email delivery, while in-app WebSocket notifications SHALL always be delivered for active sessions.

---

### Requirement 9: KYC and Compliance Tiering

**User Story:** As an Admin, I want a tiered KYC system that gates trade limits by verification level, so that the platform meets compliance requirements while remaining accessible to unverified users for small trades.

#### Acceptance Criteria

1. THE Platform SHALL define four KYC_Tiers: Tier 0 (wallet-only, no verification), Tier 1 (email verified), Tier 2 (government ID submitted), and Tier 3 (government ID verified by Admin).
2. THE Platform SHALL enforce the following trade limits per KYC_Tier: Tier 0 maximum single trade of 500 USDT/USDC; Tier 1 maximum single trade of 2,000 USDT/USDC; Tier 2 maximum single trade of 10,000 USDT/USDC; Tier 3 maximum single trade of 50,000 USDT/USDC.
3. WHEN a Buyer or Seller attempts to create or accept a Trade that exceeds their KYC_Tier limit, THE Platform SHALL reject the action and SHALL display the required KYC_Tier and upgrade instructions.
4. WHEN an Admin approves a KYC_Tier 3 upgrade for a user, THE Platform SHALL record the approving Admin address, the approval timestamp, and the submitted document reference in the Audit_Log.
5. THE Platform SHALL store KYC document references as encrypted identifiers and SHALL NOT store raw identity document images in the primary database.

---

### Requirement 10: Admin Dashboard and Compliance Controls

**User Story:** As an Admin, I want a comprehensive dashboard to monitor platform health, manage users, and respond to compliance events, so that I can operate the platform safely.

#### Acceptance Criteria

1. THE Admin dashboard SHALL display real-time metrics including: total active trades, total locked stablecoin value, open dispute count, average trade resolution time, and platform-wide Trust_Score distribution.
2. WHEN an Admin suspends a user, THE Platform SHALL immediately cancel all of the user's active Offers, block the user from creating new Trades, and log the suspension with the Admin address and reason.
3. THE Platform SHALL provide an Admin interface to adjust Risk_Engine thresholds (auto-release cutoff, challenge window cutoff, manual review cutoff) with changes taking effect within 60 seconds and logged to the Audit_Log.
4. THE Escrow_Contract SHALL expose a pause function callable only by the designated Admin address, and WHEN paused, THE Escrow_Contract SHALL emit a Paused event with the Admin address and timestamp.
5. THE Admin dashboard SHALL provide an exportable Audit_Log view filterable by user address, Trade identifier, event type, and date range.

---

### Requirement 11: Analytics and Demo Mode

**User Story:** As a hackathon judge or platform operator, I want an analytics panel with live and seeded demo data, so that I can evaluate platform performance and trading activity at a glance.

#### Acceptance Criteria

1. THE Platform SHALL provide an analytics page displaying: total trades over time (line chart), trade volume by stablecoin (bar chart), Trust_Score distribution (histogram), dispute rate over time (line chart), and top traders by volume (leaderboard).
2. WHEN demo mode is activated, THE Platform SHALL load a pre-seeded dataset of at least 50 completed trades, 5 disputed trades, and 10 active offers to populate all analytics charts and the Offer book.
3. THE Platform SHALL update analytics charts in real time via WebSocket when new trade events occur during an active session.
4. THE Platform SHALL provide a demo walkthrough script accessible from the analytics page that guides a judge through the primary Buyer and Seller flows using seeded test accounts.

---

### Requirement 12: Smart Contract Safety and Token Handling

**User Story:** As a Buyer or Seller, I want the escrow smart contract to handle tokens safely and be auditable, so that funds cannot be lost due to contract bugs or malicious actors.

#### Acceptance Criteria

1. THE Escrow_Contract SHALL use OpenZeppelin's SafeERC20 library for all ERC-20 token transfers to prevent silent transfer failures.
2. THE Escrow_Contract SHALL use OpenZeppelin's ReentrancyGuard on all external functions that transfer tokens to prevent reentrancy attacks.
3. THE Escrow_Contract SHALL use OpenZeppelin's Ownable or AccessControl to restrict Admin functions to authorized addresses only.
4. THE Escrow_Contract SHALL include a test suite with unit tests covering every state transition, every role-restricted function, every timeout scenario, and every error condition, achieving a minimum of 90% line coverage.
5. WHEN a token transfer within the Escrow_Contract fails, THE Escrow_Contract SHALL revert the entire transaction and SHALL NOT update any state variables.
6. THE Escrow_Contract SHALL NOT hold native ETH/MATIC; THE Escrow_Contract SHALL only accept whitelisted ERC-20 stablecoin addresses set at deployment time.

---

### Requirement 13: Proof-of-Payment Parser Round-Trip Integrity

**User Story:** As the Platform, I want proof parsing to be verifiable and tamper-evident, so that extracted data can be trusted in dispute resolution.

#### Acceptance Criteria

1. THE OCR_Engine SHALL serialize extracted Proof data to a canonical JSON format defined by the ProofExtraction schema.
2. THE OCR_Engine SHALL deserialize a serialized ProofExtraction JSON back into a structured object without data loss.
3. FOR ALL valid ProofExtraction objects, serializing then deserializing SHALL produce an object equal to the original (round-trip property).
4. WHEN a Proof file's Evidence_Hash is computed, THE Platform SHALL store the hash before any transformation or compression of the file, ensuring the hash reflects the original uploaded bytes.
5. THE Platform SHALL expose an Evidence_Hash verification endpoint that accepts a Trade identifier and a file, recomputes the hash, and returns whether the hash matches the stored value.

---

### Requirement 14: Audit Trail and Observability

**User Story:** As an Admin or Resolver, I want a complete, tamper-evident audit trail of all platform actions, so that every decision can be reviewed and every anomaly can be investigated.

#### Acceptance Criteria

1. THE Platform SHALL append an Audit_Log entry for every state transition, user action, Risk_Engine decision, Reputation_Service update, and Admin configuration change.
2. EACH Audit_Log entry SHALL contain: entry identifier, actor address or system identifier, action type, affected entity type and identifier, before-state, after-state, timestamp (UTC), and a SHA-256 hash of the entry content chained to the previous entry hash.
3. THE Platform SHALL expose a read-only Audit_Log API accessible to Admins and Resolvers, with pagination and filtering by actor, entity, action type, and date range.
4. THE Platform SHALL emit structured JSON logs for all backend service operations, including request identifiers, service name, log level, and duration for timed operations.
5. IF an Audit_Log write fails, THEN THE Platform SHALL halt the triggering operation, log the failure to a separate error sink, and SHALL NOT silently proceed with a state change that has no audit record.
