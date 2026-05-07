import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth/session'
import { generateAISummary } from '@/lib/disputes/aiSummary'

type Params = { params: Promise<{ id: string }> }

// ─── GET /api/disputes/:id ────────────────────────────────────────────────────
// Full evidence bundle for resolver console
export async function GET(req: NextRequest, { params }: Params) {
  try {
    await requireSession(req)
    const { id } = await params

    const resolverCase = await prisma.resolverCase.findUnique({
      where: { id },
      include: {
        dispute: {
          include: {
            trade: {
              include: {
                buyer: {
                  select: {
                    id: true,
                    walletAddress: true,
                    kycTier: true,
                    reputation: { select: { score: true, totalTrades: true, disputeCount: true } },
                  },
                },
                seller: {
                  select: {
                    id: true,
                    walletAddress: true,
                    kycTier: true,
                    reputation: { select: { score: true, totalTrades: true, disputeCount: true } },
                  },
                },
                proofs: {
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                  include: { ocrResult: true, riskScore: true },
                },
              },
            },
          },
        },
        assignedTo: { select: { id: true, walletAddress: true } },
      },
    })

    if (!resolverCase) {
      return NextResponse.json({ error: 'Dispute case not found' }, { status: 404 })
    }

    const trade = resolverCase.dispute.trade
    const latestProof = trade.proofs[0] ?? null
    const ocr = latestProof?.ocrResult ?? null
    const risk = latestProof?.riskScore ?? null

    // Generate or return cached AI summary
    let aiSummary = resolverCase.aiSummary
    if (!aiSummary) {
      aiSummary = await generateAISummary({
        tradeId: trade.id,
        amount: Number(trade.amount),
        stablecoin: trade.stablecoin,
        fiatCurrency: trade.fiatCurrency,
        buyerAddress: trade.buyer.walletAddress,
        sellerAddress: trade.seller.walletAddress,
        buyerRepScore: trade.buyer.reputation?.score ?? 500,
        sellerRepScore: trade.seller.reputation?.score ?? 500,
        ocrAmount: ocr ? Number(ocr.amount) : null,
        ocrCurrency: ocr?.currency ?? null,
        ocrTimestamp: ocr?.timestamp?.toISOString() ?? null,
        ocrConfidence: ocr?.overallConfidence ?? 0,
        trustScore: risk?.trustScore ?? 0,
        recommendation: risk?.recommendation ?? 'manual_review',
        fraudFlags: Array.isArray(risk?.fraudFlags) ? (risk.fraudFlags as string[]) : [],
      })

      // Cache the summary
      await prisma.resolverCase.update({
        where: { id },
        data: { aiSummary },
      })
    }

    return NextResponse.json({
      case: resolverCase,
      trade,
      proof: latestProof,
      ocrResult: ocr,
      riskScore: risk,
      aiSummary,
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = err instanceof Error ? err.message : 'Failed to fetch dispute'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
