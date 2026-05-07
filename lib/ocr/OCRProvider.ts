import type { ProofExtraction } from './types';

export interface OCRContext {
  tradeId: string;
  proofId: string;
  expectedAmount: number;
  expectedCurrency: string;
  tradeCreatedAt: Date;
}

export abstract class OCRProvider {
  abstract extract(file: Buffer, context: OCRContext): Promise<ProofExtraction>;
}
