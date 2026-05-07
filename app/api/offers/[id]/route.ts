import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth/session'
import { writeAuditLog } from '@/lib/audit'

const ACTIVE_TRADE_STATES = ['CREATED', 'FUNDED', 'MARKED_PAID', 'UNDER_REVIEW', 'DISPUTED']

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession(req)
    const { id } = await params

    const offer = await prisma.offer.findUnique({
      where: { id },
      include: { trade: { select: { id: true, state: true } } },
    })

    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    if (offer.sellerId !== session.sub) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check for active trade
    if (offer.trade && ACTIVE_TRADE_STATES.includes(offer.trade.state)) {
      return NextResponse.json(
        { error: 'Cannot cancel offer with active trade', tradeId: offer.trade.id },
        { status: 409 }
      )
    }

    await prisma.offer.update({
      where: { id },
      data: { isActive: false },
    })

    await writeAuditLog({
      actorId: session.sub,
      actorAddress: session.address,
      actionType: 'OFFER_CANCELLED',
      entityType: 'Offer',
      entityId: id,
      beforeState: { isActive: true },
      afterState: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = err instanceof Error ? err.message : 'Failed to cancel offer'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
