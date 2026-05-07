import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth/session'
import { writeAuditLog } from '@/lib/audit'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
    const stablecoin = searchParams.get('stablecoin') ?? undefined
    const rail = searchParams.get('rail') ?? undefined
    const fiatCurrency = searchParams.get('fiatCurrency') ?? undefined

    const where = {
      isActive: true,
      ...(stablecoin && { stablecoin }),
      ...(fiatCurrency && { fiatCurrency }),
      ...(rail && { paymentRails: { has: rail } }),
    }

    const [offers, total] = await Promise.all([
      prisma.offer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          seller: {
            select: {
              walletAddress: true,
              kycTier: true,
              reputation: { select: { score: true } },
            },
          },
        },
      }),
      prisma.offer.count({ where }),
    ])

    return NextResponse.json({ offers, total, page, limit })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch offers'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req)

    const body = await req.json()
    const { stablecoin, amount, fiatCurrency, fiatRate, paymentRails, txHash } = body

    // Validate stablecoin
    if (!['USDC', 'USDT'].includes(stablecoin)) {
      return NextResponse.json({ error: 'stablecoin must be USDC or USDT' }, { status: 400 })
    }

    // Validate amount
    const numAmount = Number(amount)
    if (isNaN(numAmount) || numAmount < 10 || numAmount > 50000) {
      return NextResponse.json({ error: 'amount must be between 10 and 50000' }, { status: 400 })
    }

    // Validate fiatRate
    const numRate = Number(fiatRate)
    if (isNaN(numRate) || numRate <= 0) {
      return NextResponse.json({ error: 'fiatRate must be greater than 0' }, { status: 400 })
    }

    // Validate paymentRails
    if (!Array.isArray(paymentRails) || paymentRails.length === 0) {
      return NextResponse.json({ error: 'paymentRails must be a non-empty array' }, { status: 400 })
    }

    // Ensure user exists first (critical for foreign key)
    // Use walletAddress as the unique key since it's what we have
    const user = await prisma.user.upsert({
      where: { walletAddress: session.address },
      update: {},
      create: {
        walletAddress: session.address,
        kycTier: 0,
      },
    })

    // Ensure reputation exists
    await prisma.reputation.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        score: 500,
      },
    })

    // 60s duplicate check
    const since = new Date(Date.now() - 60_000)
    const duplicate = await prisma.offer.findFirst({
      where: {
        sellerId: user.id,
        amount: numAmount,
        fiatRate: numRate,
        paymentRails: { equals: paymentRails },
        createdAt: { gte: since },
      },
    })
    if (duplicate) {
      return NextResponse.json({ error: 'Duplicate offer submitted within 60 seconds' }, { status: 409 })
    }

    const offer = await prisma.offer.create({
      data: {
        sellerId: user.id,
        stablecoin,
        amount: numAmount,
        fiatCurrency,
        fiatRate: numRate,
        paymentRails,
        txHash: txHash ?? null,
      },
    })

    await writeAuditLog({
      actorId: user.id,
      actorAddress: session.address,
      actionType: 'OFFER_CREATED',
      entityType: 'Offer',
      entityId: offer.id,
      afterState: { stablecoin, amount: numAmount, fiatCurrency, fiatRate: numRate, paymentRails },
    })

    return NextResponse.json(offer, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = err instanceof Error ? err.message : 'Failed to create offer'
    console.error('Offer creation error:', message, err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
