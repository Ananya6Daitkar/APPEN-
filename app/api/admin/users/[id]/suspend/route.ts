import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth/session'
import { writeAuditLog } from '@/lib/audit'
import { isAdmin } from '@/lib/auth/admin'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession(req)
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const { reason } = await req.json()

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json({ error: 'reason is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (user.isSuspended) {
      return NextResponse.json({ error: 'User is already suspended' }, { status: 409 })
    }

    const now = new Date()

    // Cancel all active offers + suspend user atomically
    const [cancelledOffers] = await prisma.$transaction([
      prisma.offer.updateMany({
        where: { sellerId: id, isActive: true },
        data: { isActive: false },
      }),
      prisma.user.update({
        where: { id },
        data: {
          isSuspended: true,
          suspendedAt: now,
          suspendedBy: session.address,
          suspendReason: reason.trim(),
        },
      }),
    ])

    await writeAuditLog({
      actorId: session.sub,
      actorAddress: session.address,
      actionType: 'USER_SUSPENDED',
      entityType: 'User',
      entityId: id,
      beforeState: { isSuspended: false },
      afterState: {
        isSuspended: true,
        suspendedAt: now.toISOString(),
        suspendedBy: session.address,
        reason: reason.trim(),
        cancelledOffers: cancelledOffers.count,
      },
    })

    return NextResponse.json({ success: true, cancelledOffers: cancelledOffers.count })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = err instanceof Error ? err.message : 'Failed to suspend user'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
