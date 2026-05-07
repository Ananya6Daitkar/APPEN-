'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

export type WsEventType =
  | 'trade:state_changed'
  | 'trade:proof_processed'
  | 'dispute:assigned'
  | 'dispute:resolved'
  | 'notification:new'
  | 'analytics:update'
  | 'connected'

export interface WsEvent {
  type: WsEventType
  payload: Record<string, unknown>
}

interface UseWebSocketOptions {
  onEvent?: (event: WsEvent) => void
  tradeId?: string
}

// Global singleton — only ONE SSE connection across the whole app
// Prevents "too many requests" when multiple components use this hook
let globalEs: EventSource | null = null
const globalListeners = new Set<(event: WsEvent) => void>()
let globalRetries = 0
let globalRetryTimer: ReturnType<typeof setTimeout> | null = null
let globalStopped = false // set to true after 429 or max retries

const MAX_RETRIES = 2
const RETRY_DELAY_MS = 15000 // 15s between retries

function connectGlobal() {
  if (globalEs || globalStopped) return
  if (typeof window === 'undefined') return

  // Only connect if logged in
  const token = localStorage.getItem('appen_token')
  if (!token) return

  try {
    globalEs = new EventSource('/api/ws/sse')

    globalEs.onopen = () => {
      globalRetries = 0
    }

    globalEs.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as WsEvent
        globalListeners.forEach((fn) => {
          try { fn(event) } catch { /* ignore */ }
        })
      } catch { /* ignore malformed */ }
    }

    globalEs.onerror = () => {
      globalEs?.close()
      globalEs = null
      globalRetries += 1

      if (globalRetries >= MAX_RETRIES) {
        globalStopped = true // stop permanently — real-time just won't work
        return
      }

      if (globalRetryTimer) clearTimeout(globalRetryTimer)
      globalRetryTimer = setTimeout(connectGlobal, RETRY_DELAY_MS)
    }
  } catch {
    // EventSource constructor failed — ignore silently
  }
}

function resetGlobal() {
  if (globalRetryTimer) clearTimeout(globalRetryTimer)
  globalEs?.close()
  globalEs = null
  globalRetries = 0
  globalStopped = false
}

export function useWebSocket({ onEvent, tradeId: _tradeId }: UseWebSocketOptions = {}) {
  const [connected, setConnected] = useState(false)
  const [notifications, setNotifications] = useState<WsEvent[]>([])
  const listenerRef = useRef<((event: WsEvent) => void) | null>(null)

  const handleEvent = useCallback(
    (event: WsEvent) => {
      if (event.type === 'notification:new') {
        setNotifications((prev) => [event, ...prev].slice(0, 50))
      }
      if (event.type === 'connected') {
        setConnected(true)
      }
      onEvent?.(event)
    },
    [onEvent]
  )

  useEffect(() => {
    listenerRef.current = handleEvent
    globalListeners.add(handleEvent)

    // Delay first connect to avoid SSR issues and rapid mount/unmount cycles
    const initTimer = setTimeout(() => {
      connectGlobal()
    }, 800)

    return () => {
      if (listenerRef.current) {
        globalListeners.delete(listenerRef.current)
      }
      clearTimeout(initTimer)

      // Disconnect global only when last listener unmounts
      if (globalListeners.size === 0) {
        resetGlobal()
      }
    }
  }, [handleEvent])

  const send = useCallback((_data: object) => {}, [])

  return { connected, notifications, send }
}
