import { prisma } from '../prisma';
import { writeAuditLog } from '../audit';
import { FraudFlag, RiskScoringInput, RiskScoringOutput } from './types';

// ─── Sub-score helpers ────────────────────────────────────────────────────────

/**
 * Amount match score: 100 if diff ≤1%, linearly scaled down to 0 at 100% diff.
 * Returns 0 if extracted amount is null.
 */
function computeAmountMatchScore(extracted: number | null, expected: number): number {
  if (extracted === null || expected === 0) return 0;
  const diff = Math.abs(extracted - expected) / expected;
  if (diff <= 0.01) return 100;
  // Linear scale: 0 at diff=1.0 (100%)
  return Math.max(0, 100 * (1 - diff));
}

/**
 * Timestamp score: 100 if within 2h of now, 0 if >24h, linear in between.
 * Returns 0 if extracted timestamp is null.
 */
function computeTimestampScore(extractedIso: string | null, referenceDate: Date): number {
  if (!extractedIso) return 0;
  const extracted = new Date(extractedIso);
  if (isNaN(extracted.getTime())) return 0;
  const diffMs = Math.abs(referenceDate.getTime() - extracted.getTime());
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours <= 2) return 100;
  if (diffHours >= 24) return 0;
  // Linear interpolation between 2h (100) and 24h (0)
  return Math.max(0, 100 * (1 - (diffHours - 2) / 22));
}

/**
 * KYC tier score: Tier0=40, Tier1=60, Tier2=80, Tier3=100
 */
function computeKycTierScore(tier: number): number {
  const map: Record<number, number> = { 0: 40, 1: 60, 2: 80, 3: 100 };
  return map[tier] ?? 40;
}

/**
 * Dispute score: 100 - (dispute_rate * 200), floor 0
 * dispute_rate = disputeCount / totalTrades (0 if no trades)
 */
function computeDisputeScore(totalTrades: number, disputeCount: number): number {
  if (totalTrades === 0) return 100;
  const rate = disputeCount / totalTrades;
  return Math.max(0, 100 - rate * 200);
}

// ─── Fraud flag detection ─────────────────────────────────────────────────────

async function detectFraudFlags(
  input: RiskScoringInput,
  expectedAmount: number,
): Promise<FraudFlag[]> {
  const flags: FraudFlag[] = [];

  // DUPLICATE_HASH: evidenceHash matches an existing proof (different proofId)
  const duplicate = await prisma.proof.findFirst({
    where: {
      evidenceHash: input.evidenceHash,
      id: { not: input.proofId },
    },
  });
  if (duplicate) flags.push(FraudFlag.DUPLICATE_HASH);

  // TIMESTAMP_PREDATES: extracted timestamp < trade.createdAt
  if (input.extraction.timestamp) {
    const extracted = new Date(input.extraction.timestamp);
    if (!isNaN(extracted.getTime()) && extracted < input.trade.createdAt) {
      flags.push(FraudFlag.TIMESTAMP_PREDATES);
    }
  }

  // AMOUNT_MISMATCH: |extracted - expected| / expected > 0.01
  if (input.extraction.amount !== null && expectedAmount > 0) {
    const diff = Math.abs(input.extraction.amount - expectedAmount) / expectedAmount;
    if (diff > 0.01) flags.push(FraudFlag.AMOUNT_MISMATCH);
  }

  // LOW_OCR_CONFIDENCE: overallConfidence < 0.5
  if (input.extraction.overallConfidence < 0.5) {
    flags.push(FraudFlag.LOW_OCR_CONFIDENCE);
  }

  return flags;
}

// ─── RiskService ──────────────────────────────────────────────────────────────

export class RiskService {
  async score(input: RiskScoringInput): Promise<RiskScoringOutput> {
    // Normalise trade amount to a plain number
    const expectedAmount =
      typeof input.trade.amount === 'object' && 'toNumber' in input.trade.amount
        ? input.trade.amount.toNumber()
        : (input.trade.amount as number);

    // ── Fetch latest RiskConfig ──────────────────────────────────────────────
    const config = await prisma.riskConfig.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    const autoReleaseCutoff = config?.autoReleaseCutoff ?? 80;
    const challengeWindowCutoff = config?.challengeWindowCutoff ?? 50;

    // ── Compute sub-scores ───────────────────────────────────────────────────
    const amountMatchScore = computeAmountMatchScore(input.extraction.amount, expectedAmount);
    const timestampScore = computeTimestampScore(input.extraction.timestamp, new Date());
    const kycTierScore = computeKycTierScore(input.buyerProfile.kycTier);
    const buyerDisputeScore = computeDisputeScore(
      input.buyerProfile.totalTrades,
      input.buyerProfile.disputeCount,
    );
    const sellerDisputeScore = computeDisputeScore(
      input.sellerProfile.totalTrades,
      input.sellerProfile.disputeCount,
    );
    const ocrConfidenceScore = input.extraction.overallConfidence * 100;

    const subScores: Record<string, number> = {
      amount_match: amountMatchScore,
      timestamp: timestampScore,
      kyc_tier: kycTierScore,
      buyer_dispute: buyerDisputeScore,
      seller_dispute: sellerDisputeScore,
      ocr_confidence: ocrConfidenceScore,
    };

    // ── Weighted trust score ─────────────────────────────────────────────────
    let trustScore =
      amountMatchScore * 0.35 +
      timestampScore * 0.20 +
      kycTierScore * 0.15 +
      buyerDisputeScore * 0.10 +
      sellerDisputeScore * 0.10 +
      ocrConfidenceScore * 0.10;

    // Clamp to [0, 100]
    trustScore = Math.min(100, Math.max(0, trustScore));

    // ── Fraud flag detection ─────────────────────────────────────────────────
    const fraudFlags = await detectFraudFlags(input, expectedAmount);

    // Any fraud flag caps the score at 30
    if (fraudFlags.length > 0) {
      trustScore = Math.min(trustScore, 30);
    }

    const finalScore = Math.round(trustScore);

    // ── Recommendation ───────────────────────────────────────────────────────
    let recommendation: RiskScoringOutput['recommendation'];
    if (finalScore >= autoReleaseCutoff) {
      recommendation = 'auto_release';
    } else if (finalScore >= challengeWindowCutoff) {
      recommendation = 'challenge_window';
    } else {
      recommendation = 'manual_review';
    }

    // ── Audit payload ────────────────────────────────────────────────────────
    const auditPayload = {
      tradeId: input.trade.id,
      proofId: input.proofId,
      evidenceHash: input.evidenceHash,
      expectedAmount,
      extractedAmount: input.extraction.amount,
      extractedTimestamp: input.extraction.timestamp,
      overallConfidence: input.extraction.overallConfidence,
      buyerKycTier: input.buyerProfile.kycTier,
      buyerDisputeRate:
        input.buyerProfile.totalTrades > 0
          ? input.buyerProfile.disputeCount / input.buyerProfile.totalTrades
          : 0,
      sellerDisputeRate:
        input.sellerProfile.totalTrades > 0
          ? input.sellerProfile.disputeCount / input.sellerProfile.totalTrades
          : 0,
      subScores,
      fraudFlags,
      finalScore,
      recommendation,
      configSnapshot: {
        autoReleaseCutoff,
        challengeWindowCutoff,
      },
    };

    // ── Persist RiskScore record ─────────────────────────────────────────────
    await prisma.riskScore.upsert({
      where: { proofId: input.proofId },
      create: {
        proofId: input.proofId,
        userId: input.trade.buyerId,
        trustScore: finalScore,
        recommendation,
        fraudFlags,
        subScores,
        auditPayload,
      },
      update: {
        trustScore: finalScore,
        recommendation,
        fraudFlags,
        subScores,
        auditPayload,
      },
    });

    // ── AuditLog: RISK_SCORED ────────────────────────────────────────────────
    await writeAuditLog({
      actionType: 'RISK_SCORED',
      entityType: 'RiskScore',
      entityId: input.proofId,
      afterState: {
        trustScore: finalScore,
        recommendation,
        fraudFlags,
      },
      metadata: auditPayload,
    });

    return {
      trustScore: finalScore,
      recommendation,
      fraudFlags,
      subScores,
      auditPayload,
    };
  }
}

export const riskService = new RiskService();
