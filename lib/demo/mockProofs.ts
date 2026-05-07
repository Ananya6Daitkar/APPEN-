/**
 * Mock proof buffers and expected OCR results for demo scenarios.
 * Used when DEMO_MODE=true to simulate proof upload + OCR extraction.
 * Req: 11.2
 */

import type { ProofExtraction } from '@/lib/ocr/types';

// ---------------------------------------------------------------------------
// Demo scenario identifiers
// ---------------------------------------------------------------------------
export type DemoScenario = 'bankTransfer' | 'mobileMoney' | 'wireTransfer';

// ---------------------------------------------------------------------------
// SVG asset paths (relative to /public)
// ---------------------------------------------------------------------------
export const DEMO_RECEIPT_PATHS: Record<DemoScenario, string> = {
  bankTransfer: '/demo/receipt-bank-transfer.svg',
  mobileMoney: '/demo/receipt-mobile-money.svg',
  wireTransfer: '/demo/receipt-wire-transfer.svg',
};

// ---------------------------------------------------------------------------
// Minimal valid PNG buffer (1×1 transparent pixel) used as a stand-in
// buffer when a real file is not available in server-side contexts.
// ---------------------------------------------------------------------------
const MINIMAL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function base64ToBuffer(b64: string): Buffer {
  return Buffer.from(b64, 'base64');
}

// ---------------------------------------------------------------------------
// Mock proof buffers — small PNG placeholders referencing the SVG receipts
// ---------------------------------------------------------------------------
export const MOCK_PROOF_BUFFERS: Record<DemoScenario, Buffer> = {
  bankTransfer: base64ToBuffer(MINIMAL_PNG_BASE64),
  mobileMoney: base64ToBuffer(MINIMAL_PNG_BASE64),
  wireTransfer: base64ToBuffer(MINIMAL_PNG_BASE64),
};

// ---------------------------------------------------------------------------
// Expected OCR results per demo scenario
// These mirror what a real OCR provider would return for the SVG receipts.
// ---------------------------------------------------------------------------

export function makeBankTransferExtraction(
  tradeId: string,
  proofId: string,
): ProofExtraction {
  return {
    tradeId,
    proofId,
    amount: 500.0,
    currency: 'USD',
    timestamp: '2024-01-15T14:32:07Z',
    transactionId: 'FNB-2024-TXN-847291',
    payerName: 'Alice Nakamoto',
    payeeName: 'Bob Okonkwo',
    paymentRail: 'bank_transfer',
    bankName: 'First National Bank',
    fieldConfidences: {
      amount: 0.98,
      currency: 0.97,
      timestamp: 0.95,
      transactionId: 0.99,
      payerName: 0.93,
      payeeName: 0.93,
      paymentRail: 0.96,
      bankName: 0.97,
    },
    overallConfidence: 0.96,
    verificationStatus: 'verified',
    explanation:
      'Bank transfer receipt from First National Bank. Amount of USD 500.00 matches expected trade value. ' +
      'Transaction reference FNB-2024-TXN-847291 is present. Sender and recipient names are clearly visible. ' +
      'Timestamp is within acceptable range of trade creation.',
    resolverSummary:
      'High-confidence bank transfer receipt. All key fields extracted successfully. ' +
      'Amount, currency, and transaction ID match trade expectations. Recommended for auto-release.',
  };
}

export function makeMobileMoneyExtraction(
  tradeId: string,
  proofId: string,
): ProofExtraction {
  return {
    tradeId,
    proofId,
    amount: 65000.0,
    currency: 'KES',
    timestamp: '2024-01-15T16:45:22+03:00',
    transactionId: 'QHG7K2P9X4',
    payerName: 'Alice Nakamoto',
    payeeName: 'Bob Okonkwo',
    paymentRail: 'mobile_money',
    bankName: 'M-PESA (Safaricom)',
    fieldConfidences: {
      amount: 0.97,
      currency: 0.96,
      timestamp: 0.94,
      transactionId: 0.99,
      payerName: 0.91,
      payeeName: 0.91,
      paymentRail: 0.98,
      bankName: 0.98,
    },
    overallConfidence: 0.95,
    verificationStatus: 'verified',
    explanation:
      'M-PESA mobile money receipt from Safaricom. Amount of KES 65,000 (≈ USD 500) matches expected trade value. ' +
      'Transaction ID QHG7K2P9X4 is clearly visible. Sender and recipient phone numbers are present. ' +
      'Payment rail confirmed as mobile_money.',
    resolverSummary:
      'High-confidence M-PESA receipt. Mobile money transfer confirmed with matching amount and transaction ID. ' +
      'Currency is KES with USD equivalent noted. Recommended for auto-release.',
  };
}

export function makeWireTransferExtraction(
  tradeId: string,
  proofId: string,
): ProofExtraction {
  return {
    tradeId,
    proofId,
    amount: 500.0,
    currency: 'USD',
    timestamp: '2024-01-15T00:00:00Z',
    transactionId: 'SGBK240115847291US',
    payerName: 'Alice Nakamoto',
    payeeName: 'Bob Okonkwo',
    paymentRail: 'wire_transfer',
    bankName: 'Swift Global Bank',
    fieldConfidences: {
      amount: 0.98,
      currency: 0.98,
      timestamp: 0.88,
      transactionId: 0.99,
      payerName: 0.94,
      payeeName: 0.94,
      paymentRail: 0.97,
      bankName: 0.96,
    },
    overallConfidence: 0.95,
    verificationStatus: 'verified',
    explanation:
      'International wire transfer confirmation from Swift Global Bank. Amount of USD 500.00 matches expected trade value. ' +
      'SWIFT reference SGBK240115847291US is present. IBAN details for both sender and recipient are visible. ' +
      'Remittance information references the correct trade ID.',
    resolverSummary:
      'High-confidence SWIFT wire transfer receipt. International transfer confirmed with IBAN details. ' +
      'Amount and currency match trade expectations. Timestamp confidence slightly lower due to value-date format. ' +
      'Recommended for auto-release.',
  };
}

// ---------------------------------------------------------------------------
// Convenience map: scenario → extraction factory
// ---------------------------------------------------------------------------
export const MOCK_EXTRACTION_FACTORIES: Record<
  DemoScenario,
  (tradeId: string, proofId: string) => ProofExtraction
> = {
  bankTransfer: makeBankTransferExtraction,
  mobileMoney: makeMobileMoneyExtraction,
  wireTransfer: makeWireTransferExtraction,
};

/**
 * Get the expected OCR extraction for a given demo scenario.
 * Useful in tests and demo-mode proof pipelines.
 */
export function getMockExtraction(
  scenario: DemoScenario,
  tradeId: string,
  proofId: string,
): ProofExtraction {
  return MOCK_EXTRACTION_FACTORIES[scenario](tradeId, proofId);
}
