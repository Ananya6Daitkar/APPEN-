import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { TradeState } from '@prisma/client'

const ACTIVE_STATES: TradeState[] = [
  TradeState.CREATED,
  TradeState.FUNDED,
  TradeState.MARKED_PAID,
  TradeState.UNDER_REVIEW,
  TradeState.DISPUTED,
]

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      include: { reputation: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const activeTradeCount = await prisma.trade.count({
      where: {
        OR: [{ buyerId: user.id }, { sellerId: user.id }],
        state: { in: ACTIVE_STATES },
      },
    })

    return NextResponse.json({
      id: user.id,
      walletAddress: user.walletAddress,
      email: user.email,
      emailVerified: user.emailVerified,
      kycTier: user.kycTier,
      isSuspended: user.isSuspended,
      reputationScore: user.reputation?.score ?? 500,
      activeTradeCount,
      memberSince: user.createdAt,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch profile'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
