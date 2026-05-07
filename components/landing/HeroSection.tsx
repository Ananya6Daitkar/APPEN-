'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'

const EscrowOrbit3D = dynamic(
  () => import('./EscrowOrbit3D').then((m) => m.EscrowOrbit3D),
  { ssr: false, loading: () => <div className="w-full h-full rounded-full animate-pulse bg-brand-blue/5 border border-brand-blue/10" /> }
)

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
}

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

export function HeroSection() {
  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-grid">
      {/* Ambient radial glows */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-brand-blue/8 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-20 w-[500px] h-[500px] rounded-full bg-brand-violet/8 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-brand-emerald/4 blur-[160px] pointer-events-none" />

      <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center py-20 relative z-10">
        {/* Text column */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-8"
        >
          {/* Badge */}
          <motion.div variants={item}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-blue/30 bg-brand-blue/10 text-brand-blue text-sm font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse" />
              Non-custodial · AI-verified · On-chain reputation
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1 variants={item} className="text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight">
            P2P Trading{' '}
            <span className="gradient-text-blue-emerald">
              Without Trust Issues
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p variants={item} className="text-xl text-slate-400 leading-relaxed max-w-lg">
            Lock stablecoins in self-custodial escrow. Upload your payment receipt.
            AI verifies it instantly. Funds release automatically — no middleman needed.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={item} className="flex flex-wrap gap-4">
            <Link
              href="/marketplace"
              className="group relative px-8 py-3 rounded-lg bg-brand-blue text-white font-semibold overflow-hidden transition-all duration-300 hover:shadow-[0_0_32px_rgba(59,130,246,0.5)] hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="relative z-10">Launch App</span>
              <div className="absolute inset-0 bg-gradient-to-r from-brand-blue to-brand-violet opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
            <Link
              href="/analytics"
              className="px-8 py-3 rounded-lg border border-slate-600 hover:border-brand-blue/50 text-slate-300 hover:text-white font-semibold transition-all duration-300 hover:bg-brand-blue/5"
            >
              View Demo
            </Link>
          </motion.div>

          {/* Trust indicators */}
          <motion.div variants={item} className="flex flex-wrap items-center gap-5 text-sm text-slate-500">
            {['OpenZeppelin audited', 'Base Sepolia', 'Polygon Mumbai'].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-brand-emerald" />
                {t}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* 3D Scene */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          className="relative h-[400px] lg:h-[520px] float"
        >
          {/* Glow ring behind the 3D scene */}
          <div className="absolute inset-0 rounded-full bg-brand-blue/5 blur-3xl scale-75" />
          <EscrowOrbit3D />
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-surface-900 to-transparent pointer-events-none" />
    </section>
  )
}
