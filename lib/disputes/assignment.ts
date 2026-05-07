import { prisma } from '@/lib/prisma'
import { writeAuditLog } from '@/lib/audit'

/**
 * Assigns a ResolverCase to the available resolver with the fewest open cases
 * (round-robin by load), excluding parties to the trade (conflict-of-interest).
 */
export async function assignResolverCase(
  caseId: string,
  buyerId: string,
  sellerId: string
): Promise<string | null> {
  const resolvers = await prisma.user.findMany({
    where: {
      id: { notIn: [buyerId, sellerId] },
      isSuspended: false,
      kycTier: { gte: 1 },
    },
    include: {
      resolverCases: {
        where: { decision: 'PENDING' },
        select: { id: true },
      },
    },
  })

  if (resolvers.length === 0) return null

  resolvers.sort((a, b) => a.resolverCases.length - b.resolverCases.length)
  const resolver = resolvers[0]
  const now = new Date()

  await prisma.resolverCase.update({
    where: { id: caseId },
    data: { assignedToId: resolver.id, assignedAt: now },
  })

  await writeAuditLog({
    actorId: resolver.id,
    actorAddress: resolver.walletAddress,
    actionType: 'DISPUTE_ASSIGNED',
    entityType: 'ResolverCase',
    entityId: caseId,
    afterState: { assignedToId: resolver.id, assignedAt: now.toISOString() },
  })

  return resolver.id
}
