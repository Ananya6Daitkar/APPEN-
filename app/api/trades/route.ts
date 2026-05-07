import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth/session'
import { writeAuditLog } from '@/lib/audit'
import { TradeState } from '@prisma/client'
import { send as sendNotification } from '@/lib/notifications/notificationService'

const KYC_LIMITS: Record<number, number> = {
  0: 500,
  1: 2000,
  2: 10000,
  3: 50000,
}

const ACTIVE_STATES: TradeState[] = [
  TradeState.CREATED,
  TradeState.FUNDED,
  TradeState.MARKED_PAID,
  TradeState.UNDER_REVIEW,
  TradeState.DISPUTED,
]

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req)
    const { searchParams } = req.nextUrl
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
    const role = searchParams.get('role') // 'buyer' | 'seller' | undefined (both)

    const where = {
      ...(role === 'buyer' ? { buyerId: session.sub } :
          role === 'seller' ? { sellerId: session.sub } :
          { OR: [{ buyerId: session.sub }, { sellerId: session.sub }] }),
    }

    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          offer: { select: { id: true, stablecoin: true, paymentRails: true } },
          buyer: { select: { id: true, walletAddress: true, kycTier: true } },
          seller: { select: { id: true, walletAddress: true, kycTier: true } },
        },
      }),
      prisma.trade.count({ where }),
    ])

    return NextResponse.json({ trades, total, page, limit })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = err instanceof Error ? err.message : 'Failed to fetch trades'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req)
    const { offerId } = await req.json()

    if (!offerId) {
      return NextResponse.json({ error: 'offerId is required' }, { status: 400 })
    }

    // Load offer (must be active)
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: { seller: true },
    })
    if (!offer || !offer.isActive) {
      return NextResponse.json({ error: 'Offer not found or not active' }, { status: 404 })
    }

    // Prevent seller from accepting their own offer
    if (offer.sellerId === session.sub) {
      return NextResponse.json({ error: 'Cannot accept your own offer' }, { status: 400 })
    }

    // Ensure buyer exists (upsert by walletAddress)
    const buyer = await prisma.user.upsert({
      where: { walletAddress: session.address },
      update: {},
      create: {
        walletAddress: session.address,
        kycTier: 0,
      },
      include: { reputation: true },
    })

    // Ensure reputation exists
    if (!buyer.reputation) {
      await prisma.reputation.create({
        data: {
          userId: buyer.id,
          score: 500,
        },
      })
    }

    // KYC tier limit check
    const kycLimit = KYC_LIMITS[buyer.kycTier] ?? 500
    const tradeAmount = Number(offer.amount)
    if (tradeAmount > kycLimit) {
      return NextResponse.json(
        {
          error: `Trade amount exceeds your KYC tier ${buyer.kycTier} limit of ${kycLimit} USDC/USDT. Please upgrade your KYC to proceed.`,
          kycTier: buyer.kycTier,
          limit: kycLimit,
          required: tradeAmount <= KYC_LIMITS[1] ? 1 : tradeAmount <= KYC_LIMITS[2] ? 2 : 3,
        },
        { status: 403 }
      )
    }

    // Low-trust restriction: rep < 200 → max 1 active trade
    const repScore = buyer.reputation?.score ?? 500
    if (repScore < 200) {
      const activeTrades = await prisma.trade.count({
        where: {
          buyerId: session.sub,
          state: { in: ACTIVE_STATES },
        },
      })
      if (activeTrades >= 1) {
        return NextResponse.json(
          {
            error: 'Low-trust accounts (reputation < 200) may only have 1 active trade at a time.',
            reputationScore: repScore,
          },
          { status: 403 }
        )
      }
    }

    // Create trade + mark offer inactive atomically
    const [trade] = await prisma.$transaction([
      prisma.trade.create({
        data: {
          offerId: offer.id,
          buyerId: buyer.id,
          sellerId: offer.sellerId,
          stablecoin: offer.stablecoin,
          amount: offer.amount,
          fiatCurrency: offer.fiatCurrency,
          fiatRate: offer.fiatRate,
          state: 'CREATED',
        },
      }),
      prisma.offer.update({
        where: { id: offer.id },
        data: { isActive: false },
      }),
    ])

    await writeAuditLog({
      actorId: buyer.id,
      actorAddress: session.address,
      actionType: 'TRADE_CREATED',
      entityType: 'Trade',
      entityId: trade.id,
      afterState: { state: 'CREATED', offerId, buyerId: buyer.id, sellerId: offer.sellerId },
    })

    // Notify buyer + seller of trade creation
    await Promise.all([
      sendNotification(buyer.id, 'trade_created', { tradeId: trade.id, offerId }),
      sendNotification(offer.sellerId, 'trade_created', { tradeId: trade.id, offerId }),
    ])

    return NextResponse.json(trade, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = err instanceof Error ? err.message : 'Failed to create trade'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
