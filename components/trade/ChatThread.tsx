'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/shared/GlassCard'
import { useWebSocket } from '@/lib/websocket/useWebSocket'

interface ChatMessage {
  id: string
  senderId: string
  senderAddress: string
  content: string
  createdAt: string
}

interface ChatThreadProps {
  tradeId: string
  currentUserId: string
  currentUserAddress: string
  buyerAddress: string
  sellerAddress: string
  disabled?: boolean
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function ChatThread({
  tradeId,
  currentUserId,
  currentUserAddress,
  buyerAddress,
  sellerAddress,
  disabled = false,
}: ChatThreadProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load initial messages
  useEffect(() => {
    fetch(`/api/trades/${tradeId}/messages`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: ChatMessage[]) => setMessages(data))
      .catch(() => {/* non-fatal */})
  }, [tradeId])

  // Real-time: listen for new chat messages via WebSocket
  const handleWsEvent = useCallback((event: { type: string; payload: Record<string, unknown> }) => {
    if (event.type === 'trade:state_changed') return
    if (
      event.type === ('trade:message' as string) &&
      (event.payload as { tradeId?: string }).tradeId === tradeId
    ) {
      const msg = event.payload as unknown as ChatMessage
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
    }
  }, [tradeId])

  useWebSocket({ onEvent: handleWsEvent, tradeId })

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    const content = input.trim()
    if (!content || sending || disabled) return

    setSending(true)
    setError(null)

    // Optimistic update
    const optimistic: ChatMessage = {
      id: `optimistic-${Date.now()}`,
      senderId: currentUserId,
      senderAddress: currentUserAddress,
      content,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    setInput('')

    try {
      const res = await fetch(`/api/trades/${tradeId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to send message')
      }

      const saved: ChatMessage = await res.json()
      // Replace optimistic with real message
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? saved : m))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send')
      // Remove optimistic on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setInput(content)
    } finally {
      setSending(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const isMine = (msg: ChatMessage) => msg.senderId === currentUserId

  const getSenderLabel = (msg: ChatMessage) => {
    if (msg.senderAddress.toLowerCase() === buyerAddress.toLowerCase()) return 'Buyer'
    if (msg.senderAddress.toLowerCase() === sellerAddress.toLowerCase()) return 'Seller'
    return shortAddress(msg.senderAddress)
  }

  return (
    <GlassCard className="flex flex-col" style={{ height: 420 }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between shrink-0">
        <h3 className="text-sm font-semibold text-slate-300">Trade Chat</h3>
        <span className="text-xs text-slate-500">Buyer & Seller only</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 min-h-0">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-slate-600">No messages yet. Start the conversation.</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const mine = isMine(msg)
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={cn('flex flex-col gap-0.5 max-w-[80%]', mine ? 'self-end items-end' : 'self-start items-start')}
              >
                <span className="text-[10px] text-slate-500 px-1">
                  {mine ? 'You' : getSenderLabel(msg)} · {formatTime(msg.createdAt)}
                </span>
                <div className={cn(
                  'px-3 py-2 rounded-2xl text-sm leading-relaxed',
                  mine
                    ? 'bg-brand-blue/20 border border-brand-blue/20 text-slate-100 rounded-br-sm'
                    : 'bg-surface-700 border border-[rgba(255,255,255,0.06)] text-slate-200 rounded-bl-sm'
                )}>
                  {msg.content}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.06)] shrink-0">
        {error && (
          <p className="text-xs text-brand-red mb-2">{error}</p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled || sending}
            rows={1}
            placeholder={disabled ? 'Chat unavailable' : 'Type a message… (Enter to send)'}
            className="flex-1 rounded-xl bg-surface-800 border border-[rgba(255,255,255,0.08)] text-sm text-slate-200 placeholder-slate-600 px-3 py-2 resize-none focus:outline-none focus:border-brand-blue/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ maxHeight: 96 }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending || disabled}
            className="w-9 h-9 rounded-xl bg-brand-blue/20 border border-brand-blue/30 text-brand-blue flex items-center justify-center hover:bg-brand-blue/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            aria-label="Send message"
          >
            {sending ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </GlassCard>
  )
}
