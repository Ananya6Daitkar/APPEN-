'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const DEMO_STATES = [
  'CREATED', 'FUNDED', 'MARKED_PAID', 'UNDER_REVIEW', 'DISPUTED', 'RELEASED',
] as const

type DemoState = typeof DEMO_STATES[number]

const STATE_LABELS: Record<DemoState, string> = {
  CREATED: 'Created',
  FUNDED: 'Funded',
  MARKED_PAID: 'Marked Paid',
  UNDER_REVIEW: 'Under Review',
  DISPUTED: 'Disputed',
  RELEASED: 'Released',
}

interface DemoControlPanelProps {
  tradeId?: string
  currentState?: string
  onStateChange?: (state: string) => void
}

export function DemoControlPanel({ tradeId, currentState, onStateChange }: DemoControlPanelProps) {
  const [open, setOpen] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [localTradeId, setLocalTradeId] = useState(tradeId ?? '')
  const playRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Only render in DEMO_MODE
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') return null

  const currentIdx = DEMO_STATES.indexOf((currentState ?? 'CREATED') as DemoState)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function jumpToState(state: DemoState) {
    if (!localTradeId) { showToast('No trade ID set'); return }
    try {
      const res = await fetch('/api/demo/advance-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeId: localTradeId, targetState: state }),
      })
      if (!res.ok) throw new Error('Failed')
      onStateChange?.(state)
      showToast(`→ ${STATE_LABELS[state]}`)
      if (state === 'RELEASED') triggerConfetti()
    } catch {
      showToast('State change failed')
    }
  }

  function startAutoPlay() {
    setPlaying(true)
    setStepIdx(0)
    let idx = 0

    function advance() {
      if (idx >= DEMO_STATES.length) {
        setPlaying(false)
        return
      }
      const state = DEMO_STATES[idx]
      setStepIdx(idx)
      jumpToState(state)
      idx++
      playRef.current = setTimeout(advance, 2500)
    }
    advance()
  }

  function stopAutoPlay() {
    setPlaying(false)
    if (playRef.current) clearTimeout(playRef.current)
  }

  async function resetTrade() {
    try {
      const res = await fetch('/api/analytics/demo-seed')
      if (res.ok) showToast('Demo data reset ✓')
    } catch {
      showToast('Reset failed')
    }
  }

  async function triggerFakeNotification() {
    showToast('[NOTIFY] Trade state updated notification sent')
  }

  return (
    <>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className="fixed bottom-20 right-4 z-[60] px-4 py-2.5 rounded-xl bg-surface-800 border border-[rgba(255,255,255,0.12)] text-sm text-slate-200 shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panel */}
      <div className="fixed bottom-4 left-4 z-50">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="mb-2 w-60 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(15,23,42,0.95)] backdrop-blur-xl shadow-2xl p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand-amber uppercase tracking-widest">Demo Controls</span>
                <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300 text-sm">✕</button>
              </div>

              {/* Trade ID input */}
              <input
                value={localTradeId}
                onChange={(e) => setLocalTradeId(e.target.value)}
                placeholder="Trade ID (optional)"
                className="text-xs font-mono bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-2.5 py-1.5 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-brand-blue/40 w-full"
              />

              {/* Progress bar */}
              <div className="flex gap-0.5">
                {DEMO_STATES.map((s, i) => (
                  <div
                    key={s}
                    className={`flex-1 h-1 rounded-full transition-colors duration-300 ${
                      i <= stepIdx && playing ? 'bg-brand-amber' : 'bg-[rgba(255,255,255,0.08)]'
                    }`}
                  />
                ))}
              </div>

              {/* Auto-play */}
              <button
                onClick={playing ? stopAutoPlay : startAutoPlay}
                className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
                  playing
                    ? 'bg-brand-red/20 border border-brand-red/40 text-brand-red'
                    : 'bg-brand-amber/20 border border-brand-amber/40 text-brand-amber hover:bg-brand-amber/30'
                }`}
              >
                {playing ? '⏹ Stop' : '▶ Auto-Play All States'}
              </button>

              {/* Jump to state */}
              <select
                onChange={(e) => e.target.value && jumpToState(e.target.value as DemoState)}
                defaultValue=""
                className="w-full text-xs bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-brand-blue/40"
              >
                <option value="" disabled>Jump to State ▼</option>
                {DEMO_STATES.map((s) => (
                  <option key={s} value={s}>{STATE_LABELS[s]}</option>
                ))}
              </select>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={resetTrade}
                  className="flex-1 py-1.5 rounded-lg text-xs border border-[rgba(255,255,255,0.08)] text-slate-400 hover:border-[rgba(255,255,255,0.16)] transition-colors"
                >
                  ↺ Reset
                </button>
                <button
                  onClick={triggerFakeNotification}
                  className="flex-1 py-1.5 rounded-lg text-xs border border-brand-blue/30 text-brand-blue hover:bg-brand-blue/10 transition-colors"
                >
                  Notify
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle pill */}
        <motion.button
          onClick={() => setOpen((v) => !v)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-3 py-1.5 rounded-full bg-brand-amber/20 border border-brand-amber/40 text-brand-amber text-xs font-bold uppercase tracking-widest shadow-lg"
        >
          DEMO
        </motion.button>
      </div>
    </>
  )
}

async function triggerConfetti() {
  try {
    const confetti = (await import('canvas-confetti')).default
    confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 }, colors: ['#3B82F6', '#10B981', '#8B5CF6'] })
  } catch { /* skip */ }
}
