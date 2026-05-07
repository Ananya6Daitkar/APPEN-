import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'

/**
 * WebSocket endpoint — Next.js 15 App Router does not support native WebSocket upgrades.
 * This endpoint returns a 200 with a friendly message so the client can fall back to polling.
 * Real-time updates are delivered via Server-Sent Events (/api/ws/sse) or polling.
 */
export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  return NextResponse.json({
    message: 'WebSocket not supported in Next.js App Router. Use /api/ws/sse for real-time events.',
    userId: session.sub,
  })
}
