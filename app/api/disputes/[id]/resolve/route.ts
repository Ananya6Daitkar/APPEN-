import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth/session'
import { writeAuditLog } from '@/lib/audit'
import { onTradeReleased, onTradeRefunded } from '@/lib/reputation/reputationService'
import { send as sendNotification } from '@/lib/notifications/notificationService'

type Params = { params: Promise<{ id: string }> }

// ─── POST /api/disputes/:id/resolve ──────────────────────────────────────────
// Resolver submits release or refund decision
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession(req)
    const { id } = await params
    const { decision, rationale } = await req.json()

    // Validate inputs
    if (!decision || !['release', 'refund'].includes(decision)) {
      return NextResponse.json({ error: 'decision must be "release" or "refund"' }, { status: 400 })
    }
    if (!rationale || rationale.trim().length < 20) {
      return NextResponse.json(
        { error: 'rationale must be at least 20 characters' },
        { status: 400 }
      )
    }

    const resolverCase = await prisma.resolverCase.findUnique({
      where: { id },
      include: {
        dispute: {
          include: {
            trade: true,
          },
        },
      },
    })

    if (!resolverCase) {
      return NextResponse.json({ error: 'Dispute case not found' }, { status: 404 })
    }

    if (resolverCase.decision !== 'PENDING') {
      return NextResponse.json({ error: 'Case already resolved' }, { status: 409 })
    }

    const trade = resolverCase.dispute.trade

    // Conflict-of-interest check
    if (session.sub === trade.buyerId || session.sub === trade.sellerId) {
      return NextResponse.json(
        { error: 'Conflict of interest: resolver cannot adjudicate their own trade' },
        { status: 403 }
      )
    }

    const now = new Date()
    const prismaDecision = decision === 'release' ? 'RELEASE' : 'REFUND'
    const newTradeState = decision === 'release' ? 'RELEASED' : 'REFUNDED'

    // Record decision + update trade state atomically
    await prisma.$transaction([
      prisma.resolverCase.update({
        where: { id },
        data: {
          decision: prismaDecision,
          rationale: rationale.trim(),
          resolvedAt: now,
        },
      }),
      prisma.dispute.update({
        where: { id: resolverCase.disputeId },
        data: { decision: prismaDecision, resolvedAt: now },
      }),
      prisma.trade.update({
        where: { id: trade.id },
        data: {
          state: newTradeState,
          ...(decision === 'release' ? { releasedAt: now } : { refundedAt: now }),
        },
      }),
    ])

    await writeAuditLog({
      actorId: session.sub,
      actorAddress: session.address,
      actionType: 'DISPUTE_RESOLVED',
      entityType: 'ResolverCase',
      entityId: id,
      beforeState: { decision: 'PENDING', tradeState: trade.state },
      afterState: { decision: prismaDecision, tradeState: newTradeState, rationale: rationale.trim() },
      metadata: { tradeId: trade.id },
    })

    // Update reputation based on decision
    if (decision === 'release') {
      await onTradeReleased(trade.id)
    } else {
      await onTradeRefunded(trade.id, 'buyer')
    }

    // Notify both parties
    const tradeEventType = decision === 'release' ? 'trade_released' : 'trade_refunded'
    await Promise.all([
      sendNotification(trade.buyerId, 'case_resolved', { caseId: id, decision: prismaDecision }),
      sendNotification(trade.sellerId, 'case_resolved', { caseId: id, decision: prismaDecision }),
      sendNotification(trade.buyerId, tradeEventType, { tradeId: trade.id }),
      sendNotification(trade.sellerId, tradeEventType, { tradeId: trade.id }),
    ])

    return NextResponse.json({ success: true, decision: prismaDecision, tradeState: newTradeState })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = err instanceof Error ? err.message : 'Failed to resolve dispute'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
