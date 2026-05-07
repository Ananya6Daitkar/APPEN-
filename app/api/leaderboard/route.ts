import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  const users = await prisma.user.findMany({
    take: 20,
    include: {
      reputation: true,
      tradesAsBuyer: { where: { state: 'RELEASED' }, select: { amount: true } },
      tradesAsSeller: { where: { state: 'RELEASED' }, select: { amount: true } },
    },
    orderBy: { reputation: { score: 'desc' } },
  })

  const leaderboard = users.map((u) => {
    const rep = u.reputation
    const totalTrades = (rep?.totalTrades ?? 0)
    const totalVolume = [
      ...u.tradesAsBuyer.map((t) => Number(t.amount)),
      ...u.tradesAsSeller.map((t) => Number(t.amount)),
    ].reduce((a, b) => a + b, 0)

    const winRate = totalTrades > 0
      ? Math.round(((totalTrades - (rep?.disputeCount ?? 0)) / totalTrades) * 100)
      : 100

    return {
      id: u.id,
      walletAddress: u.walletAddress,
      kycTier: u.kycTier,
      score: rep?.score ?? 500,
      totalTrades,
      totalVolume: Math.round(totalVolume),
      disputeCount: rep?.disputeCount ?? 0,
      winRate,
      memberSince: u.createdAt,
    }
  })

  return NextResponse.json(leaderboard)
}
