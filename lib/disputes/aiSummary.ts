import OpenAI from 'openai'

interface SummaryInput {
  tradeId: string
  amount: number
  stablecoin: string
  fiatCurrency: string
  buyerAddress: string
  sellerAddress: string
  buyerRepScore: number
  sellerRepScore: number
  ocrAmount: number | null
  ocrCurrency: string | null
  ocrTimestamp: string | null
  ocrConfidence: number
  trustScore: number
  recommendation: string
  fraudFlags: string[]
}

function mockSummary(input: SummaryInput): string {
  const flags = input.fraudFlags.length > 0
    ? `Fraud flags detected: ${input.fraudFlags.join(', ')}.`
    : 'No fraud flags detected.'

  return (
    `Trade ${input.tradeId} involves ${input.amount} ${input.stablecoin} exchanged for ` +
    `${input.fiatCurrency}. The buyer (${input.buyerAddress}, reputation: ${input.buyerRepScore}) ` +
    `claims to have sent fiat payment. The seller (${input.sellerAddress}, reputation: ${input.sellerRepScore}) ` +
    `has raised a dispute. ` +
    `The uploaded proof was parsed by the OCR engine: extracted amount ${input.ocrAmount ?? 'N/A'} ` +
    `${input.ocrCurrency ?? ''}, timestamp ${input.ocrTimestamp ?? 'N/A'}, ` +
    `overall confidence ${(input.ocrConfidence * 100).toFixed(0)}%. ` +
    `The Risk Engine assigned a trust score of ${input.trustScore}/100 with recommendation: ` +
    `${input.recommendation}. ${flags} ` +
    `The resolver should review the attached proof and decide whether to release funds to the buyer ` +
    `or refund them to the seller.`
  )
}

export async function generateAISummary(input: SummaryInput): Promise<string> {
  if (process.env.DEMO_MODE === 'true' || !process.env.OPENAI_API_KEY) {
    return mockSummary(input)
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const prompt = `You are a dispute resolution assistant for a P2P crypto escrow platform.
Summarize the following trade dispute in 300 words or fewer for a human resolver.

Trade ID: ${input.tradeId}
Amount: ${input.amount} ${input.stablecoin} for ${input.fiatCurrency}
Buyer: ${input.buyerAddress} (reputation: ${input.buyerRepScore}/1000)
Seller: ${input.sellerAddress} (reputation: ${input.sellerRepScore}/1000)
OCR extracted amount: ${input.ocrAmount ?? 'N/A'} ${input.ocrCurrency ?? ''}
OCR timestamp: ${input.ocrTimestamp ?? 'N/A'}
OCR confidence: ${(input.ocrConfidence * 100).toFixed(0)}%
Trust score: ${input.trustScore}/100
Recommendation: ${input.recommendation}
Fraud flags: ${input.fraudFlags.length > 0 ? input.fraudFlags.join(', ') : 'none'}

Provide a concise, neutral summary of the dispute, the evidence, and the risk assessment.`

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
    })

    return response.choices[0]?.message?.content ?? mockSummary(input)
  } catch {
    return mockSummary(input)
  }
}
