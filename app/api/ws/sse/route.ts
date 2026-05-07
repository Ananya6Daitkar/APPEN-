import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { registerClient, unregisterClient } from '@/lib/websocket/eventBus'
import { registerWsClient, unregisterWsClient } from '@/lib/notifications/notificationService'

// Simple in-memory rate limiter: max 1 SSE connection per user at a time
const activeConnections = new Map<string, number>()
const MAX_CONNECTIONS_PER_USER = 1

export async function GET(req: NextRequest) {
  const session = await getSession(req)

  if (!session) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  const userId = session.sub
  const current = activeConnections.get(userId) ?? 0

  if (current >= MAX_CONNECTIONS_PER_USER) {
    return new Response('Too many connections', {
      status: 429,
      headers: {
        'Content-Type': 'text/plain',
        'Retry-After': '30',
      },
    })
  }

  activeConnections.set(userId, current + 1)

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      function send(data: object) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          cleanup()
        }
      }

      function cleanup() {
        try { controller.close() } catch { /* already closed */ }
        unregisterClient(userId)
        unregisterWsClient(userId)
        const count = activeConnections.get(userId) ?? 1
        if (count <= 1) {
          activeConnections.delete(userId)
        } else {
          activeConnections.set(userId, count - 1)
        }
      }

      registerClient(userId, send)
      registerWsClient(userId, send)

      // Heartbeat every 30s
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          clearInterval(heartbeat)
          cleanup()
        }
      }, 30_000)

      send({ type: 'connected', payload: { userId } })

      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        cleanup()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
