import OpenAI from 'openai';
import { OCRProvider, OCRContext } from './OCRProvider';
import type { ProofExtraction } from './types';
import { MockOCRProvider } from './MockOCRProvider';

const PROMPT_TEMPLATE = `You are a payment receipt verification assistant for a P2P crypto escrow platform.

Extract the following fields from the provided payment receipt image:
- amount: numeric transaction amount (number or null)
- currency: ISO 4217 currency code (string or null)
- timestamp: transaction date/time in ISO 8601 format (string or null)
- transactionId: payment reference or transaction ID (string or null)
- payerName: name of the sender (string or null)
- payeeName: name of the recipient or account (string or null)
- paymentRail: payment method (e.g., "bank_transfer", "mobile_money") (string or null)
- bankName: name of the bank or payment provider (string or null)

For each field, provide a confidence score between 0 and 1.

Expected trade amount: {expectedAmount} {expectedCurrency}
Trade created at: {tradeCreatedAt}

Respond ONLY with valid JSON matching this schema: { amount, currency, timestamp, transactionId, payerName, payeeName, paymentRail, bankName, fieldConfidences: {...}, overallConfidence, verificationStatus, explanation, resolverSummary }`;

export class OpenAIVisionProvider extends OCRProvider {
  private readonly client: OpenAI;

  constructor() {
    super();
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async extract(file: Buffer, context: OCRContext): Promise<ProofExtraction> {
    try {
      const prompt = PROMPT_TEMPLATE
        .replace('{expectedAmount}', String(context.expectedAmount))
        .replace('{expectedCurrency}', context.expectedCurrency)
        .replace('{tradeCreatedAt}', context.tradeCreatedAt.toISOString());

      const base64Image = file.toString('base64');
      const imageUrl = `data:image/jpeg;base64,${base64Image}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30_000);

      let responseText: string;
      try {
        const response = await this.client.chat.completions.create(
          {
            model: 'gpt-4o',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  { type: 'image_url', image_url: { url: imageUrl } },
                ],
              },
            ],
            max_tokens: 1024,
          },
          { signal: controller.signal },
        );
        responseText = response.choices[0]?.message?.content ?? '';
      } finally {
        clearTimeout(timeoutId);
      }

      // Strip markdown code fences if present
      const cleaned = responseText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        tradeId: context.tradeId,
        proofId: context.proofId,
        amount: parsed.amount ?? null,
        currency: parsed.currency ?? null,
        timestamp: parsed.timestamp ?? null,
        transactionId: parsed.transactionId ?? null,
        payerName: parsed.payerName ?? null,
        payeeName: parsed.payeeName ?? null,
        paymentRail: parsed.paymentRail ?? null,
        bankName: parsed.bankName ?? null,
        fieldConfidences: parsed.fieldConfidences ?? {
          amount: 0,
          currency: 0,
          timestamp: 0,
          transactionId: 0,
          payerName: 0,
          payeeName: 0,
          paymentRail: 0,
          bankName: 0,
        },
        overallConfidence: parsed.overallConfidence ?? 0,
        verificationStatus: parsed.verificationStatus ?? 'needs_review',
        explanation: parsed.explanation ?? '',
        resolverSummary: parsed.resolverSummary ?? '',
      };
    } catch (err) {
      console.error('[OpenAIVisionProvider] Error during extraction, falling back to MockOCRProvider:', err);
      const mock = new MockOCRProvider({ scenario: 'normal' });
      return mock.extract(file, context);
    }
  }
}
