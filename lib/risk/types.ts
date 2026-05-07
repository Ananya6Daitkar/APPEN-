export enum FraudFlag {
  DUPLICATE_HASH = 'DUPLICATE_HASH',
  TIMESTAMP_PREDATES = 'TIMESTAMP_PREDATES',
  AMOUNT_MISMATCH = 'AMOUNT_MISMATCH',
  METADATA_ANOMALY = 'METADATA_ANOMALY',
  LOW_OCR_CONFIDENCE = 'LOW_OCR_CONFIDENCE',
}

export interface UserRiskProfile {
  userId: string;
  kycTier: number;          // 0–3
  totalTrades: number;
  disputeCount: number;
}

export interface RiskScoringInput {
  extraction: import('../ocr/types').ProofExtraction;
  trade: {
    id: string;
    amount: number | { toNumber(): number };
    createdAt: Date;
    buyerId: string;
    sellerId: string;
  };
  buyerProfile: UserRiskProfile;
  sellerProfile: UserRiskProfile;
  /** SHA-256 hash of the proof file — used for duplicate detection */
  evidenceHash: string;
  proofId: string;
}

export interface RiskScoringOutput {
  trustScore: number;
  recommendation: 'auto_release' | 'challenge_window' | 'manual_review';
  fraudFlags: FraudFlag[];
  subScores: Record<string, number>;
  auditPayload: object;
}
