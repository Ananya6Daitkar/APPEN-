import { OCRProvider, OCRContext } from './OCRProvider';
import type { ProofExtraction } from './types';

export type MockScenario =
  | 'normal'
  | 'low_confidence'
  | 'fraud_duplicate_hash'
  | 'fraud_timestamp_predates'
  | 'fraud_amount_mismatch';

export interface MockOCROptions {
  scenario?: MockScenario;
  overrideConfidence?: number; // 0–1
}

// Realistic fake data pools
const PAYER_NAMES = [
  'James Okafor', 'Amara Diallo', 'Chen Wei', 'Sofia Martínez',
  'Kwame Asante', 'Priya Nair', 'Luca Bianchi', 'Fatima Al-Hassan',
];
const PAYEE_NAMES = [
  'APPEN Escrow Services', 'P2P Trade Account', 'Merchant Wallet',
  'Secure Trade Hub', 'FastPay Merchant', 'TrustEx Recipient',
];
const PAYMENT_RAILS = ['bank_transfer', 'mobile_money', 'instant_transfer', 'wire_transfer'];
const BANK_NAMES = [
  'First National Bank', 'GTBank', 'Standard Chartered', 'OCBC Bank',
  'Zenith Bank', 'Equity Bank', 'HDFC Bank', 'BNP Paribas',
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomConfidence(min: number, max: number): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(4));
}

function generateTransactionId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export class MockOCRProvider extends OCRProvider {
  private readonly options: MockOCROptions;

  constructor(options: MockOCROptions = {}) {
    super();
    this.options = options;
  }

  private resolveScenario(): MockScenario {
    const isDemoMode = process.env.DEMO_MODE === 'true';
    // In demo mode, default to 'normal' unless explicitly overridden via options.scenario
    if (isDemoMode && !this.options.scenario) {
      return 'normal';
    }
    return this.options.scenario ?? 'normal';
  }

  async extract(_file: Buffer, context: OCRContext): Promise<ProofExtraction> {
    const scenario = this.resolveScenario();
    const payerName = randomFrom(PAYER_NAMES);
    const payeeName = randomFrom(PAYEE_NAMES);
    const paymentRail = randomFrom(PAYMENT_RAILS);
    const bankName = randomFrom(BANK_NAMES);
    const transactionId = generateTransactionId();

    switch (scenario) {
      case 'normal':
        return this.buildNormal(context, payerName, payeeName, paymentRail, bankName, transactionId);
      case 'low_confidence':
        return this.buildLowConfidence(context, payerName, payeeName, paymentRail, bankName, transactionId);
      case 'fraud_duplicate_hash':
        return this.buildFraudDuplicateHash(context, payerName, payeeName, paymentRail, bankName, transactionId);
      case 'fraud_timestamp_predates':
        return this.buildFraudTimestampPredates(context, payerName, payeeName, paymentRail, bankName, transactionId);
      case 'fraud_amount_mismatch':
        return this.buildFraudAmountMismatch(context, payerName, payeeName, paymentRail, bankName, transactionId);
    }
  }

  private applyConfidenceOverride(value: number): number {
    return this.options.overrideConfidence !== undefined
      ? this.options.overrideConfidence
      : value;
  }

  private buildNormal(
    context: OCRContext,
    payerName: string,
    payeeName: string,
    paymentRail: string,
    bankName: string,
    transactionId: string,
  ): ProofExtraction {
    const now = new Date();
    const highConf = () => this.applyConfidenceOverride(randomConfidence(0.92, 0.98));
    const overallConf = this.applyConfidenceOverride(randomConfidence(0.92, 0.98));

    return {
      tradeId: context.tradeId,
      proofId: context.proofId,
      amount: context.expectedAmount,
      currency: context.expectedCurrency,
      timestamp: now.toISOString(),
      transactionId,
      payerName,
      payeeName,
      paymentRail,
      bankName,
      fieldConfidences: {
        amount: highConf(),
        currency: highConf(),
        timestamp: highConf(),
        transactionId: highConf(),
        payerName: highConf(),
        payeeName: highConf(),
        paymentRail: highConf(),
        bankName: highConf(),
      },
      overallConfidence: overallConf,
      verificationStatus: 'verified',
      explanation: `Payment receipt successfully parsed. Transaction of ${context.expectedAmount} ${context.expectedCurrency} from ${payerName} to ${payeeName} via ${bankName} (${paymentRail}). Reference: ${transactionId}. All fields extracted with high confidence.`,
      resolverSummary: this.buildNormalSummary(context, payerName, payeeName, paymentRail, bankName, transactionId, overallConf),
    };
  }

  private buildLowConfidence(
    context: OCRContext,
    payerName: string,
    payeeName: string,
    paymentRail: string,
    bankName: string,
    transactionId: string,
  ): ProofExtraction {
    const lowConf = () => this.applyConfidenceOverride(0.3);
    const overallConf = this.applyConfidenceOverride(0.35);

    return {
      tradeId: context.tradeId,
      proofId: context.proofId,
      amount: context.expectedAmount,
      currency: context.expectedCurrency,
      timestamp: new Date().toISOString(),
      transactionId,
      payerName,
      payeeName,
      paymentRail,
      bankName,
      fieldConfidences: {
        amount: lowConf(),
        currency: this.applyConfidenceOverride(randomConfidence(0.4, 0.55)),
        timestamp: lowConf(),
        transactionId: this.applyConfidenceOverride(randomConfidence(0.35, 0.5)),
        payerName: this.applyConfidenceOverride(randomConfidence(0.3, 0.45)),
        payeeName: this.applyConfidenceOverride(randomConfidence(0.3, 0.45)),
        paymentRail: this.applyConfidenceOverride(randomConfidence(0.4, 0.55)),
        bankName: this.applyConfidenceOverride(randomConfidence(0.35, 0.5)),
      },
      overallConfidence: overallConf,
      verificationStatus: 'needs_review',
      explanation: `Receipt image quality is insufficient for reliable extraction. The document appears blurry or partially obscured. Key fields including transaction amount and timestamp could not be extracted with sufficient confidence. Manual review is required.`,
      resolverSummary: this.buildLowConfidenceSummary(context, overallConf),
    };
  }

  private buildFraudDuplicateHash(
    context: OCRContext,
    payerName: string,
    payeeName: string,
    paymentRail: string,
    bankName: string,
    transactionId: string,
  ): ProofExtraction {
    const highConf = () => this.applyConfidenceOverride(randomConfidence(0.92, 0.98));
    const overallConf = this.applyConfidenceOverride(randomConfidence(0.92, 0.98));

    return {
      tradeId: context.tradeId,
      proofId: context.proofId,
      amount: context.expectedAmount,
      currency: context.expectedCurrency,
      timestamp: new Date().toISOString(),
      transactionId,
      payerName,
      payeeName,
      paymentRail,
      bankName,
      fieldConfidences: {
        amount: highConf(),
        currency: highConf(),
        timestamp: highConf(),
        transactionId: highConf(),
        payerName: highConf(),
        payeeName: highConf(),
        paymentRail: highConf(),
        bankName: highConf(),
      },
      overallConfidence: overallConf,
      verificationStatus: 'suspicious',
      explanation: `Receipt content extracted successfully, however the SHA-256 evidence hash of this document matches a previously submitted proof on the platform. Duplicate receipt submission detected. This proof may have been reused from a prior trade.`,
      resolverSummary: this.buildDuplicateHashSummary(context, payerName, payeeName, transactionId, overallConf),
    };
  }

  private buildFraudTimestampPredates(
    context: OCRContext,
    payerName: string,
    payeeName: string,
    paymentRail: string,
    bankName: string,
    transactionId: string,
  ): ProofExtraction {
    // Set timestamp to 1 day before tradeCreatedAt
    const predatedTimestamp = new Date(context.tradeCreatedAt.getTime() - 24 * 60 * 60 * 1000);
    const highConf = () => this.applyConfidenceOverride(randomConfidence(0.92, 0.98));
    const overallConf = this.applyConfidenceOverride(randomConfidence(0.88, 0.95));

    return {
      tradeId: context.tradeId,
      proofId: context.proofId,
      amount: context.expectedAmount,
      currency: context.expectedCurrency,
      timestamp: predatedTimestamp.toISOString(),
      transactionId,
      payerName,
      payeeName,
      paymentRail,
      bankName,
      fieldConfidences: {
        amount: highConf(),
        currency: highConf(),
        timestamp: highConf(),
        transactionId: highConf(),
        payerName: highConf(),
        payeeName: highConf(),
        paymentRail: highConf(),
        bankName: highConf(),
      },
      overallConfidence: overallConf,
      verificationStatus: 'suspicious',
      explanation: `Receipt fields extracted with high confidence. However, the extracted transaction timestamp (${predatedTimestamp.toISOString()}) predates the trade creation time (${context.tradeCreatedAt.toISOString()}) by approximately 24 hours. A payment cannot have occurred before the trade was created.`,
      resolverSummary: this.buildTimestampPredatesSummary(context, payerName, payeeName, transactionId, predatedTimestamp, overallConf),
    };
  }

  private buildFraudAmountMismatch(
    context: OCRContext,
    payerName: string,
    payeeName: string,
    paymentRail: string,
    bankName: string,
    transactionId: string,
  ): ProofExtraction {
    const inflatedAmount = parseFloat((context.expectedAmount * 1.05).toFixed(2));
    const highConf = () => this.applyConfidenceOverride(randomConfidence(0.92, 0.98));
    const overallConf = this.applyConfidenceOverride(randomConfidence(0.88, 0.95));

    return {
      tradeId: context.tradeId,
      proofId: context.proofId,
      amount: inflatedAmount,
      currency: context.expectedCurrency,
      timestamp: new Date().toISOString(),
      transactionId,
      payerName,
      payeeName,
      paymentRail,
      bankName,
      fieldConfidences: {
        amount: highConf(),
        currency: highConf(),
        timestamp: highConf(),
        transactionId: highConf(),
        payerName: highConf(),
        payeeName: highConf(),
        paymentRail: highConf(),
        bankName: highConf(),
      },
      overallConfidence: overallConf,
      verificationStatus: 'suspicious',
      explanation: `Receipt extracted successfully. The extracted amount (${inflatedAmount} ${context.expectedCurrency}) exceeds the expected trade amount (${context.expectedAmount} ${context.expectedCurrency}) by 5%, which is above the 1% tolerance threshold. This discrepancy may indicate a manipulated or incorrect receipt.`,
      resolverSummary: this.buildAmountMismatchSummary(context, payerName, payeeName, transactionId, inflatedAmount, overallConf),
    };
  }

  // ─── Resolver Summary Builders ────────────────────────────────────────────

  private buildNormalSummary(
    context: OCRContext,
    payerName: string,
    payeeName: string,
    paymentRail: string,
    bankName: string,
    transactionId: string,
    confidence: number,
  ): string {
    return `Trade ${context.tradeId} — Payment Verification Summary\n\nThe submitted proof of payment has been successfully processed by the OCR engine with an overall confidence score of ${(confidence * 100).toFixed(1)}%. All required fields were extracted cleanly from the receipt image.\n\nExtracted Details:\n- Amount: ${context.expectedAmount} ${context.expectedCurrency} (matches expected trade amount exactly)\n- Payer: ${payerName}\n- Recipient: ${payeeName}\n- Payment Method: ${paymentRail} via ${bankName}\n- Reference: ${transactionId}\n\nThe transaction timestamp falls within the acceptable window relative to the trade creation time. No fraud indicators were detected. The evidence hash is unique and has not been seen on the platform previously.\n\nRecommendation: This proof meets all verification criteria. The trade is eligible for automatic release. No manual intervention is required.`;
  }

  private buildLowConfidenceSummary(context: OCRContext, confidence: number): string {
    return `Trade ${context.tradeId} — Low Confidence Extraction Alert\n\nThe submitted proof of payment could not be reliably parsed by the OCR engine. The overall extraction confidence is ${(confidence * 100).toFixed(1)}%, which falls below the 50% threshold required for automated processing.\n\nKey Issues Identified:\n- Transaction amount confidence is critically low (30%), making it impossible to confirm the payment value matches the trade amount of ${context.expectedAmount} ${context.expectedCurrency}\n- Transaction timestamp confidence is critically low (30%), preventing verification of payment timing\n- The receipt image may be blurry, partially cropped, or of insufficient resolution\n\nThis proof has been automatically routed to UnderReview status. A human resolver must examine the original document and make a determination.\n\nRecommendation: Request the buyer to resubmit a clearer, higher-resolution image of the payment receipt. If resubmission is not possible, manual verification against bank records may be necessary.`;
  }

  private buildDuplicateHashSummary(
    context: OCRContext,
    payerName: string,
    payeeName: string,
    transactionId: string,
    confidence: number,
  ): string {
    return `Trade ${context.tradeId} — Duplicate Receipt Detected\n\nThe OCR engine successfully extracted all fields from the submitted receipt with high confidence (${(confidence * 100).toFixed(1)}%). However, a critical fraud signal has been triggered.\n\nExtracted Details:\n- Amount: ${context.expectedAmount} ${context.expectedCurrency}\n- Payer: ${payerName}\n- Recipient: ${payeeName}\n- Reference: ${transactionId}\n\nFraud Signal — DUPLICATE_HASH:\nThe SHA-256 evidence hash of this uploaded document exactly matches a proof that was previously submitted on the platform. This indicates the buyer may have reused a receipt from a prior trade to fraudulently claim payment for this trade.\n\nThis is a serious integrity violation. The trade has been flagged as suspicious and requires immediate resolver attention.\n\nRecommendation: Do not release funds. Contact the buyer for an explanation and request an original, unique payment receipt. Cross-reference the matching trade to determine if a double-spend attempt has occurred.`;
  }

  private buildTimestampPredatesSummary(
    context: OCRContext,
    payerName: string,
    payeeName: string,
    transactionId: string,
    predatedTimestamp: Date,
    confidence: number,
  ): string {
    return `Trade ${context.tradeId} — Timestamp Anomaly Detected\n\nThe OCR engine extracted all fields with high confidence (${(confidence * 100).toFixed(1)}%). However, a temporal inconsistency has been identified that raises serious fraud concerns.\n\nExtracted Details:\n- Amount: ${context.expectedAmount} ${context.expectedCurrency}\n- Payer: ${payerName}\n- Recipient: ${payeeName}\n- Reference: ${transactionId}\n- Extracted Timestamp: ${predatedTimestamp.toISOString()}\n\nFraud Signal — TIMESTAMP_PREDATES:\nThe extracted transaction timestamp predates the trade creation time (${context.tradeCreatedAt.toISOString()}) by approximately 24 hours. It is logically impossible for a payment to have been made for a trade that did not yet exist at the time of the transaction.\n\nThis strongly suggests the buyer has submitted a receipt from a different, unrelated transaction in an attempt to fraudulently claim payment.\n\nRecommendation: Do not release funds. Escalate to dispute resolution. Request the buyer provide a payment receipt with a timestamp that postdates the trade creation time.`;
  }

  private buildAmountMismatchSummary(
    context: OCRContext,
    payerName: string,
    payeeName: string,
    transactionId: string,
    extractedAmount: number,
    confidence: number,
  ): string {
    const diff = ((extractedAmount - context.expectedAmount) / context.expectedAmount * 100).toFixed(2);
    return `Trade ${context.tradeId} — Amount Discrepancy Detected\n\nThe OCR engine extracted all fields with high confidence (${(confidence * 100).toFixed(1)}%). However, the extracted payment amount does not match the expected trade amount.\n\nExtracted Details:\n- Extracted Amount: ${extractedAmount} ${context.expectedCurrency}\n- Expected Amount: ${context.expectedAmount} ${context.expectedCurrency}\n- Discrepancy: +${diff}% (${(extractedAmount - context.expectedAmount).toFixed(2)} ${context.expectedCurrency} over)\n- Payer: ${payerName}\n- Recipient: ${payeeName}\n- Reference: ${transactionId}\n\nFraud Signal — AMOUNT_MISMATCH:\nThe extracted amount exceeds the agreed trade amount by ${diff}%, which is above the 1% tolerance threshold. This may indicate the buyer submitted a receipt from a different transaction, or the receipt has been digitally altered.\n\nRecommendation: Do not auto-release. Flag for manual review. Request the buyer confirm the correct payment reference and provide additional evidence that the payment was made for the correct amount.`;
  }
}
