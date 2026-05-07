import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TradeState } from '@prisma/client'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params

    const user = await prisma.user.findUnique({
      where: { walletAddress: address },
      include: { reputation: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const rep = user.reputation

    const totalCompletedTrades = await prisma.trade.count({
      where: {
        OR: [{ buyerId: user.id }, { sellerId: user.id }],
        state: TradeState.RELEASED,
      },
    })

    const totalVolumeAgg = await prisma.trade.aggregate({
      where: {
        OR: [{ buyerId: user.id }, { sellerId: user.id }],
        state: TradeState.RELEASED,
      },
      _sum: { amount: true },
    })

    const totalTrades = await prisma.trade.count({
      where: { OR: [{ buyerId: user.id }, { sellerId: user.id }] },
    })

    const disputeRate =
      totalTrades > 0 ? ((rep?.disputeCount ?? 0) / totalTrades) * 100 : 0

    return NextResponse.json({
      walletAddress: user.walletAddress,
      reputationScore: rep?.score ?? 500,
      totalCompletedTrades,
      totalVolume: totalVolumeAgg._sum.amount ?? 0,
      disputeRate: Math.round(disputeRate * 100) / 100,
      memberSince: user.createdAt,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch profile'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
