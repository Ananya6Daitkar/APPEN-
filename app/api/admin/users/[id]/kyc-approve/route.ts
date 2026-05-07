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
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await prisma.user.update({ where: { id }, data: { kycTier: 3 } })

    await writeAuditLog({
      actorId: session.sub,
      actorAddress: session.address,
      actionType: 'KYC_APPROVED',
      entityType: 'User',
      entityId: id,
      beforeState: { kycTier: user.kycTier },
      afterState: { kycTier: 3, approvedBy: session.address, kycDocRef: user.kycDocRef ? '[encrypted]' : null },
      metadata: { approvedAt: new Date().toISOString() },
    })

    return NextResponse.json({ success: true, kycTier: 3 })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = err instanceof Error ? err.message : 'Failed to approve KYC'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
