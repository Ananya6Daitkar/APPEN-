'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'

interface Node {
  id: string
  x: number
  y: number
  label: string
  currency: string
  color: string
}

interface Flow {
  from: string
  to: string
  color: string
  delay: number
}

const NODES: Node[] = [
  { id: 'us',  x: 18,  y: 38, label: 'New York',  currency: 'USD', color: '#3B82F6' },
  { id: 'eu',  x: 46,  y: 28, label: 'London',    currency: 'EUR', color: '#8B5CF6' },
  { id: 'ng',  x: 48,  y: 55, label: 'Lagos',     currency: 'NGN', color: '#10B981' },
  { id: 'ke',  x: 56,  y: 58, label: 'Nairobi',   currency: 'KES', color: '#10B981' },
  { id: 'in',  x: 68,  y: 42, label: 'Mumbai',    currency: 'INR', color: '#F59E0B' },
  { id: 'sg',  x: 78,  y: 52, label: 'Singapore', currency: 'SGD', color: '#3B82F6' },
  { id: 'ph',  x: 82,  y: 44, label: 'Manila',    currency: 'PHP', color: '#8B5CF6' },
]

const FLOWS: Flow[] = [
  { from: 'us', to: 'eu',  color: '#3B82F6', delay: 0 },
  { from: 'eu', to: 'ng',  color: '#8B5CF6', delay: 0.8 },
  { from: 'ng', to: 'ke',  color: '#10B981', delay: 1.6 },
  { from: 'us', to: 'in',  color: '#3B82F6', delay: 2.4 },
  { from: 'in', to: 'sg',  color: '#F59E0B', delay: 3.2 },
  { from: 'sg', to: 'ph',  color: '#3B82F6', delay: 4.0 },
  { from: 'eu', to: 'in',  color: '#8B5CF6', delay: 1.2 },
]

function getNodeById(id: string) {
  return NODES.find((n) => n.id === id)!
}

function AnimatedFlow({ flow, inView }: { flow: Flow; inView: boolean }) {
  const from = getNodeById(flow.from)
  const to = getNodeById(flow.to)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!inView) return
    const t = setTimeout(() => setShow(true), flow.delay * 1000)
    return () => clearTimeout(t)
  }, [inView, flow.delay])

  const x1 = `${from.x}%`
  const y1 = `${from.y}%`
  const x2 = `${to.x}%`
  const y2 = `${to.y}%`

  // Midpoint with slight curve
  const mx = `${(from.x + to.x) / 2}%`
  const my = `${(from.y + to.y) / 2 - 6}%`

  return (
    <AnimatePresence>
      {show && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {/* Path */}
          <motion.path
            d={`M ${from.x}% ${from.y}% Q ${(from.x + to.x) / 2}% ${(from.y + to.y) / 2 - 6}% ${to.x}% ${to.y}%`}
            fill="none"
            stroke={flow.color}
            strokeWidth="1.5"
            strokeOpacity="0.4"
            strokeDasharray="4 4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
          />
          {/* Travelling dot */}
          <motion.circle
            r="3"
            fill={flow.color}
            filter="url(#glow)"
            initial={{ offsetDistance: '0%' }}
            animate={{ offsetDistance: '100%' }}
            transition={{ duration: 1.4, ease: 'easeInOut', repeat: Infinity, repeatDelay: 3 }}
            style={{
              offsetPath: `path("M ${from.x * 10} ${from.y * 5} Q ${(from.x + to.x) / 2 * 10} ${((from.y + to.y) / 2 - 6) * 5} ${to.x * 10} ${to.y * 5}")`,
            }}
          />
        </motion.g>
      )}
    </AnimatePresence>
  )
}

export function CorridorMap() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="py-28 px-6 bg-surface-800/20 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-blue/20 to-transparent" />

      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12"
        >
          <p className="text-xs font-semibold text-brand-violet uppercase tracking-widest mb-3">Global Reach</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Fiat Corridors</h2>
          <p className="text-slate-400">Connecting stablecoins to local payment rails worldwide.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative max-w-5xl mx-auto rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(15,23,42,0.6)] backdrop-blur-md overflow-hidden"
          style={{ height: 380 }}
        >
          {/* Grid background */}
          <div className="absolute inset-0 bg-grid opacity-50" />

          {/* Ambient glow */}
          <div className="absolute inset-0 bg-gradient-radial from-brand-blue/5 via-transparent to-transparent" />

          <svg
            viewBox="0 0 100 60"
            preserveAspectRatio="xMidYMid meet"
            className="absolute inset-0 w-full h-full"
          >
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Flow lines */}
            {FLOWS.map((flow, i) => {
              const from = getNodeById(flow.from)
              const to = getNodeById(flow.to)
              return (
                <motion.line
                  key={i}
                  x1={`${from.x}%`} y1={`${from.y}%`}
                  x2={`${to.x}%`} y2={`${to.y}%`}
                  stroke={flow.color}
                  strokeWidth="0.4"
                  strokeOpacity="0.15"
                  strokeDasharray="2 3"
                  initial={{ opacity: 0 }}
                  animate={inView ? { opacity: 1 } : {}}
                  transition={{ delay: flow.delay * 0.3 + 0.5 }}
                />
              )
            })}

            {/* Animated travelling dots */}
            {inView && FLOWS.map((flow, i) => {
              const from = getNodeById(flow.from)
              const to = getNodeById(flow.to)
              return (
                <motion.circle
                  key={`dot-${i}`}
                  r="0.8"
                  fill={flow.color}
                  filter="url(#glow)"
                  initial={{ cx: `${from.x}%`, cy: `${from.y}%`, opacity: 0 }}
                  animate={{
                    cx: [`${from.x}%`, `${to.x}%`],
                    cy: [`${from.y}%`, `${to.y}%`],
                    opacity: [0, 1, 1, 0],
                  }}
                  transition={{
                    duration: 2.5,
                    delay: flow.delay * 0.4 + 0.8,
                    repeat: Infinity,
                    repeatDelay: 2,
                    ease: 'easeInOut',
                  }}
                />
              )
            })}

            {/* Nodes */}
            {NODES.map((node, i) => (
              <motion.g
                key={node.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: i * 0.08 + 0.3, type: 'spring', stiffness: 300 }}
              >
                {/* Pulse ring */}
                <motion.circle
                  cx={`${node.x}%`} cy={`${node.y}%`} r="2.5"
                  fill="none"
                  stroke={node.color}
                  strokeWidth="0.5"
                  strokeOpacity="0.4"
                  animate={{ r: [2.5, 4, 2.5], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3 }}
                />
                {/* Node dot */}
                <circle
                  cx={`${node.x}%`} cy={`${node.y}%`} r="1.8"
                  fill={node.color}
                  filter="url(#glow)"
                />
                {/* Label */}
                <text
                  x={`${node.x}%`} y={`${node.y - 3.5}%`}
                  fill="#94A3B8"
                  fontSize="2.2"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {node.currency}
                </text>
              </motion.g>
            ))}
          </svg>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 flex flex-wrap gap-3">
            {[
              { color: '#3B82F6', label: 'USD corridor' },
              { color: '#10B981', label: 'Africa' },
              { color: '#8B5CF6', label: 'Europe' },
              { color: '#F59E0B', label: 'Asia' },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>

          <div className="absolute bottom-4 right-4 text-xs text-slate-600">
            Bank transfer · Mobile money · Wire
          </div>
        </motion.div>
      </div>
    </section>
  )
}
