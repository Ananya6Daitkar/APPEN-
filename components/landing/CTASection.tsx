'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'

const faqs = [
  {
    q: 'Is APPEN non-custodial?',
    a: 'Yes. Funds are locked in an audited smart contract. Neither APPEN nor any third party can access them — only the trade outcome determines release.',
  },
  {
    q: "What happens if the AI can't verify my receipt?",
    a: 'Low-confidence proofs enter a challenge window or manual review. A human resolver reviews the evidence and makes a binding decision.',
  },
  {
    q: 'How is my reputation calculated?',
    a: "Your on-chain reputation score (0–1000) increases with completed trades and decreases when you lose a dispute. It's portable and tamper-proof.",
  },
  {
    q: 'Which wallets are supported?',
    a: 'MetaMask, Coinbase Wallet, and any WalletConnect-compatible wallet.',
  },
]

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="border-b border-[rgba(255,255,255,0.06)]"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left text-white hover:text-brand-blue transition-colors group"
        aria-expanded={open}
      >
        <span className="font-medium text-sm group-hover:text-brand-blue transition-colors">{q}</span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-xl text-slate-500 flex-shrink-0 ml-4 group-hover:text-brand-blue transition-colors"
        >
          +
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-slate-400 text-sm leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

const TRUST_BADGES = ['OpenZeppelin', 'Base Sepolia', 'Polygon Mumbai', 'SIWE Auth']

export function CTASection() {
  const ctaRef = useRef<HTMLDivElement>(null)
  const faqRef = useRef<HTMLDivElement>(null)
  const ctaInView = useInView(ctaRef, { once: true, margin: '-80px' })
  const faqInView = useInView(faqRef, { once: true, margin: '-80px' })

  return (
    <>
      {/* CTA */}
      <section ref={ctaRef} className="py-28 px-6 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-blue/5 to-transparent pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-brand-blue/8 blur-[100px] pointer-events-none" />

        <div className="container mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-8"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
              Ready to trade{' '}
              <span className="gradient-text-blue-emerald">without trust issues?</span>
            </h2>
            <p className="text-slate-400 max-w-lg mx-auto text-lg">
              Connect your wallet and start trading in under 60 seconds.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/marketplace"
                className="group relative px-10 py-4 rounded-xl bg-gradient-to-r from-brand-blue to-brand-emerald text-white font-bold text-lg overflow-hidden transition-all duration-300 hover:shadow-[0_0_48px_rgba(59,130,246,0.4)] hover:scale-[1.03] active:scale-[0.98]"
              >
                <span className="relative z-10">Launch App</span>
                <div className="absolute inset-0 bg-gradient-to-r from-brand-emerald to-brand-blue opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </Link>
              <Link
                href="/analytics"
                className="px-10 py-4 rounded-xl border border-[rgba(255,255,255,0.12)] text-slate-300 font-bold text-lg hover:border-brand-blue/40 hover:text-white hover:bg-brand-blue/5 transition-all duration-300"
              >
                View Demo
              </Link>
            </div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={ctaInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap justify-center gap-3 pt-2"
            >
              {TRUST_BADGES.map((badge, i) => (
                <motion.span
                  key={badge}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={ctaInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ delay: 0.5 + i * 0.06 }}
                  className="px-4 py-2 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-slate-400 text-sm hover:border-brand-blue/30 hover:text-slate-300 transition-colors cursor-default"
                >
                  {badge}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section ref={faqRef} className="py-20 px-6 bg-surface-800/20 relative">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.06)] to-transparent" />
        <div className="container mx-auto max-w-2xl">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={faqInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-2xl font-bold text-white mb-10 text-center"
          >
            Frequently Asked Questions
          </motion.h2>
          <div>
            {faqs.map((faq, i) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-[rgba(255,255,255,0.05)]">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-600">
          <span className="gradient-text-blue-violet font-semibold text-base">APPEN</span>
          <span>© 2025 Adaptive Proof-of-Payment Escrow Network</span>
          <div className="flex gap-6">
            {[
              { href: '/marketplace', label: 'Marketplace' },
              { href: '/analytics', label: 'Analytics' },
              { href: '/admin', label: 'Admin' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="hover:text-slate-300 transition-colors">
                {label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </>
  )
}
