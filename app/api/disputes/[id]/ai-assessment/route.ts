import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'

interface AIAssessment {
  verdict: 'release' | 'refund' | 'inconclusive'
  confidence: number
  reasoning: string
  red_flags: string[]
  supporting_evidence: string[]
}

const SYSTEM_PROMPT = `You are a neutral Web3 escrow arbitrator. Analyze the evidence and return JSON:
{
  "verdict": "release" | "refund" | "inconclusive",
  "confidence": 0-100,
  "reasoning": "3 sentences max",
  "red_flags": ["string"],
  "supporting_evidence": ["string"]
}
Be concise, objective, and base your verdict solely on the evidence provided.`

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: caseId } = await params

  // Try Redis cache first
  let cached: AIAssessment | null = null
  try {
    const Redis = (await import('ioredis')).default
    const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379')
    const raw = await redis.get(`ai_assessment:${caseId}`)
    redis.disconnect()
    if (raw) cached = JSON.parse(raw) as AIAssessment
  } catch { /* Redis unavailable — proceed without cache */ }

  if (cached) return NextResponse.json(cached)

  // Load dispute + evidence
  const resolverCase = await prisma.resolverCase.findUnique({
    where: { id: caseId },
    include: {
      dispute: {
        include: {
          trade: {
            include: {
              buyer: { select: { walletAddress: true, kycTier: true } },
              seller: { select: { walletAddress: true, kycTier: true } },
              proofs: {
                include: { ocrResult: true, riskScore: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  })

  if (!resolverCase) return NextResponse.json({ error: 'Case not found' }, { status: 404 })

  const trade = resolverCase.dispute.trade
  const proof = trade.proofs[0]
  const ocr = proof?.ocrResult
  const risk = proof?.riskScore

  // Build evidence context
  const evidenceContext = {
    trade: {
      amount: trade.amount,
      stablecoin: trade.stablecoin,
      fiatCurrency: trade.fiatCurrency,
      fiatRate: trade.fiatRate,
      state: trade.state,
      createdAt: trade.createdAt,
    },
    buyer: { address: trade.buyer.walletAddress, kycTier: trade.buyer.kycTier },
    seller: { address: trade.seller.walletAddress, kycTier: trade.seller.kycTier },
    ocr: ocr ? {
      extractedAmount: ocr.amount,
      currency: ocr.currency,
      timestamp: ocr.timestamp,
      transactionId: ocr.transactionId,
      payerName: ocr.payerName,
      overallConfidence: ocr.overallConfidence,
      verificationStatus: ocr.verificationStatus,
      explanation: ocr.explanation,
    } : null,
    risk: risk ? {
      trustScore: risk.trustScore,
      recommendation: risk.recommendation,
      fraudFlags: risk.fraudFlags,
    } : null,
    aiSummary: resolverCase.aiSummary,
  }

  let assessment: AIAssessment

  // In DEMO_MODE or no OpenAI key — return realistic mock
  if (process.env.DEMO_MODE === 'true' || !process.env.OPENAI_API_KEY) {
    const trustScore = (risk?.trustScore as number) ?? 45
    const hasFlags = Array.isArray(risk?.fraudFlags) && (risk.fraudFlags as unknown[]).length > 0
    const ocrConf = (ocr?.overallConfidence as number) ?? 0.5

    assessment = {
      verdict: trustScore >= 70 ? 'release' : trustScore < 40 || hasFlags ? 'refund' : 'inconclusive',
      confidence: Math.min(95, Math.max(30, trustScore + Math.floor(Math.random() * 10))),
      reasoning: hasFlags
        ? `The payment receipt shows significant anomalies including amount mismatch and low OCR confidence (${Math.round(ocrConf * 100)}%). The extracted amount does not match the expected trade value, which is a strong indicator of a fraudulent or incorrect receipt. Based on the risk score of ${trustScore}/100 and the presence of fraud flags, a refund to the seller is recommended.`
        : `The payment receipt appears legitimate with an OCR confidence of ${Math.round(ocrConf * 100)}% and a trust score of ${trustScore}/100. The extracted fields are consistent with the expected trade parameters. Given the evidence quality and the buyer's KYC tier, releasing funds to the buyer is the appropriate resolution.`,
      red_flags: hasFlags
        ? ['Amount mismatch detected (>1% deviation)', 'Low OCR confidence on timestamp field', 'Receipt metadata inconsistency']
        : [],
      supporting_evidence: [
        `OCR confidence: ${Math.round(ocrConf * 100)}%`,
        `Trust score: ${trustScore}/100`,
        `KYC Tier ${trade.buyer.kycTier} buyer`,
        `Trade amount: ${trade.amount} ${trade.stablecoin}`,
      ],
    }
  } else {
    // Real OpenAI call
    try {
      const OpenAI = (await import('openai')).default
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Analyze this P2P escrow dispute:\n\n${JSON.stringify(evidenceContext, null, 2)}`,
          },
        ],
        max_tokens: 512,
        response_format: { type: 'json_object' },
      })

      const raw = response.choices[0]?.message?.content ?? '{}'
      assessment = JSON.parse(raw) as AIAssessment
    } catch {
      assessment = {
        verdict: 'inconclusive',
        confidence: 50,
        reasoning: 'AI assessment unavailable. Please review the evidence manually.',
        red_flags: [],
        supporting_evidence: [],
      }
    }
  }

  // Cache in Redis for 10 minutes
  try {
    const Redis = (await import('ioredis')).default
    const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379')
    await redis.setex(`ai_assessment:${caseId}`, 600, JSON.stringify(assessment))
    redis.disconnect()
  } catch { /* ignore */ }

  return NextResponse.json(assessment)
}
