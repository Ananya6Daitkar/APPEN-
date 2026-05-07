import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

// ─── GET /api/trades/:id ──────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const trade = await prisma.trade.findUnique({
      where: { id },
      include: {
        offer: true,
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
          include: { ocrResult: true, riskScore: true },
          orderBy: { createdAt: 'desc' },
        },
        dispute: {
          include: { resolverCase: true },
        },
      },
    })

    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    return NextResponse.json(trade)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch trade'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
