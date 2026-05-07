import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth/session'
import { writeAuditLog } from '@/lib/audit'
import { send as sendNotification } from '@/lib/notifications/notificationService'

type Params = { params: Promise<{ id: string }> }

// ─── POST /api/trades/:id/mark-paid ──────────────────────────────────────────
// Buyer marks fiat as sent: FUNDED → MARKED_PAID
// Sets markedPaidAt and challengeExpiresAt (now + challengeWindowSeconds)
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession(req)
    const { id } = await params

    const trade = await prisma.trade.findUnique({ where: { id } })
    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    // Only the buyer may mark paid
    if (trade.buyerId !== session.sub) {
      return NextResponse.json({ error: 'Only the buyer can mark this trade as paid' }, { status: 403 })
    }

    // Must be in FUNDED state
    if (trade.state !== 'FUNDED') {
      return NextResponse.json(
        { error: `Invalid state transition: trade is in ${trade.state}, expected FUNDED` },
        { status: 409 }
      )
    }

    const now = new Date()
    const challengeExpiresAt = new Date(now.getTime() + trade.challengeWindowSeconds * 1000)

    const updated = await prisma.trade.update({
      where: { id: trade.id },
      data: {
        state: 'MARKED_PAID',
        markedPaidAt: now,
        challengeExpiresAt,
      },
    })

    await writeAuditLog({
      actorId: session.sub,
      actorAddress: session.address,
      actionType: 'TRADE_STATE_CHANGED',
      entityType: 'Trade',
      entityId: trade.id,
      beforeState: { state: 'FUNDED' },
      afterState: { state: 'MARKED_PAID', markedPaidAt: now, challengeExpiresAt },
    })

    // Notify both parties
    await Promise.all([
      sendNotification(trade.buyerId, 'buyer_marked_paid', { tradeId: trade.id }),
      sendNotification(trade.sellerId, 'buyer_marked_paid', { tradeId: trade.id }),
      sendNotification(trade.sellerId, 'challenge_window_started', {
        tradeId: trade.id,
        challengeExpiresAt,
      }),
    ])

    return NextResponse.json(updated)
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = err instanceof Error ? err.message : 'Failed to mark trade as paid'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
