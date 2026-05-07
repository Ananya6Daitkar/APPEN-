/**
 * In-process WebSocket event bus.
 * Clients register a send function; the bus broadcasts typed events.
 * Used by notificationService and trade/dispute routes to push real-time updates.
 */

type WsEventType =
  | 'trade:state_changed'
  | 'trade:proof_processed'
  | 'dispute:assigned'
  | 'dispute:resolved'
  | 'notification:new'
  | 'analytics:update'

interface WsEvent {
  type: WsEventType
  payload: object
}

// userId → send function
const clients = new Map<string, (event: WsEvent) => void>()

export function registerClient(userId: string, send: (event: WsEvent) => void): void {
  clients.set(userId, send)
}

export function unregisterClient(userId: string): void {
  clients.delete(userId)
}

/** Emit to a specific user */
export function emitToUser(userId: string, type: WsEventType, payload: object): void {
  clients.get(userId)?.(  { type, payload })
}

/** Broadcast to all connected clients */
export function broadcast(type: WsEventType, payload: object): void {
  for (const send of clients.values()) {
    try { send({ type, payload }) } catch { /* ignore disconnected clients */ }
  }
}
