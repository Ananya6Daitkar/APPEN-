'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { HOW_IT_WORKS } from '@/lib/copy/landing'

const stepsWithStyles = HOW_IT_WORKS.steps.map((step, i) => ({
  ...step,
  color: ['brand-blue', 'brand-emerald', 'brand-violet', 'brand-amber', 'brand-emerald'][i],
  glow: [
    'rgba(59,130,246,0.3)',
    'rgba(16,185,129,0.3)',
    'rgba(139,92,246,0.3)',
    'rgba(245,158,11,0.3)',
    'rgba(16,185,129,0.3)',
  ][i],
}))

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="py-28 px-6 bg-surface-800/20 relative overflow-hidden">
      {/* Animated connector line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-blue/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-emerald/20 to-transparent" />

      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-20"
        >
          <p className="text-xs font-semibold text-brand-blue uppercase tracking-widest mb-3">The Process</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">{HOW_IT_WORKS.sectionTitle}</h2>
          <p className="text-slate-400">{HOW_IT_WORKS.sectionSubtitle}</p>
        </motion.div>

        <div className="relative">
          {/* Animated progress line (desktop) */}
          <div className="hidden lg:block absolute top-10 left-[10%] right-[10%] h-px overflow-hidden">
            <div className="h-full bg-gradient-to-r from-brand-blue/20 via-brand-emerald/20 to-brand-violet/20" />
            <motion.div
              className="absolute inset-0 h-full bg-gradient-to-r from-brand-blue via-brand-emerald to-brand-violet"
              initial={{ scaleX: 0, originX: 0 }}
              animate={inView ? { scaleX: 1 } : {}}
              transition={{ duration: 1.2, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>

          <div className="grid lg:grid-cols-5 gap-8">
            {stepsWithStyles.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 40 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.1 + 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center text-center gap-4"
              >
                {/* Icon circle */}
                <motion.div
                  whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="relative z-10 w-20 h-20 rounded-full bg-surface-800 border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-sm font-bold"
                  style={{ boxShadow: `0 0 0 0 ${step.glow}` }}
                >
                  {/* Glow ring on hover */}
                  <div
                    className="absolute inset-0 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-300"
                    style={{ boxShadow: `0 0 24px ${step.glow}` }}
                  />
                  <span className="relative z-10">{step.icon}</span>
                </motion.div>

                {/* Step number */}
                <div className={`text-xs font-bold text-${step.color} uppercase tracking-widest`}>
                  Step {i + 1}
                </div>

                <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
