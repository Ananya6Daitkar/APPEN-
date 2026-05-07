import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth/session'
import { writeAuditLog } from '@/lib/audit'
import { onTradeRefunded } from '@/lib/reputation/reputationService'
import { send as sendNotification } from '@/lib/notifications/notificationService'
import { emitToUser } from '@/lib/websocket/eventBus'

type Params = { params: Promise<{ id: string }> }

const FUNDED_TIMEOUT_MS = 24 * 60 * 60 * 1000

// ─── POST /api/trades/:id/refund-expired ─────────────────────────────────────
// Seller triggers refund after 24h funded timeout: FUNDED → REFUNDED (Req 3.9)
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession(req)
    const { id } = await params

    const trade = await prisma.trade.findUnique({ where: { id } })
    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    // Only the seller may trigger this refund
    if (trade.sellerId !== session.sub) {
      return NextResponse.json({ error: 'Only the seller can trigger a funded-timeout refund' }, { status: 403 })
    }

    // Must be in FUNDED state
    if (trade.state !== 'FUNDED') {
      return NextResponse.json(
        { error: `Trade is in ${trade.state} state; refund-expired requires FUNDED` },
        { status: 400 }
      )
    }

    // Must have been funded for more than 24 hours
    const now = new Date()
    const elapsed = now.getTime() - trade.createdAt.getTime()
    if (elapsed < FUNDED_TIMEOUT_MS) {
      const remainingMs = FUNDED_TIMEOUT_MS - elapsed
      const remainingHours = (remainingMs / (60 * 60 * 1000)).toFixed(1)
      return NextResponse.json(
        { error: `Funded timeout not reached yet. ${remainingHours}h remaining.` },
        { status: 400 }
      )
    }

    // a. Update state to REFUNDED
    const updated = await prisma.trade.update({
      where: { id: trade.id },
      data: {
        state: 'REFUNDED',
        refundedAt: now,
      },
    })

    // b. Buyer is at fault for not paying
    await onTradeRefunded(trade.id, 'buyer')

    // c. Notify both parties
    await Promise.all([
      sendNotification(trade.buyerId, 'trade_refunded', { tradeId: trade.id }),
      sendNotification(trade.sellerId, 'trade_refunded', { tradeId: trade.id }),
    ])

    // d. Write audit log
    await writeAuditLog({
      actorId: session.sub,
      actorAddress: session.address,
      actionType: 'TRADE_STATE_CHANGED',
      entityType: 'Trade',
      entityId: trade.id,
      beforeState: { state: 'FUNDED' },
      afterState: { state: 'REFUNDED', refundedAt: now },
      metadata: { trigger: 'funded_timeout_24h' },
    })

    // e. Emit WebSocket event to both parties
    const wsPayload = {
      tradeId: trade.id,
      from: 'FUNDED',
      to: 'REFUNDED',
      actor: session.sub,
      timestamp: now.toISOString(),
    }
    emitToUser(trade.buyerId, 'trade:state_changed', wsPayload)
    emitToUser(trade.sellerId, 'trade:state_changed', wsPayload)

    return NextResponse.json({ success: true, trade: { id: updated.id, state: updated.state } })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = err instanceof Error ? err.message : 'Failed to process refund'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
