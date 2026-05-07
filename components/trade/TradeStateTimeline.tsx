'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type TradeState =
  | 'CREATED' | 'FUNDED' | 'MARKED_PAID' | 'UNDER_REVIEW'
  | 'DISPUTED' | 'RELEASED' | 'REFUNDED' | 'CANCELLED'

const STATES: { key: TradeState; label: string; description: string }[] = [
  { key: 'CREATED',      label: 'Created',      description: 'Trade initiated' },
  { key: 'FUNDED',       label: 'Funded',        description: 'Stablecoins locked in escrow' },
  { key: 'MARKED_PAID',  label: 'Paid',          description: 'Buyer marked fiat sent' },
  { key: 'UNDER_REVIEW', label: 'Under Review',  description: 'Manual review in progress' },
  { key: 'DISPUTED',     label: 'Disputed',      description: 'Dispute raised by seller' },
  { key: 'RELEASED',     label: 'Released',      description: 'Funds released to buyer' },
  { key: 'REFUNDED',     label: 'Refunded',      description: 'Funds returned to seller' },
  { key: 'CANCELLED',    label: 'Cancelled',     description: 'Trade cancelled' },
]

const TERMINAL: TradeState[] = ['RELEASED', 'REFUNDED', 'CANCELLED']
const HAPPY_PATH: TradeState[] = ['CREATED', 'FUNDED', 'MARKED_PAID', 'RELEASED']

const STATE_COLORS: Record<TradeState, { ring: string; bg: string; text: string; glow: string }> = {
  CREATED:      { ring: 'border-brand-blue',    bg: 'bg-brand-blue/20',    text: 'text-brand-blue',    glow: 'rgba(59,130,246,0.5)' },
  FUNDED:       { ring: 'border-brand-blue',    bg: 'bg-brand-blue/20',    text: 'text-brand-blue',    glow: 'rgba(59,130,246,0.5)' },
  MARKED_PAID:  { ring: 'border-brand-blue',    bg: 'bg-brand-blue/20',    text: 'text-brand-blue',    glow: 'rgba(59,130,246,0.5)' },
  UNDER_REVIEW: { ring: 'border-brand-amber',   bg: 'bg-brand-amber/20',   text: 'text-brand-amber',   glow: 'rgba(245,158,11,0.5)' },
  DISPUTED:     { ring: 'border-brand-violet',  bg: 'bg-brand-violet/20',  text: 'text-brand-violet',  glow: 'rgba(139,92,246,0.5)' },
  RELEASED:     { ring: 'border-brand-emerald', bg: 'bg-brand-emerald/20', text: 'text-brand-emerald', glow: 'rgba(16,185,129,0.5)' },
  REFUNDED:     { ring: 'border-brand-amber',   bg: 'bg-brand-amber/20',   text: 'text-brand-amber',   glow: 'rgba(245,158,11,0.5)' },
  CANCELLED:    { ring: 'border-slate-600',     bg: 'bg-slate-700/30',     text: 'text-slate-500',     glow: 'rgba(100,116,139,0.3)' },
}

interface TradeStateTimelineProps {
  currentState: TradeState
}

export function TradeStateTimeline({ currentState }: TradeStateTimelineProps) {
  const visibleStates: TradeState[] =
    currentState === 'UNDER_REVIEW' || currentState === 'DISPUTED'
      ? ['CREATED', 'FUNDED', 'MARKED_PAID', currentState, 'RELEASED']
      : currentState === 'REFUNDED'
      ? ['CREATED', 'FUNDED', 'MARKED_PAID', 'DISPUTED', 'REFUNDED']
      : currentState === 'CANCELLED'
      ? ['CREATED', 'FUNDED', 'CANCELLED']
      : HAPPY_PATH

  const currentIdx = visibleStates.indexOf(currentState)

  function isCompleted(stateKey: TradeState) {
    return visibleStates.indexOf(stateKey) < currentIdx
  }

  function isCurrent(stateKey: TradeState) {
    return stateKey === currentState
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-start min-w-max sm:min-w-0 gap-0 px-1">
        {visibleStates.map((stateKey, i) => {
          const meta = STATES.find((s) => s.key === stateKey)!
          const completed = isCompleted(stateKey)
          const current = isCurrent(stateKey)
          const isLast = i === visibleStates.length - 1
          const colors = STATE_COLORS[stateKey]

          return (
            <div key={stateKey} className="flex items-start flex-1 min-w-[80px]">
              <div className="flex flex-col items-center flex-1">
                {/* Circle node */}
                <div className="relative flex items-center justify-center mb-2">
                  {/* Pulse ring for current state */}
                  {current && (
                    <motion.div
                      className={cn('absolute rounded-full', colors.bg)}
                      animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                      style={{ width: 36, height: 36 }}
                    />
                  )}

                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.07, type: 'spring', stiffness: 300, damping: 20 }}
                    className={cn(
                      'relative z-10 w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all duration-500',
                      completed
                        ? 'bg-brand-emerald/20 border-brand-emerald text-brand-emerald'
                        : current
                        ? cn(colors.bg, colors.ring, colors.text)
                        : 'bg-surface-800 border-slate-700 text-slate-600'
                    )}
                    style={current ? { boxShadow: `0 0 16px ${colors.glow}` } : {}}
                  >
                    {completed ? (
                      <motion.svg
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.4, delay: i * 0.07 }}
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <motion.path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.35, delay: i * 0.07 + 0.1 }}
                        />
                      </motion.svg>
                    ) : (
                      <span className="text-xs">{i + 1}</span>
                    )}
                  </motion.div>
                </div>

                {/* Label */}
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 + 0.1 }}
                  className="text-center px-1"
                >
                  <p className={cn(
                    'text-xs font-semibold whitespace-nowrap',
                    current ? 'text-slate-100' : completed ? 'text-brand-emerald' : 'text-slate-600'
                  )}>
                    {meta.label}
                  </p>
                  {current && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-[10px] text-slate-400 mt-0.5 hidden sm:block whitespace-nowrap"
                    >
                      {meta.description}
                    </motion.p>
                  )}
                </motion.div>
              </div>

              {/* Connector */}
              {!isLast && (
                <div className="flex-shrink-0 flex items-center mt-4" style={{ width: 32 }}>
                  <div className="relative w-full h-0.5 bg-slate-700 overflow-hidden rounded-full">
                    {completed && (
                      <motion.div
                        className="absolute inset-0 bg-brand-emerald rounded-full"
                        initial={{ scaleX: 0, originX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: i * 0.07 + 0.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
