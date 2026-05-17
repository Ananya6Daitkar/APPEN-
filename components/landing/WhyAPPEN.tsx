'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { GlassCard } from '@/components/shared/GlassCard'
import { WHY_APPEN } from '@/lib/copy/landing'

const comparisonsWithStyles = WHY_APPEN.comparisons.map((comp, i) => ({
  ...comp,
  glow: (['emerald', 'blue', 'violet', 'emerald'] as const)[i],
}))

export function WhyAPPEN() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="py-28 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-blue/3 to-transparent pointer-events-none" />

      <div className="container mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <p className="text-xs font-semibold text-brand-emerald uppercase tracking-widest mb-3">The Difference</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">{WHY_APPEN.sectionTitle}</h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            {WHY_APPEN.sectionSubtitle}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
          {comparisonsWithStyles.map((c, i) => (
            <motion.div
              key={c.feature}
              initial={{ opacity: 0, x: i % 2 === 0 ? -24 : 24 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <GlassCard hover glow={c.glow} className="p-6 h-full">
                <div className="flex items-start gap-4">
                  <motion.span
                    whileHover={{ scale: 1.2, rotate: 10 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="text-sm font-bold flex-shrink-0 cursor-default"
                  >
                    {c.icon}
                  </motion.span>
                  <div className="space-y-3 flex-1">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">{c.feature}</div>
                    <div className="flex flex-col gap-2">
                      {/* APPEN row */}
                      <motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={inView ? { opacity: 1, x: 0 } : {}}
                        transition={{ delay: i * 0.1 + 0.2 }}
                        className="flex items-center gap-2"
                      >
                        <span className="w-2 h-2 rounded-full bg-brand-emerald flex-shrink-0 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                        <span className="text-sm text-white font-medium">{c.appen}</span>
                      </motion.div>
                      {/* Competitor row */}
                      <div className="flex items-center gap-2 opacity-50">
                        <span className="w-2 h-2 rounded-full bg-slate-600 flex-shrink-0" />
                        <span className="text-sm text-slate-500 line-through">{c.centralized}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
