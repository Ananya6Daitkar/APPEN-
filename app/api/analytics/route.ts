import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TradeState } from '@prisma/client'

export async function GET(_req: NextRequest) {
  try {
    const [trades, riskScores, disputes, users] = await Promise.all([
      prisma.trade.findMany({
        select: {
          id: true,
          stablecoin: true,
          amount: true,
          state: true,
          createdAt: true,
          buyerId: true,
          sellerId: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.riskScore.findMany({ select: { trustScore: true } }),
      prisma.dispute.findMany({ select: { createdAt: true, tradeId: true } }),
      prisma.user.findMany({
        select: {
          id: true,
          walletAddress: true,
          reputation: { select: { totalVolume: true, totalTrades: true } },
        },
      }),
    ])

    // ── Trades over time (daily buckets) ──────────────────────────────────────
    const tradesByDay: Record<string, number> = {}
    for (const t of trades) {
      const day = t.createdAt.toISOString().slice(0, 10)
      tradesByDay[day] = (tradesByDay[day] ?? 0) + 1
    }
    const tradesOverTime = Object.entries(tradesByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }))

    // ── Volume by stablecoin ──────────────────────────────────────────────────
    const volumeMap: Record<string, number> = {}
    for (const t of trades) {
      if (t.state === TradeState.RELEASED) {
        volumeMap[t.stablecoin] = (volumeMap[t.stablecoin] ?? 0) + Number(t.amount)
      }
    }
    const volumeByStablecoin = Object.entries(volumeMap).map(([stablecoin, volume]) => ({
      stablecoin,
      volume,
    }))

    // ── Trust score distribution ──────────────────────────────────────────────
    const dist = { '0-19': 0, '20-39': 0, '40-59': 0, '60-79': 0, '80-100': 0 }
    for (const { trustScore } of riskScores) {
      if (trustScore < 20) dist['0-19']++
      else if (trustScore < 40) dist['20-39']++
      else if (trustScore < 60) dist['40-59']++
      else if (trustScore < 80) dist['60-79']++
      else dist['80-100']++
    }
    const trustScoreDistribution = Object.entries(dist).map(([bucket, count]) => ({ bucket, count }))

    // ── Dispute rate over time (weekly buckets) ───────────────────────────────
    const tradesByWeek: Record<string, number> = {}
    const disputesByWeek: Record<string, number> = {}
    for (const t of trades) {
      const week = getWeekKey(t.createdAt)
      tradesByWeek[week] = (tradesByWeek[week] ?? 0) + 1
    }
    for (const d of disputes) {
      const week = getWeekKey(d.createdAt)
      disputesByWeek[week] = (disputesByWeek[week] ?? 0) + 1
    }
    const disputeRateOverTime = Object.keys(tradesByWeek)
      .sort()
      .map((week) => ({
        week,
        disputeRate:
          tradesByWeek[week] > 0
            ? Math.round(((disputesByWeek[week] ?? 0) / tradesByWeek[week]) * 10000) / 100
            : 0,
      }))

    // ── Top traders by volume ─────────────────────────────────────────────────
    const topTradersByVolume = users
      .filter((u) => u.reputation && Number(u.reputation.totalVolume) > 0)
      .sort((a, b) => Number(b.reputation!.totalVolume) - Number(a.reputation!.totalVolume))
      .slice(0, 10)
      .map((u) => ({
        walletAddress: u.walletAddress,
        totalVolume: Number(u.reputation!.totalVolume),
        totalTrades: u.reputation!.totalTrades,
      }))

    return NextResponse.json({
      tradesOverTime,
      volumeByStablecoin,
      trustScoreDistribution,
      disputeRateOverTime,
      topTradersByVolume,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch analytics'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function getWeekKey(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay()) // start of week (Sunday)
  return d.toISOString().slice(0, 10)
}
