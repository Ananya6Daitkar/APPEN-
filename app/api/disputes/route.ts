import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth/session'

// ─── GET /api/disputes ────────────────────────────────────────────────────────
// Returns resolver's assigned cases + unassigned cases, paginated
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req)
    const { searchParams } = req.nextUrl
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))

    const [cases, total] = await Promise.all([
      prisma.resolverCase.findMany({
        where: {
          OR: [
            { assignedToId: session.sub },
            { assignedToId: null },
          ],
          decision: 'PENDING',
        },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          dispute: {
            include: {
              trade: {
                select: {
                  id: true,
                  state: true,
                  amount: true,
                  stablecoin: true,
                  fiatCurrency: true,
                  createdAt: true,
                  buyer: { select: { walletAddress: true } },
                  seller: { select: { walletAddress: true } },
                },
              },
            },
          },
          assignedTo: { select: { id: true, walletAddress: true } },
        },
      }),
      prisma.resolverCase.count({
        where: {
          OR: [{ assignedToId: session.sub }, { assignedToId: null }],
          decision: 'PENDING',
        },
      }),
    ])

    return NextResponse.json({ cases, total, page, limit })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = err instanceof Error ? err.message : 'Failed to fetch disputes'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
