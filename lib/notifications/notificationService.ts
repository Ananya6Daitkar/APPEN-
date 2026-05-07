import { prisma } from '@/lib/prisma'
import { writeAuditLog } from '@/lib/audit'

// ─── Event types (Req 8.3) ────────────────────────────────────────────────────
export type NotificationEventType =
  | 'trade_created'
  | 'trade_funded'
  | 'buyer_marked_paid'
  | 'challenge_window_started'
  | 'challenge_window_expiring'
  | 'trade_released'
  | 'trade_refunded'
  | 'dispute_raised'
  | 'resolver_assigned'
  | 'case_resolved'
  | 'escalated_to_admin'

// In-memory WebSocket client registry: userId → send function
const wsClients = new Map<string, (data: object) => void>()

export function registerWsClient(userId: string, send: (data: object) => void): void {
  wsClients.set(userId, send)
}

export function unregisterWsClient(userId: string): void {
  wsClients.delete(userId)
}

async function sendEmail(
  email: string,
  eventType: NotificationEventType,
  payload: object
): Promise<void> {
  if (process.env.DEMO_MODE === 'true' || !process.env.RESEND_API_KEY) {
    console.log(`[email stub] → ${email} | event: ${eventType} | payload:`, payload)
    return
  }

  // Log-only email stub — add resend package and uncomment below for production
  console.log(`[email] → ${email} | event: ${eventType} | payload:`, payload)
  // To enable real email: npm install resend, then uncomment:
  // const { Resend } = await import('resend')
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({ from: ..., to: email, subject: ..., text: ... })
}

const MAX_RETRIES = 3

async function deliverWithRetry(
  notificationId: string,
  userId: string,
  eventType: NotificationEventType,
  payload: object,
  attempt = 0
): Promise<void> {
  try {
    // WebSocket push (in-app)
    const wsSend = wsClients.get(userId)
    if (wsSend) {
      wsSend({ notificationId, type: eventType, ...payload })
    }

    // Email delivery
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, emailVerified: true },
    })
    if (user?.email && user.emailVerified) {
      await sendEmail(user.email, eventType, payload)
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { delivered: true },
    })
  } catch (err) {
    const nextAttempt = attempt + 1
    if (nextAttempt < MAX_RETRIES) {
      const backoffMs = Math.pow(2, nextAttempt) * 1000
      setTimeout(() => {
        deliverWithRetry(notificationId, userId, eventType, payload, nextAttempt).catch(
          console.error
        )
      }, backoffMs)
    } else {
      // Final failure — mark failed + audit log
      const now = new Date()
      await prisma.notification.update({
        where: { id: notificationId },
        data: { failedAt: now, retryCount: nextAttempt },
      })
      await writeAuditLog({
        actionType: 'NOTIFICATION_FAILED',
        entityType: 'Notification',
        entityId: notificationId,
        metadata: {
          userId,
          eventType,
          error: err instanceof Error ? err.message : String(err),
          attempts: nextAttempt,
        },
      })
    }
  }
}

/**
 * Persist a notification record and attempt delivery via WebSocket + email.
 * Retries up to 3 times with exponential backoff on failure (Req 8.4).
 */
export async function send(
  userId: string,
  eventType: NotificationEventType,
  payload: object
): Promise<void> {
  const notification = await prisma.notification.create({
    data: {
      userId,
      channel: 'IN_APP',
      eventType,
      payload,
    },
  })

  // Fire-and-forget with retry
  deliverWithRetry(notification.id, userId, eventType, payload).catch(console.error)
}
