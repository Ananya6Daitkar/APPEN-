import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth/session'
import { isAdmin } from '@/lib/auth/admin'
import { AuditActionType } from '@prisma/client'

// Resolvers are identified by having at least one assigned resolver case
async function isResolver(userId: string): Promise<boolean> {
  const count = await prisma.resolverCase.count({ where: { assignedToId: userId } })
  return count > 0
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req)

    const admin = isAdmin(session)
    const resolver = admin ? false : await isResolver(session.sub)

    if (!admin && !resolver) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = req.nextUrl
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)))
    const actorAddress = searchParams.get('actor') ?? undefined
    const entityId = searchParams.get('entityId') ?? undefined
    const actionType = searchParams.get('actionType') as AuditActionType | undefined
    const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined

    const where = {
      ...(actorAddress && { actorAddress }),
      ...(entityId && { entityId }),
      ...(actionType && { actionType }),
      ...((dateFrom || dateTo) && {
        createdAt: {
          ...(dateFrom && { gte: dateFrom }),
          ...(dateTo && { lte: dateTo }),
        },
      }),
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ])

    return NextResponse.json({ logs, total, page, limit })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = err instanceof Error ? err.message : 'Failed to fetch audit log'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
