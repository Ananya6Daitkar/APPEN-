import { prisma } from '@/lib/prisma'
import { writeAuditLog } from '@/lib/audit'
import { onTradeRefunded } from '@/lib/reputation/reputationService'
import { send as sendNotification } from '@/lib/notifications/notificationService'
import { emitToUser } from '@/lib/websocket/eventBus'

/**
 * Polls every 60 seconds for FUNDED trades that have been waiting more than 24 hours
 * without a MarkedPaid action. Auto-refunds each timed-out trade to the seller. (Req 3.9)
 */
export function startFundedTimeoutJob(): void {
  console.log('[fundedTimeout] Job started — polling every 60s')

  setInterval(async () => {
    try {
      const now = new Date()
      const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      const timedOutTrades = await prisma.trade.findMany({
        where: {
          state: 'FUNDED',
          createdAt: { lte: cutoff },
        },
        select: { id: true, buyerId: true, sellerId: true, state: true },
      })

      if (timedOutTrades.length === 0) return

      console.log(`[fundedTimeout] Found ${timedOutTrades.length} timed-out trade(s)`)

      for (const trade of timedOutTrades) {
        try {
          // a. Update state to REFUNDED
          await prisma.trade.update({
            where: { id: trade.id },
            data: {
              state: 'REFUNDED',
              refundedAt: now,
            },
          })

          console.log(`[fundedTimeout] Auto-refunded trade ${trade.id}`)

          // b. Buyer is at fault for not paying
          await onTradeRefunded(trade.id, 'buyer')

          // c. Notify both parties
          await Promise.all([
            sendNotification(trade.buyerId, 'trade_refunded', { tradeId: trade.id }),
            sendNotification(trade.sellerId, 'trade_refunded', { tradeId: trade.id }),
          ])

          // d. Write audit log
          await writeAuditLog({
            actionType: 'TRADE_STATE_CHANGED',
            entityType: 'Trade',
            entityId: trade.id,
            beforeState: { state: 'FUNDED' },
            afterState: { state: 'REFUNDED', refundedAt: now },
            metadata: { trigger: 'funded_timeout_24h' },
          })

          // e. Emit WebSocket event to both parties
          const wsPayload = {
            tradeId: trade.id,
            from: 'FUNDED',
            to: 'REFUNDED',
            actor: 'system',
            timestamp: now.toISOString(),
          }
          emitToUser(trade.buyerId, 'trade:state_changed', wsPayload)
          emitToUser(trade.sellerId, 'trade:state_changed', wsPayload)
        } catch (err) {
          // Per-trade error isolation — don't let one failure stop others
          console.error(`[fundedTimeout] Failed to auto-refund trade ${trade.id}:`, err)
        }
      }
    } catch (err) {
      console.error('[fundedTimeout] Poll error:', err)
    }
  }, 60_000)
}
