import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TradeState } from '@prisma/client'

const VALID_STATES: TradeState[] = [
  TradeState.CREATED,
  TradeState.FUNDED,
  TradeState.MARKED_PAID,
  TradeState.UNDER_REVIEW,
  TradeState.DISPUTED,
  TradeState.RELEASED,
]

export async function POST(req: NextRequest) {
  if (process.env.DEMO_MODE !== 'true') {
    return NextResponse.json({ error: 'Demo mode only' }, { status: 403 })
  }

  const { tradeId, targetState } = await req.json() as { tradeId: string; targetState: string }

  if (!VALID_STATES.includes(targetState as TradeState)) {
    return NextResponse.json({ error: 'Invalid state' }, { status: 400 })
  }

  const now = new Date()
  const updateData: Record<string, unknown> = { state: targetState as TradeState }

  if (targetState === 'MARKED_PAID') {
    updateData.markedPaidAt = now
    updateData.challengeExpiresAt = new Date(now.getTime() + 30 * 60 * 1000)
  }
  if (targetState === 'RELEASED') updateData.releasedAt = now
  if (targetState === 'REFUNDED') updateData.refundedAt = now

  const trade = await prisma.trade.update({
    where: { id: tradeId },
    data: updateData,
  })

  return NextResponse.json(trade)
}
