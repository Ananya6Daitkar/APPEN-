import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth/session'
import { isAdmin } from '@/lib/auth/admin'
import { TradeState } from '@prisma/client'

const ACTIVE_STATES: TradeState[] = [
  TradeState.CREATED,
  TradeState.FUNDED,
  TradeState.MARKED_PAID,
  TradeState.UNDER_REVIEW,
  TradeState.DISPUTED,
]

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req)
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const [
      activeTrades,
      lockedValueAgg,
      openDisputeCount,
      resolvedCases,
      trustScores,
    ] = await Promise.all([
      prisma.trade.count({ where: { state: { in: ACTIVE_STATES } } }),
      prisma.trade.aggregate({
        where: { state: { in: [TradeState.FUNDED, TradeState.MARKED_PAID, TradeState.UNDER_REVIEW, TradeState.DISPUTED] } },
        _sum: { amount: true },
      }),
      prisma.resolverCase.count({ where: { decision: 'PENDING' } }),
      prisma.resolverCase.findMany({
        where: { decision: { not: 'PENDING' }, assignedAt: { not: null }, resolvedAt: { not: null } },
        select: { assignedAt: true, resolvedAt: true },
      }),
      prisma.riskScore.findMany({ select: { trustScore: true } }),
    ])

    // Average resolution time in hours
    let avgResolutionTimeHours = 0
    if (resolvedCases.length > 0) {
      const totalMs = resolvedCases.reduce((sum, c) => {
        return sum + (c.resolvedAt!.getTime() - c.assignedAt!.getTime())
      }, 0)
      avgResolutionTimeHours = totalMs / resolvedCases.length / (1000 * 60 * 60)
    }

    // Trust score distribution buckets: 0-19, 20-39, 40-59, 60-79, 80-100
    const distribution = { '0-19': 0, '20-39': 0, '40-59': 0, '60-79': 0, '80-100': 0 }
    for (const { trustScore } of trustScores) {
      if (trustScore < 20) distribution['0-19']++
      else if (trustScore < 40) distribution['20-39']++
      else if (trustScore < 60) distribution['40-59']++
      else if (trustScore < 80) distribution['60-79']++
      else distribution['80-100']++
    }

    return NextResponse.json({
      activeTrades,
      lockedStablecoinValue: lockedValueAgg._sum.amount ?? 0,
      openDisputeCount,
      avgResolutionTimeHours: Math.round(avgResolutionTimeHours * 100) / 100,
      trustScoreDistribution: distribution,
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = err instanceof Error ? err.message : 'Failed to fetch metrics'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
