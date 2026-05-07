import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth/session'
import { writeAuditLog } from '@/lib/audit'
import { send as sendNotification } from '@/lib/notifications/notificationService'

type Params = { params: Promise<{ id: string }> }

/**
 * Round-robin resolver assignment.
 * Picks the resolver with the fewest open (PENDING) cases,
 * excluding anyone who is a party to this trade (conflict-of-interest).
 */
async function assignResolver(buyerId: string, sellerId: string): Promise<string | null> {
  // Find all users with RESOLVER role — in this schema resolvers are identified
  // by having at least one resolved case or being seeded; we use a simple heuristic:
  // any user that is neither buyer nor seller and has kycTier >= 1.
  // In production this would be a dedicated role field.
  const resolvers = await prisma.user.findMany({
    where: {
      id: { notIn: [buyerId, sellerId] },
      isSuspended: false,
      kycTier: { gte: 1 },
    },
    include: {
      resolverCases: {
        where: { decision: 'PENDING' },
        select: { id: true },
      },
    },
  })

  if (resolvers.length === 0) return null

  // Pick resolver with fewest open cases (round-robin by load)
  resolvers.sort((a, b) => a.resolverCases.length - b.resolverCases.length)
  return resolvers[0].id
}

// ─── POST /api/trades/:id/dispute ─────────────────────────────────────────────
// Seller raises dispute during challenge window: MARKED_PAID → DISPUTED
// Creates Dispute + ResolverCase with round-robin assignment
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession(req)
    const { id } = await params

    const trade = await prisma.trade.findUnique({ where: { id } })
    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    // Only the seller may raise a dispute
    if (trade.sellerId !== session.sub) {
      return NextResponse.json({ error: 'Only the seller can raise a dispute' }, { status: 403 })
    }

    // Must be in MARKED_PAID state
    if (trade.state !== 'MARKED_PAID') {
      return NextResponse.json(
        { error: `Invalid state transition: trade is in ${trade.state}, expected MARKED_PAID` },
        { status: 409 }
      )
    }

    // Challenge window must still be active
    if (trade.challengeExpiresAt && new Date() > trade.challengeExpiresAt) {
      return NextResponse.json(
        { error: 'Challenge window has expired; dispute cannot be raised' },
        { status: 409 }
      )
    }

    // Assign resolver (round-robin, conflict-of-interest excluded)
    const resolverId = await assignResolver(trade.buyerId, trade.sellerId)
    const now = new Date()

    // Transition trade + create Dispute + ResolverCase atomically
    const [updatedTrade, dispute] = await prisma.$transaction(async (tx) => {
      const updated = await tx.trade.update({
        where: { id: trade.id },
        data: { state: 'DISPUTED' },
      })

      const newDispute = await tx.dispute.create({
        data: {
          tradeId: trade.id,
          raisedById: session.sub,
          resolverCase: {
            create: {
              assignedToId: resolverId ?? undefined,
              assignedAt: resolverId ? now : undefined,
            },
          },
        },
        include: { resolverCase: true },
      })

      return [updated, newDispute]
    })

    await writeAuditLog({
      actorId: session.sub,
      actorAddress: session.address,
      actionType: 'DISPUTE_CREATED',
      entityType: 'Trade',
      entityId: trade.id,
      beforeState: { state: 'MARKED_PAID' },
      afterState: { state: 'DISPUTED', disputeId: dispute.id, resolverId },
    })

    if (resolverId) {
      await writeAuditLog({
        actorId: resolverId,
        actionType: 'DISPUTE_ASSIGNED',
        entityType: 'ResolverCase',
        entityId: dispute.resolverCase!.id,
        afterState: { assignedToId: resolverId, assignedAt: now },
      })
    }

    // Notify parties
    await Promise.all([
      sendNotification(trade.buyerId, 'dispute_raised', { tradeId: trade.id, disputeId: dispute.id }),
      sendNotification(trade.sellerId, 'dispute_raised', { tradeId: trade.id, disputeId: dispute.id }),
      ...(resolverId
        ? [sendNotification(resolverId, 'resolver_assigned', { caseId: dispute.resolverCase!.id, tradeId: trade.id })]
        : []),
    ])

    return NextResponse.json({ trade: updatedTrade, dispute }, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = err instanceof Error ? err.message : 'Failed to raise dispute'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
