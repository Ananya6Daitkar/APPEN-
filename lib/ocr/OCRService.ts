import { OCRProvider, OCRContext } from './OCRProvider';
import { MockOCRProvider } from './MockOCRProvider';
import { OpenAIVisionProvider } from './OpenAIVisionProvider';
import type { ProofExtraction } from './types';

export interface OCRResult {
  extraction: ProofExtraction;
  /** true if amount OR timestamp confidence < 0.5 (Req 4.6) */
  routeToUnderReview: boolean;
}

export class OCRService {
  private readonly provider: OCRProvider;

  constructor() {
    if (process.env.DEMO_MODE === 'true') {
      this.provider = new MockOCRProvider({ scenario: 'normal' });
    } else {
      // OpenAIVisionProvider already falls back to MockOCRProvider internally on error
      this.provider = new OpenAIVisionProvider();
    }
  }

  async extract(file: Buffer, context: OCRContext): Promise<OCRResult> {
    const extraction = await this.provider.extract(file, context);

    const routeToUnderReview =
      extraction.fieldConfidences.amount < 0.5 ||
      extraction.fieldConfidences.timestamp < 0.5;

    return { extraction, routeToUnderReview };
  }
}

export const ocrService = new OCRService();
