/**
 * Unit tests for RiskService.score()
 * Validates: Requirements 5.1–5.8
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock prisma and audit before importing RiskService ──────────────────────
vi.mock('../prisma', () => ({
  prisma: {
    riskConfig: {
      findFirst: vi.fn(),
    },
    proof: {
      findFirst: vi.fn(),
    },
    riskScore: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock('../audit', () => ({
  writeAuditLog: vi.fn(),
}));

import { prisma } from '../prisma';
import { writeAuditLog } from '../audit';
import { RiskService } from './RiskService';
import { FraudFlag } from './types';
import type { RiskScoringInput } from './types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeInput(overrides: Partial<RiskScoringInput> = {}): RiskScoringInput {
  return {
    extraction: {
      tradeId: 'trade-1',
      proofId: 'proof-1',
      amount: 100,
      currency: 'USD',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
      transactionId: 'txn-abc',
      payerName: 'Alice',
      payeeName: 'Bob',
      paymentRail: 'bank_transfer',
      bankName: 'Test Bank',
      fieldConfidences: {
        amount: 0.95,
        currency: 0.95,
        timestamp: 0.95,
        transactionId: 0.9,
        payerName: 0.9,
        payeeName: 0.9,
        paymentRail: 0.9,
        bankName: 0.9,
      },
      overallConfidence: 0.92,
      verificationStatus: 'verified',
      explanation: 'All fields extracted successfully',
      resolverSummary: 'Clean receipt',
    },
    trade: {
      id: 'trade-1',
      amount: 100,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2h ago
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
    },
    buyerProfile: {
      userId: 'buyer-1',
      kycTier: 2,
      totalTrades: 20,
      disputeCount: 1,
    },
    sellerProfile: {
      userId: 'seller-1',
      kycTier: 2,
      totalTrades: 50,
      disputeCount: 2,
    },
    evidenceHash: 'abc123hash',
    proofId: 'proof-1',
    ...overrides,
  };
}

function setupMocks(configOverrides?: Partial<{ autoReleaseCutoff: number; challengeWindowCutoff: number }>) {
  vi.mocked(prisma.riskConfig.findFirst).mockResolvedValue({
    id: 'cfg-1',
    autoReleaseCutoff: configOverrides?.autoReleaseCutoff ?? 80,
    challengeWindowCutoff: configOverrides?.challengeWindowCutoff ?? 50,
    manualReviewCutoff: 50,
    challengeWindowSeconds: 1800,
    updatedBy: 'admin',
    updatedAt: new Date(),
    createdAt: new Date(),
  });
  vi.mocked(prisma.proof.findFirst).mockResolvedValue(null); // no duplicate
  vi.mocked(prisma.riskScore.upsert).mockResolvedValue({} as never);
  vi.mocked(writeAuditLog).mockResolvedValue({} as never);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('RiskService.score()', () => {
  let service: RiskService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RiskService();
  });

  describe('trust score range', () => {
    it('returns a trustScore between 0 and 100', async () => {
      setupMocks();
      const result = await service.score(makeInput());
      expect(result.trustScore).toBeGreaterThanOrEqual(0);
      expect(result.trustScore).toBeLessThanOrEqual(100);
    });

    it('produces a high score for a clean, high-confidence proof', async () => {
      setupMocks();
      const result = await service.score(makeInput());
      // With KYC2, low dispute rates, recent timestamp, matching amount, high OCR confidence
      expect(result.trustScore).toBeGreaterThan(70);
    });

    it('produces a low score when all signals are poor', async () => {
      setupMocks();
      const input = makeInput({
        extraction: {
          ...makeInput().extraction,
          amount: 200,           // 100% mismatch
          timestamp: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(), // 30h ago
          overallConfidence: 0.3,
        },
        buyerProfile: { userId: 'b', kycTier: 0, totalTrades: 10, disputeCount: 5 },
        sellerProfile: { userId: 's', kycTier: 0, totalTrades: 10, disputeCount: 5 },
      });
      const result = await service.score(input);
      // Fraud flags will cap at 30 (amount mismatch + low OCR confidence)
      expect(result.trustScore).toBeLessThanOrEqual(30);
    });
  });

  describe('weighted formula sub-scores', () => {
    it('includes all 6 sub-scores in the output', async () => {
      setupMocks();
      const result = await service.score(makeInput());
      expect(result.subScores).toHaveProperty('amount_match');
      expect(result.subScores).toHaveProperty('timestamp');
      expect(result.subScores).toHaveProperty('kyc_tier');
      expect(result.subScores).toHaveProperty('buyer_dispute');
      expect(result.subScores).toHaveProperty('seller_dispute');
      expect(result.subScores).toHaveProperty('ocr_confidence');
    });

    it('amount_match is 100 when extracted equals expected', async () => {
      setupMocks();
      const result = await service.score(makeInput({ extraction: { ...makeInput().extraction, amount: 100 } }));
      expect(result.subScores.amount_match).toBe(100);
    });

    it('amount_match is 100 when diff is exactly 1%', async () => {
      setupMocks();
      const result = await service.score(makeInput({ extraction: { ...makeInput().extraction, amount: 101 } }));
      expect(result.subScores.amount_match).toBe(100);
    });

    it('amount_match is 0 when extracted amount is null', async () => {
      setupMocks();
      const result = await service.score(makeInput({ extraction: { ...makeInput().extraction, amount: null } }));
      expect(result.subScores.amount_match).toBe(0);
    });

    it('kyc_tier score maps correctly: Tier0=40, Tier1=60, Tier2=80, Tier3=100', async () => {
      setupMocks();
      for (const [tier, expected] of [[0, 40], [1, 60], [2, 80], [3, 100]] as const) {
        const result = await service.score(makeInput({
          buyerProfile: { userId: 'b', kycTier: tier, totalTrades: 0, disputeCount: 0 },
        }));
        expect(result.subScores.kyc_tier).toBe(expected);
      }
    });

    it('timestamp score is 100 when within 2 hours', async () => {
      setupMocks();
      const result = await service.score(makeInput({
        extraction: {
          ...makeInput().extraction,
          timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1h ago
        },
      }));
      expect(result.subScores.timestamp).toBe(100);
    });

    it('timestamp score is 0 when older than 24 hours', async () => {
      setupMocks();
      const result = await service.score(makeInput({
        extraction: {
          ...makeInput().extraction,
          timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25h ago
        },
      }));
      expect(result.subScores.timestamp).toBe(0);
    });

    it('timestamp score is 0 when timestamp is null', async () => {
      setupMocks();
      const result = await service.score(makeInput({
        extraction: { ...makeInput().extraction, timestamp: null },
      }));
      expect(result.subScores.timestamp).toBe(0);
    });

    it('buyer_dispute score is 100 when no trades', async () => {
      setupMocks();
      const result = await service.score(makeInput({
        buyerProfile: { userId: 'b', kycTier: 2, totalTrades: 0, disputeCount: 0 },
      }));
      expect(result.subScores.buyer_dispute).toBe(100);
    });

    it('buyer_dispute score floors at 0 for high dispute rate', async () => {
      setupMocks();
      const result = await service.score(makeInput({
        buyerProfile: { userId: 'b', kycTier: 2, totalTrades: 10, disputeCount: 10 },
      }));
      expect(result.subScores.buyer_dispute).toBe(0);
    });

    it('ocr_confidence score equals overallConfidence * 100', async () => {
      setupMocks();
      const result = await service.score(makeInput({
        extraction: { ...makeInput().extraction, overallConfidence: 0.75 },
      }));
      expect(result.subScores.ocr_confidence).toBe(75);
    });
  });

  describe('fraud flags', () => {
    it('detects DUPLICATE_HASH when evidenceHash matches another proof', async () => {
      setupMocks();
      vi.mocked(prisma.proof.findFirst).mockResolvedValue({ id: 'other-proof' } as never);
      const result = await service.score(makeInput());
      expect(result.fraudFlags).toContain(FraudFlag.DUPLICATE_HASH);
    });

    it('detects TIMESTAMP_PREDATES when extracted timestamp is before trade creation', async () => {
      setupMocks();
      const tradeCreatedAt = new Date('2024-01-10T12:00:00Z');
      const result = await service.score(makeInput({
        trade: { ...makeInput().trade, createdAt: tradeCreatedAt },
        extraction: {
          ...makeInput().extraction,
          timestamp: '2024-01-09T10:00:00Z', // before trade creation
        },
      }));
      expect(result.fraudFlags).toContain(FraudFlag.TIMESTAMP_PREDATES);
    });

    it('detects AMOUNT_MISMATCH when diff > 1%', async () => {
      setupMocks();
      const result = await service.score(makeInput({
        extraction: { ...makeInput().extraction, amount: 102 }, // 2% diff
      }));
      expect(result.fraudFlags).toContain(FraudFlag.AMOUNT_MISMATCH);
    });

    it('does NOT flag AMOUNT_MISMATCH when diff is exactly 1%', async () => {
      setupMocks();
      const result = await service.score(makeInput({
        extraction: { ...makeInput().extraction, amount: 101 }, // exactly 1%
      }));
      expect(result.fraudFlags).not.toContain(FraudFlag.AMOUNT_MISMATCH);
    });

    it('detects LOW_OCR_CONFIDENCE when overallConfidence < 0.5', async () => {
      setupMocks();
      const result = await service.score(makeInput({
        extraction: { ...makeInput().extraction, overallConfidence: 0.4 },
      }));
      expect(result.fraudFlags).toContain(FraudFlag.LOW_OCR_CONFIDENCE);
    });

    it('caps trustScore at 30 when any fraud flag is present', async () => {
      setupMocks();
      vi.mocked(prisma.proof.findFirst).mockResolvedValue({ id: 'other-proof' } as never);
      const result = await service.score(makeInput());
      expect(result.fraudFlags.length).toBeGreaterThan(0);
      expect(result.trustScore).toBeLessThanOrEqual(30);
    });

    it('returns empty fraudFlags for a clean proof', async () => {
      setupMocks();
      const result = await service.score(makeInput());
      expect(result.fraudFlags).toHaveLength(0);
    });
  });

  describe('recommendation routing', () => {
    it('recommends auto_release when trustScore >= autoReleaseCutoff (80)', async () => {
      setupMocks({ autoReleaseCutoff: 80, challengeWindowCutoff: 50 });
      // Use perfect signals to get a high score
      const input = makeInput({
        buyerProfile: { userId: 'b', kycTier: 3, totalTrades: 100, disputeCount: 0 },
        sellerProfile: { userId: 's', kycTier: 3, totalTrades: 100, disputeCount: 0 },
        extraction: {
          ...makeInput().extraction,
          amount: 100,
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          overallConfidence: 1.0,
        },
      });
      const result = await service.score(input);
      expect(result.recommendation).toBe('auto_release');
    });

    it('recommends manual_review when trustScore < challengeWindowCutoff (50)', async () => {
      setupMocks({ autoReleaseCutoff: 80, challengeWindowCutoff: 50 });
      const input = makeInput({
        buyerProfile: { userId: 'b', kycTier: 0, totalTrades: 10, disputeCount: 5 },
        sellerProfile: { userId: 's', kycTier: 0, totalTrades: 10, disputeCount: 5 },
        extraction: {
          ...makeInput().extraction,
          amount: null,
          timestamp: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(), // 30h ago
          overallConfidence: 0.1,
        },
      });
      const result = await service.score(input);
      expect(result.recommendation).toBe('manual_review');
    });

    it('uses default thresholds (80/50) when no RiskConfig exists', async () => {
      vi.mocked(prisma.riskConfig.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.proof.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.riskScore.upsert).mockResolvedValue({} as never);
      vi.mocked(writeAuditLog).mockResolvedValue({} as never);

      const result = await service.score(makeInput());
      // Should not throw; recommendation should be one of the valid values
      expect(['auto_release', 'challenge_window', 'manual_review']).toContain(result.recommendation);
    });
  });

  describe('persistence and audit', () => {
    it('persists a RiskScore record via upsert', async () => {
      setupMocks();
      await service.score(makeInput());
      expect(prisma.riskScore.upsert).toHaveBeenCalledOnce();
      const call = vi.mocked(prisma.riskScore.upsert).mock.calls[0][0];
      expect(call.where).toEqual({ proofId: 'proof-1' });
      expect(call.create.proofId).toBe('proof-1');
      expect(call.create.userId).toBe('buyer-1');
    });

    it('writes a RISK_SCORED audit log entry', async () => {
      setupMocks();
      await service.score(makeInput());
      expect(writeAuditLog).toHaveBeenCalledOnce();
      const call = vi.mocked(writeAuditLog).mock.calls[0][0];
      expect(call.actionType).toBe('RISK_SCORED');
      expect(call.entityType).toBe('RiskScore');
      expect(call.entityId).toBe('proof-1');
    });

    it('audit payload includes all required signals', async () => {
      setupMocks();
      const result = await service.score(makeInput());
      const payload = result.auditPayload as Record<string, unknown>;
      expect(payload).toHaveProperty('tradeId');
      expect(payload).toHaveProperty('proofId');
      expect(payload).toHaveProperty('subScores');
      expect(payload).toHaveProperty('fraudFlags');
      expect(payload).toHaveProperty('finalScore');
      expect(payload).toHaveProperty('recommendation');
      expect(payload).toHaveProperty('configSnapshot');
    });
  });

  describe('Decimal trade amount support', () => {
    it('handles Prisma Decimal objects with toNumber()', async () => {
      setupMocks();
      const input = makeInput({
        trade: {
          ...makeInput().trade,
          amount: { toNumber: () => 100 } as never,
        },
      });
      const result = await service.score(input);
      expect(result.subScores.amount_match).toBe(100);
    });
  });
});
