import { prisma } from '@/lib/prisma'
import { writeAuditLog } from '@/lib/audit'
import { onTradeReleased } from '@/lib/reputation/reputationService'
import { send as sendNotification } from '@/lib/notifications/notificationService'
import { emitToUser } from '@/lib/websocket/eventBus'

/**
 * Polls every 60 seconds for MARKED_PAID trades whose challenge window has expired.
 * Auto-releases each expired trade: updates state, updates reputation, notifies parties,
 * writes audit log, and emits WebSocket event. (Req 3.4)
 */
export function startChallengeWindowExpiryJob(): void {
  console.log('[challengeWindowExpiry] Job started — polling every 60s')

  setInterval(async () => {
    try {
      const now = new Date()

      const expiredTrades = await prisma.trade.findMany({
        where: {
          state: 'MARKED_PAID',
          challengeExpiresAt: { lte: now },
        },
        select: { id: true, buyerId: true, sellerId: true, state: true },
      })

      if (expiredTrades.length === 0) return

      console.log(`[challengeWindowExpiry] Found ${expiredTrades.length} expired trade(s)`)

      for (const trade of expiredTrades) {
        try {
          // a. Update trade state to RELEASED
          await prisma.trade.update({
            where: { id: trade.id },
            data: {
              state: 'RELEASED',
              releasedAt: now,
            },
          })

          console.log(`[challengeWindowExpiry] Auto-released trade ${trade.id}`)

          // b. Update reputation for buyer and seller
          await onTradeReleased(trade.id)

          // c. Notify buyer and seller
          await Promise.all([
            sendNotification(trade.buyerId, 'trade_released', { tradeId: trade.id }),
            sendNotification(trade.sellerId, 'trade_released', { tradeId: trade.id }),
          ])

          // d. Write audit log
          await writeAuditLog({
            actionType: 'TRADE_STATE_CHANGED',
            entityType: 'Trade',
            entityId: trade.id,
            beforeState: { state: 'MARKED_PAID' },
            afterState: { state: 'RELEASED', releasedAt: now },
            metadata: { trigger: 'challenge_window_expiry' },
          })

          // e. Emit WebSocket event to both parties
          const wsPayload = {
            tradeId: trade.id,
            from: 'MARKED_PAID',
            to: 'RELEASED',
            actor: 'system',
            timestamp: now.toISOString(),
          }
          emitToUser(trade.buyerId, 'trade:state_changed', wsPayload)
          emitToUser(trade.sellerId, 'trade:state_changed', wsPayload)
        } catch (err) {
          // Per-trade error isolation — don't let one failure stop others
          console.error(`[challengeWindowExpiry] Failed to auto-release trade ${trade.id}:`, err)
        }
      }
    } catch (err) {
      console.error('[challengeWindowExpiry] Poll error:', err)
    }
  }, 60_000)
}
