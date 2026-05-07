import { prisma } from '@/lib/prisma'
import { writeAuditLog } from '@/lib/audit'

function clamp(value: number): number {
  return Math.max(0, Math.min(1000, value))
}

function volProportionalDelta(amount: number): number {
  return Math.min(10, Math.floor(amount / 1000))
}

export async function onTradeReleased(tradeId: string): Promise<void> {
  const trade = await prisma.trade.findUnique({
    where: { id: tradeId },
    include: {
      buyer: { include: { reputation: true } },
      seller: { include: { reputation: true } },
    },
  })
  if (!trade) throw new Error(`Trade ${tradeId} not found`)

  const delta = volProportionalDelta(Number(trade.amount))

  for (const [party, role] of [
    [trade.buyer, 'buyer'],
    [trade.seller, 'seller'],
  ] as const) {
    const rep = party.reputation
    if (!rep) continue

    const newScore = clamp(rep.score + delta)

    await prisma.$transaction([
      prisma.reputation.update({
        where: { id: rep.id },
        data: {
          score: newScore,
          totalTrades: { increment: 1 },
          totalVolume: { increment: trade.amount },
        },
      }),
      prisma.reputationEvent.create({
        data: {
          reputationId: rep.id,
          tradeId,
          delta,
          reason: 'trade_released',
        },
      }),
    ])

    await writeAuditLog({
      actorId: party.id,
      actorAddress: party.walletAddress,
      actionType: 'REPUTATION_UPDATED',
      entityType: 'Reputation',
      entityId: rep.id,
      beforeState: { score: rep.score },
      afterState: { score: newScore, delta, role },
      metadata: { tradeId, reason: 'trade_released' },
    })
  }
}

export async function onTradeRefunded(
  tradeId: string,
  faultParty: 'buyer' | 'seller'
): Promise<void> {
  const trade = await prisma.trade.findUnique({
    where: { id: tradeId },
    include: {
      buyer: { include: { reputation: true } },
      seller: { include: { reputation: true } },
    },
  })
  if (!trade) throw new Error(`Trade ${tradeId} not found`)

  const party = faultParty === 'buyer' ? trade.buyer : trade.seller
  const rep = party.reputation
  if (!rep) return

  const delta = -20
  const newScore = clamp(rep.score + delta)

  await prisma.$transaction([
    prisma.reputation.update({
      where: { id: rep.id },
      data: {
        score: newScore,
        disputeCount: { increment: 1 },
      },
    }),
    prisma.reputationEvent.create({
      data: {
        reputationId: rep.id,
        tradeId,
        delta,
        reason: 'trade_refunded_fault',
      },
    }),
  ])

  await writeAuditLog({
    actorId: party.id,
    actorAddress: party.walletAddress,
    actionType: 'REPUTATION_UPDATED',
    entityType: 'Reputation',
    entityId: rep.id,
    beforeState: { score: rep.score },
    afterState: { score: newScore, delta, faultParty },
    metadata: { tradeId, reason: 'trade_refunded_fault' },
  })
}
