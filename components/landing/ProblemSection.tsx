'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { GlassCard } from '@/components/shared/GlassCard'

const problems = [
  {
    icon: '🔓',
    title: 'The Trust Gap',
    description:
      'P2P crypto trades require trusting a stranger with your money. One party always has to go first — and hope the other follows through.',
    accent: 'brand-red',
    border: 'hover:border-brand-red/30',
  },
  {
    icon: '🧾',
    title: 'Fiat is Unverifiable',
    description:
      'Bank transfers and mobile money receipts are easy to fake. Existing platforms rely on manual review, creating delays and fraud risk.',
    accent: 'brand-amber',
    border: 'hover:border-brand-amber/30',
  },
  {
    icon: '⚖️',
    title: 'Manual Disputes',
    description:
      "When trades go wrong, resolution is slow, opaque, and often biased. There's no structured evidence trail or accountable arbitration.",
    accent: 'brand-violet',
    border: 'hover:border-brand-violet/30',
  },
]

export function ProblemSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="py-28 px-6 relative overflow-hidden">
      {/* Subtle background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-red/3 to-transparent pointer-events-none" />

      <div className="container mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <p className="text-xs font-semibold text-brand-red uppercase tracking-widest mb-3">The Problem</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">P2P Trading is Broken</h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Every P2P trade carries hidden risks. APPEN eliminates them systematically.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {problems.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 32 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <GlassCard hover className={`p-8 space-y-4 h-full ${p.border}`}>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={inView ? { scale: 1, opacity: 1 } : {}}
                  transition={{ delay: i * 0.12 + 0.2, duration: 0.4 }}
                  className="text-4xl"
                >
                  {p.icon}
                </motion.div>
                <h3 className="text-xl font-semibold text-white">{p.title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">{p.description}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
