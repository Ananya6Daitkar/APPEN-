-- CreateEnum
CREATE TYPE "TradeState" AS ENUM (
  'CREATED',
  'FUNDED',
  'MARKED_PAID',
  'UNDER_REVIEW',
  'DISPUTED',
  'RELEASED',
  'REFUNDED',
  'CANCELLED'
);

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM (
  'VERIFIED',
  'NEEDS_REVIEW',
  'SUSPICIOUS'
);

-- CreateEnum
CREATE TYPE "DisputeDecision" AS ENUM (
  'RELEASE',
  'REFUND',
  'PENDING'
);

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM (
  'IN_APP',
  'EMAIL'
);

-- CreateEnum
CREATE TYPE "AuditActionType" AS ENUM (
  'USER_CREATED',
  'SESSION_CREATED',
  'SESSION_INVALIDATED',
  'OFFER_CREATED',
  'OFFER_CANCELLED',
  'TRADE_CREATED',
  'TRADE_STATE_CHANGED',
  'PROOF_UPLOADED',
  'OCR_COMPLETED',
  'RISK_SCORED',
  'DISPUTE_CREATED',
  'DISPUTE_ASSIGNED',
  'DISPUTE_RESOLVED',
  'REPUTATION_UPDATED',
  'KYC_SUBMITTED',
  'KYC_APPROVED',
  'USER_SUSPENDED',
  'RISK_CONFIG_CHANGED',
  'NOTIFICATION_FAILED',
  'AUDIT_WRITE_FAILED'
);

-- CreateTable: User
CREATE TABLE "User" (
  "id"            TEXT         NOT NULL,
  "walletAddress" TEXT         NOT NULL,
  "email"         TEXT,
  "emailVerified" BOOLEAN      NOT NULL DEFAULT false,
  "kycTier"       INTEGER      NOT NULL DEFAULT 0,
  "kycDocRef"     TEXT,
  "isSuspended"   BOOLEAN      NOT NULL DEFAULT false,
  "suspendedAt"   TIMESTAMP(3),
  "suspendedBy"   TEXT,
  "suspendReason" TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,

  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Reputation
CREATE TABLE "Reputation" (
  "id"           TEXT         NOT NULL,
  "userId"       TEXT         NOT NULL,
  "score"        INTEGER      NOT NULL DEFAULT 500,
  "totalTrades"  INTEGER      NOT NULL DEFAULT 0,
  "totalVolume"  DECIMAL(65,30) NOT NULL DEFAULT 0,
  "disputeCount" INTEGER      NOT NULL DEFAULT 0,
  "updatedAt"    TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Reputation_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ReputationEvent
CREATE TABLE "ReputationEvent" (
  "id"           TEXT         NOT NULL,
  "reputationId" TEXT         NOT NULL,
  "tradeId"      TEXT         NOT NULL,
  "delta"        INTEGER      NOT NULL,
  "reason"       TEXT         NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ReputationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Offer
CREATE TABLE "Offer" (
  "id"           TEXT           NOT NULL,
  "sellerId"     TEXT           NOT NULL,
  "stablecoin"   TEXT           NOT NULL,
  "amount"       DECIMAL(65,30) NOT NULL,
  "fiatCurrency" TEXT           NOT NULL,
  "fiatRate"     DECIMAL(65,30) NOT NULL,
  "paymentRails" TEXT[]         NOT NULL,
  "isActive"     BOOLEAN        NOT NULL DEFAULT true,
  "onChainId"    TEXT,
  "txHash"       TEXT,
  "createdAt"    TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3)   NOT NULL,

  CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Trade
CREATE TABLE "Trade" (
  "id"                     TEXT           NOT NULL,
  "offerId"                TEXT           NOT NULL,
  "buyerId"                TEXT           NOT NULL,
  "sellerId"               TEXT           NOT NULL,
  "stablecoin"             TEXT           NOT NULL,
  "amount"                 DECIMAL(65,30) NOT NULL,
  "fiatCurrency"           TEXT           NOT NULL,
  "fiatRate"               DECIMAL(65,30) NOT NULL,
  "state"                  "TradeState"   NOT NULL DEFAULT 'CREATED',
  "onChainId"              TEXT,
  "challengeWindowSeconds" INTEGER        NOT NULL DEFAULT 1800,
  "markedPaidAt"           TIMESTAMP(3),
  "challengeExpiresAt"     TIMESTAMP(3),
  "releasedAt"             TIMESTAMP(3),
  "refundedAt"             TIMESTAMP(3),
  "createdAt"              TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3)   NOT NULL,

  CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Proof
CREATE TABLE "Proof" (
  "id"            TEXT         NOT NULL,
  "tradeId"       TEXT         NOT NULL,
  "uploaderId"    TEXT         NOT NULL,
  "evidenceHash"  TEXT         NOT NULL,
  "storageKey"    TEXT         NOT NULL,
  "mimeType"      TEXT         NOT NULL,
  "fileSizeBytes" INTEGER      NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Proof_pkey" PRIMARY KEY ("id")
);

-- CreateTable: OCRResult
CREATE TABLE "OCRResult" (
  "id"                  TEXT                 NOT NULL,
  "proofId"             TEXT                 NOT NULL,
  "amount"              DECIMAL(65,30),
  "currency"            TEXT,
  "timestamp"           TIMESTAMP(3),
  "transactionId"       TEXT,
  "payerName"           TEXT,
  "payeeName"           TEXT,
  "paymentRail"         TEXT,
  "bankName"            TEXT,
  "fieldConfidences"    JSONB                NOT NULL,
  "overallConfidence"   DOUBLE PRECISION     NOT NULL,
  "verificationStatus"  "VerificationStatus" NOT NULL,
  "explanation"         TEXT                 NOT NULL,
  "resolverSummary"     TEXT                 NOT NULL,
  "rawProviderResponse" JSONB,
  "createdAt"           TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OCRResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable: RiskScore
CREATE TABLE "RiskScore" (
  "id"             TEXT         NOT NULL,
  "proofId"        TEXT         NOT NULL,
  "userId"         TEXT         NOT NULL,
  "trustScore"     INTEGER      NOT NULL,
  "recommendation" TEXT         NOT NULL,
  "fraudFlags"     JSONB        NOT NULL,
  "subScores"      JSONB        NOT NULL,
  "auditPayload"   JSONB        NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RiskScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Dispute
CREATE TABLE "Dispute" (
  "id"         TEXT              NOT NULL,
  "tradeId"    TEXT              NOT NULL,
  "raisedById" TEXT              NOT NULL,
  "decision"   "DisputeDecision" NOT NULL DEFAULT 'PENDING',
  "createdAt"  TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),

  CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ResolverCase
CREATE TABLE "ResolverCase" (
  "id"           TEXT              NOT NULL,
  "disputeId"    TEXT              NOT NULL,
  "assignedToId" TEXT,
  "assignedAt"   TIMESTAMP(3),
  "escalatedAt"  TIMESTAMP(3),
  "decision"     "DisputeDecision" NOT NULL DEFAULT 'PENDING',
  "rationale"    TEXT,
  "aiSummary"    TEXT,
  "resolvedAt"   TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ResolverCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Notification
CREATE TABLE "Notification" (
  "id"         TEXT                  NOT NULL,
  "userId"     TEXT                  NOT NULL,
  "channel"    "NotificationChannel" NOT NULL,
  "eventType"  TEXT                  NOT NULL,
  "payload"    JSONB                 NOT NULL,
  "delivered"  BOOLEAN               NOT NULL DEFAULT false,
  "retryCount" INTEGER               NOT NULL DEFAULT 0,
  "failedAt"   TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AuditLog
CREATE TABLE "AuditLog" (
  "id"           TEXT              NOT NULL,
  "actorId"      TEXT,
  "actorAddress" TEXT,
  "actionType"   "AuditActionType" NOT NULL,
  "entityType"   TEXT              NOT NULL,
  "entityId"     TEXT              NOT NULL,
  "beforeState"  JSONB,
  "afterState"   JSONB,
  "metadata"     JSONB,
  "contentHash"  TEXT              NOT NULL,
  "previousHash" TEXT,
  "createdAt"    TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable: RiskConfig
CREATE TABLE "RiskConfig" (
  "id"                    TEXT         NOT NULL,
  "autoReleaseCutoff"     INTEGER      NOT NULL DEFAULT 80,
  "challengeWindowCutoff" INTEGER      NOT NULL DEFAULT 50,
  "manualReviewCutoff"    INTEGER      NOT NULL DEFAULT 50,
  "challengeWindowSeconds" INTEGER     NOT NULL DEFAULT 1800,
  "updatedBy"             TEXT         NOT NULL,
  "updatedAt"             TIMESTAMP(3) NOT NULL,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RiskConfig_pkey" PRIMARY KEY ("id")
);

-- ─── Unique Constraints ───────────────────────────────────────────────────────

ALTER TABLE "User"         ADD CONSTRAINT "User_walletAddress_key" UNIQUE ("walletAddress");
ALTER TABLE "User"         ADD CONSTRAINT "User_email_key"         UNIQUE ("email");
ALTER TABLE "Reputation"   ADD CONSTRAINT "Reputation_userId_key"  UNIQUE ("userId");
ALTER TABLE "Trade"        ADD CONSTRAINT "Trade_offerId_key"       UNIQUE ("offerId");
ALTER TABLE "OCRResult"    ADD CONSTRAINT "OCRResult_proofId_key"   UNIQUE ("proofId");
ALTER TABLE "RiskScore"    ADD CONSTRAINT "RiskScore_proofId_key"   UNIQUE ("proofId");
ALTER TABLE "Dispute"      ADD CONSTRAINT "Dispute_tradeId_key"     UNIQUE ("tradeId");
ALTER TABLE "ResolverCase" ADD CONSTRAINT "ResolverCase_disputeId_key" UNIQUE ("disputeId");

-- ─── Foreign Keys ─────────────────────────────────────────────────────────────

ALTER TABLE "Reputation"
  ADD CONSTRAINT "Reputation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReputationEvent"
  ADD CONSTRAINT "ReputationEvent_reputationId_fkey"
  FOREIGN KEY ("reputationId") REFERENCES "Reputation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Offer"
  ADD CONSTRAINT "Offer_sellerId_fkey"
  FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Trade"
  ADD CONSTRAINT "Trade_offerId_fkey"
  FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Trade"
  ADD CONSTRAINT "Trade_buyerId_fkey"
  FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Trade"
  ADD CONSTRAINT "Trade_sellerId_fkey"
  FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Proof"
  ADD CONSTRAINT "Proof_tradeId_fkey"
  FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OCRResult"
  ADD CONSTRAINT "OCRResult_proofId_fkey"
  FOREIGN KEY ("proofId") REFERENCES "Proof"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RiskScore"
  ADD CONSTRAINT "RiskScore_proofId_fkey"
  FOREIGN KEY ("proofId") REFERENCES "Proof"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RiskScore"
  ADD CONSTRAINT "RiskScore_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Dispute"
  ADD CONSTRAINT "Dispute_tradeId_fkey"
  FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ResolverCase"
  ADD CONSTRAINT "ResolverCase_disputeId_fkey"
  FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ResolverCase"
  ADD CONSTRAINT "ResolverCase_assignedToId_fkey"
  FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Indexes ──────────────────────────────────────────────────────────────────

-- User
CREATE INDEX "User_walletAddress_idx" ON "User"("walletAddress");
CREATE INDEX "User_email_idx"         ON "User"("email");
CREATE INDEX "User_kycTier_idx"       ON "User"("kycTier");
CREATE INDEX "User_isSuspended_idx"   ON "User"("isSuspended");

-- Reputation
CREATE INDEX "Reputation_userId_idx" ON "Reputation"("userId");
CREATE INDEX "Reputation_score_idx"  ON "Reputation"("score");

-- ReputationEvent
CREATE INDEX "ReputationEvent_reputationId_idx" ON "ReputationEvent"("reputationId");
CREATE INDEX "ReputationEvent_tradeId_idx"       ON "ReputationEvent"("tradeId");

-- Offer
CREATE INDEX "Offer_sellerId_idx"     ON "Offer"("sellerId");
CREATE INDEX "Offer_stablecoin_idx"   ON "Offer"("stablecoin");
CREATE INDEX "Offer_fiatCurrency_idx" ON "Offer"("fiatCurrency");
CREATE INDEX "Offer_isActive_idx"     ON "Offer"("isActive");
CREATE INDEX "Offer_createdAt_idx"    ON "Offer"("createdAt" DESC);

-- Trade
CREATE INDEX "Trade_buyerId_idx"   ON "Trade"("buyerId");
CREATE INDEX "Trade_sellerId_idx"  ON "Trade"("sellerId");
CREATE INDEX "Trade_state_idx"     ON "Trade"("state");
CREATE INDEX "Trade_createdAt_idx" ON "Trade"("createdAt" DESC);
CREATE INDEX "Trade_challengeExpiresAt_idx" ON "Trade"("challengeExpiresAt");

-- Proof
CREATE INDEX "Proof_tradeId_idx"    ON "Proof"("tradeId");
CREATE INDEX "Proof_uploaderId_idx" ON "Proof"("uploaderId");

-- RiskScore
CREATE INDEX "RiskScore_userId_idx"     ON "RiskScore"("userId");
CREATE INDEX "RiskScore_trustScore_idx" ON "RiskScore"("trustScore");

-- Dispute
CREATE INDEX "Dispute_tradeId_idx"    ON "Dispute"("tradeId");
CREATE INDEX "Dispute_raisedById_idx" ON "Dispute"("raisedById");
CREATE INDEX "Dispute_decision_idx"   ON "Dispute"("decision");

-- ResolverCase
CREATE INDEX "ResolverCase_assignedToId_idx" ON "ResolverCase"("assignedToId");
CREATE INDEX "ResolverCase_decision_idx"     ON "ResolverCase"("decision");
CREATE INDEX "ResolverCase_escalatedAt_idx"  ON "ResolverCase"("escalatedAt");

-- Notification
CREATE INDEX "Notification_userId_idx"    ON "Notification"("userId");
CREATE INDEX "Notification_delivered_idx" ON "Notification"("delivered");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt" DESC);

-- AuditLog
CREATE INDEX "AuditLog_actorId_idx"     ON "AuditLog"("actorId");
CREATE INDEX "AuditLog_entityId_idx"    ON "AuditLog"("entityId");
CREATE INDEX "AuditLog_entityType_idx"  ON "AuditLog"("entityType");
CREATE INDEX "AuditLog_actionType_idx"  ON "AuditLog"("actionType");
CREATE INDEX "AuditLog_createdAt_idx"   ON "AuditLog"("createdAt" DESC);
