'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/shared/GlassCard'
import { authFetch } from '@/lib/auth/authFetch'

interface Assessment {
  verdict: 'release' | 'refund' | 'inconclusive'
  confidence: number
  reasoning: string
  red_flags: string[]
  supporting_evidence: string[]
}

// ─── Animated confidence arc ──────────────────────────────────────────────────

function ConfidenceArc({ score }: { score: number }) {
  const size = 96
  const r = 36
  const circ = Math.PI * r // half circle
  const offset = circ - (score / 100) * circ
  const color = score >= 70 ? '#10B981' : score >= 45 ? '#F59E0B' : '#EF4444'

  return (
    <div className="relative flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size / 2 + 8} viewBox={`0 0 ${size} ${size / 2 + 8}`}>
        {/* Track */}
        <path
          d={`M 8 ${size / 2} A ${r} ${r} 0 0 1 ${size - 8} ${size / 2}`}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={7}
          strokeLinecap="round"
        />
        {/* Fill */}
        <motion.path
          d={`M 8 ${size / 2} A ${r} ${r} 0 0 1 ${size - 8} ${size / 2}`}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute bottom-0 flex flex-col items-center">
        <motion.span
          className="text-xl font-bold text-slate-100"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          {score}
        </motion.span>
        <span className="text-[10px] text-slate-500 uppercase tracking-wide">confidence</span>
      </div>
    </div>
  )
}

// ─── Typewriter text ──────────────────────────────────────────────────────────

function TypewriterText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState('')
  const idx = useRef(0)

  useEffect(() => {
    idx.current = 0
    setDisplayed('')
    const t = setTimeout(() => {
      const interval = setInterval(() => {
        if (idx.current < text.length) {
          setDisplayed(text.slice(0, idx.current + 1))
          idx.current++
        } else {
          clearInterval(interval)
        }
      }, 15)
      return () => clearInterval(interval)
    }, delay)
    return () => clearTimeout(t)
  }, [text, delay])

  return <span>{displayed}<span className="animate-pulse">|</span></span>
}

// ─── Verdict badge ────────────────────────────────────────────────────────────

const VERDICT_CONFIG = {
  release: {
    label: 'Release ✓',
    cls: 'bg-brand-emerald/20 text-brand-emerald border-brand-emerald/40',
    glow: 'rgba(16,185,129,0.3)',
  },
  refund: {
    label: 'Refund ↩',
    cls: 'bg-brand-red/20 text-brand-red border-brand-red/40',
    glow: 'rgba(239,68,68,0.3)',
  },
  inconclusive: {
    label: 'Inconclusive ~',
    cls: 'bg-brand-amber/20 text-brand-amber border-brand-amber/40',
    glow: 'rgba(245,158,11,0.3)',
  },
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AIPreAssessment({ caseId }: { caseId: string }) {
  const [data, setData] = useState<Assessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const res = await authFetch(`/api/disputes/${caseId}/ai-assessment`)
        if (!res.ok) throw new Error('Assessment unavailable')
        const json = await res.json()
        setData(json as Assessment)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed')
      } finally {
        setLoading(false)
      }
    }, 1800) // fake stream feel
    return () => clearTimeout(t)
  }, [caseId])

  const verdict = data ? VERDICT_CONFIG[data.verdict] : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Animated gradient border */}
      <div
        className="rounded-xl p-px"
        style={{
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #6366f1)',
          backgroundSize: '200% 200%',
          animation: 'gradientShift 3s ease infinite',
        }}
      >
        <style>{`
          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}</style>

        <div className="rounded-[11px] bg-[rgba(15,23,42,0.95)] p-5 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand-violet animate-pulse" />
            <h3 className="text-sm font-semibold text-slate-200">AI Pre-Assessment</h3>
            <span className="ml-auto text-xs text-slate-500 px-2 py-0.5 rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)]">
              GPT-4o
            </span>
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <div className="w-24 h-12 rounded-lg bg-[rgba(255,255,255,0.04)] animate-pulse" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-3 rounded bg-[rgba(255,255,255,0.04)] animate-pulse w-3/4" />
                  <div className="h-3 rounded bg-[rgba(255,255,255,0.04)] animate-pulse w-1/2" />
                </div>
              </div>
              <div className="h-16 rounded-lg bg-[rgba(255,255,255,0.04)] animate-pulse" />
              <div className="flex gap-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-6 w-24 rounded-full bg-[rgba(255,255,255,0.04)] animate-pulse" />
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <p className="text-xs text-brand-red">{error}</p>
          )}

          {/* Result */}
          {!loading && data && verdict && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col gap-4"
              >
                {/* Verdict + confidence */}
                <div className="flex items-center gap-4">
                  <ConfidenceArc score={data.confidence} />
                  <div className="flex flex-col gap-2">
                    <motion.span
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
                      className={`text-sm font-bold px-3 py-1.5 rounded-full border ${verdict.cls}`}
                      style={{ boxShadow: `0 0 16px ${verdict.glow}` }}
                    >
                      {verdict.label}
                    </motion.span>
                    <p className="text-xs text-slate-500">AI verdict</p>
                  </div>
                </div>

                {/* Reasoning — typewriter */}
                <div className="text-sm text-slate-300 leading-relaxed min-h-[60px]">
                  <TypewriterText text={data.reasoning} delay={400} />
                </div>

                {/* Red flags */}
                {data.red_flags.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Red Flags</p>
                    <div className="flex flex-wrap gap-2">
                      {data.red_flags.map((flag, i) => (
                        <motion.span
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: [0, -3, 3, -2, 2, 0] }}
                          transition={{
                            opacity: { delay: 0.6 + i * 0.1 },
                            x: { delay: 0.8 + i * 0.1, duration: 0.4 },
                          }}
                          className="text-xs px-2.5 py-1 rounded-full bg-brand-red/15 border border-brand-red/30 text-brand-red"
                        >
                          {flag}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Supporting evidence */}
                {data.supporting_evidence.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Supporting Evidence</p>
                    <div className="flex flex-wrap gap-2">
                      {data.supporting_evidence.map((ev, i) => (
                        <motion.span
                          key={i}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7 + i * 0.1 }}
                          className="text-xs px-2.5 py-1 rounded-full bg-brand-emerald/10 border border-brand-emerald/25 text-brand-emerald"
                        >
                          ✓ {ev}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer disclaimer */}
                <p className="text-[10px] text-slate-600 border-t border-[rgba(255,255,255,0.05)] pt-3">
                  AI assessment is advisory. Final decision rests with the human resolver.
                </p>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
  )
}
