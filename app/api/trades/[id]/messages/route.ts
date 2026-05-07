import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth/session'
import { emitToUser } from '@/lib/websocket/eventBus'

type Params = { params: Promise<{ id: string }> }

// ─── GET /api/trades/:id/messages ─────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const trade = await prisma.trade.findUnique({ where: { id }, select: { id: true, buyerId: true, sellerId: true } })
    if (!trade) return NextResponse.json({ error: 'Trade not found' }, { status: 404 })

    // TradeMessage model added via migration — use dynamic access
    const messages = await (prisma as unknown as { tradeMessage: { findMany: (args: object) => Promise<unknown[]> } }).tradeMessage.findMany({
      where: { tradeId: id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        senderId: true,
        senderAddress: true,
        content: true,
        createdAt: true,
      },
    })

    return NextResponse.json(messages)
  } catch {
    // If model doesn't exist yet (pre-migration), return empty array gracefully
    return NextResponse.json([])
  }
}

// ─── POST /api/trades/:id/messages ────────────────────────────────────────────
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession(req)
    const { id } = await params
    const { content } = await req.json()

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }
    if (content.trim().length > 1000) {
      return NextResponse.json({ error: 'Message too long (max 1000 chars)' }, { status: 400 })
    }

    const trade = await prisma.trade.findUnique({
      where: { id },
      select: { id: true, buyerId: true, sellerId: true },
    })
    if (!trade) return NextResponse.json({ error: 'Trade not found' }, { status: 404 })

    // Only buyer or seller may chat
    if (session.sub !== trade.buyerId && session.sub !== trade.sellerId) {
      return NextResponse.json({ error: 'Only trade participants can send messages' }, { status: 403 })
    }

    // TradeMessage model — use dynamic access
    const message = await (prisma as unknown as { tradeMessage: { create: (args: object) => Promise<unknown> } }).tradeMessage.create({
      data: {
        tradeId: id,
        senderId: session.sub,
        senderAddress: session.address,
        content: content.trim(),
      },
    })

    // Push to both parties via WebSocket
    const msg = message as { id: string; senderId: string; senderAddress: string; content: string; createdAt: Date }
    const wsPayload = { tradeId: id, ...msg }
    emitToUser(trade.buyerId, 'trade:state_changed' as never, wsPayload)
    emitToUser(trade.sellerId, 'trade:state_changed' as never, wsPayload)

    return NextResponse.json(message, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
