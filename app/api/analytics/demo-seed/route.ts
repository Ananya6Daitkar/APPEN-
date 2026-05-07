import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TradeState } from '@prisma/client'

// Only available in DEMO_MODE
export async function GET(_req: NextRequest) {
  if (process.env.DEMO_MODE !== 'true') {
    return NextResponse.json({ error: 'Demo mode is not enabled' }, { status: 403 })
  }

  try {
    // Check if demo data already exists
    const existingCount = await prisma.trade.count()
    if (existingCount >= 50) {
      return NextResponse.json({ message: 'Demo data already loaded', tradeCount: existingCount })
    }

    // Ensure demo users exist
    const demoUsers = await ensureDemoUsers()

    const [buyer, seller] = demoUsers
    const now = new Date()

    // Seed 50 completed trades
    const completedTrades = Array.from({ length: 50 }, (_, i) => {
      const createdAt = new Date(now.getTime() - (50 - i) * 24 * 60 * 60 * 1000)
      const amount = 100 + Math.floor(Math.random() * 900)
      const stablecoin = i % 2 === 0 ? 'USDC' : 'USDT'
      return {
        offerId: `demo-offer-${i}`,
        buyerId: buyer.id,
        sellerId: seller.id,
        stablecoin,
        amount,
        fiatCurrency: 'USD',
        fiatRate: 1.0,
        state: TradeState.RELEASED,
        releasedAt: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000),
        createdAt,
        updatedAt: createdAt,
      }
    })

    // Seed 5 disputed trades
    const disputedTrades = Array.from({ length: 5 }, (_, i) => {
      const createdAt = new Date(now.getTime() - (10 - i) * 24 * 60 * 60 * 1000)
      return {
        offerId: `demo-disputed-offer-${i}`,
        buyerId: buyer.id,
        sellerId: seller.id,
        stablecoin: 'USDC',
        amount: 500 + i * 100,
        fiatCurrency: 'USD',
        fiatRate: 1.0,
        state: TradeState.DISPUTED,
        createdAt,
        updatedAt: createdAt,
      }
    })

    // Seed 10 active offers
    const activeOffers = Array.from({ length: 10 }, (_, i) => ({
      sellerId: seller.id,
      stablecoin: i % 2 === 0 ? 'USDC' : 'USDT',
      amount: 200 + i * 50,
      fiatCurrency: 'USD',
      fiatRate: 1.0 + i * 0.01,
      paymentRails: ['bank_transfer'],
      isActive: true,
    }))

    // Create demo offers first (trades reference offerId)
    await prisma.$transaction(async (tx) => {
      // Create placeholder offers for completed trades
      for (let i = 0; i < completedTrades.length + disputedTrades.length; i++) {
        const offerId = i < completedTrades.length
          ? `demo-offer-${i}`
          : `demo-disputed-offer-${i - completedTrades.length}`
        await tx.offer.upsert({
          where: { id: offerId },
          create: {
            id: offerId,
            sellerId: seller.id,
            stablecoin: 'USDC',
            amount: 100,
            fiatCurrency: 'USD',
            fiatRate: 1.0,
            paymentRails: ['bank_transfer'],
            isActive: false,
          },
          update: {},
        })
      }

      await tx.trade.createMany({ data: completedTrades, skipDuplicates: true })
      await tx.trade.createMany({ data: disputedTrades, skipDuplicates: true })
      await tx.offer.createMany({ data: activeOffers, skipDuplicates: true })
    })

    // Update reputation for demo users
    await prisma.reputation.upsert({
      where: { userId: buyer.id },
      create: { userId: buyer.id, score: 750, totalTrades: 50, totalVolume: 25000 },
      update: { score: 750, totalTrades: 50, totalVolume: 25000 },
    })
    await prisma.reputation.upsert({
      where: { userId: seller.id },
      create: { userId: seller.id, score: 820, totalTrades: 50, totalVolume: 25000 },
      update: { score: 820, totalTrades: 50, totalVolume: 25000 },
    })

    return NextResponse.json({
      message: 'Demo data loaded',
      completedTrades: completedTrades.length,
      disputedTrades: disputedTrades.length,
      activeOffers: activeOffers.length,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load demo data'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function ensureDemoUsers() {
  const buyer = await prisma.user.upsert({
    where: { walletAddress: '0xDemoBuyer0000000000000000000000000000001' },
    create: {
      walletAddress: '0xDemoBuyer0000000000000000000000000000001',
      kycTier: 1,
      email: 'buyer@demo.appen',
      emailVerified: true,
    },
    update: {},
  })

  const seller = await prisma.user.upsert({
    where: { walletAddress: '0xDemoSeller000000000000000000000000000002' },
    create: {
      walletAddress: '0xDemoSeller000000000000000000000000000002',
      kycTier: 2,
      email: 'seller@demo.appen',
      emailVerified: true,
    },
    update: {},
  })

  return [buyer, seller]
}
