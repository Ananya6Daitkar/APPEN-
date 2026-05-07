export interface ProofExtraction {
  tradeId: string;
  proofId: string;
  amount: number | null;
  currency: string | null;        // ISO 4217
  timestamp: string | null;       // ISO 8601
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
  overallConfidence: number;      // 0–1
  verificationStatus: 'verified' | 'needs_review' | 'suspicious';
  explanation: string;
  resolverSummary: string;        // ≤300 words
}
