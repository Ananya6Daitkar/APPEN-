import { prisma } from '@/lib/prisma'
import { writeAuditLog } from '@/lib/audit'

const ESCALATION_THRESHOLD_MS = 48 * 60 * 60 * 1000 // 48 hours
const CHECK_INTERVAL_MS = 5 * 60 * 1000              // every 5 minutes

/**
 * Escalates ResolverCases that have been assigned but unresolved for >48h.
 * Marks escalatedAt and logs to AuditLog.
 */
export async function runEscalationCheck(): Promise<void> {
  const cutoff = new Date(Date.now() - ESCALATION_THRESHOLD_MS)

  const staleCases = await prisma.resolverCase.findMany({
    where: {
      decision: 'PENDING',
      assignedAt: { lte: cutoff },
      escalatedAt: null,
    },
    include: {
      dispute: { include: { trade: { select: { buyerId: true, sellerId: true } } } },
    },
  })

  for (const c of staleCases) {
    const now = new Date()
    await prisma.resolverCase.update({
      where: { id: c.id },
      data: { escalatedAt: now },
    })

    await writeAuditLog({
      actionType: 'DISPUTE_ASSIGNED',
      entityType: 'ResolverCase',
      entityId: c.id,
      beforeState: { escalatedAt: null },
      afterState: { escalatedAt: now.toISOString(), escalatedToAdmin: true },
      metadata: { reason: 'unresolved_48h', tradeId: c.dispute.tradeId },
    })
  }
}

let escalationTimer: ReturnType<typeof setInterval> | null = null

export function startEscalationWorker(): void {
  if (escalationTimer) return
  escalationTimer = setInterval(() => {
    runEscalationCheck().catch(console.error)
  }, CHECK_INTERVAL_MS)
}

export function stopEscalationWorker(): void {
  if (escalationTimer) {
    clearInterval(escalationTimer)
    escalationTimer = null
  }
}
