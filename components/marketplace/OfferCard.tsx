'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { GlassCard } from '@/components/shared/GlassCard'
import { ReputationBadge } from '@/components/shared/ReputationBadge'
import { KYCTierBadge } from '@/components/shared/KYCTierBadge'
import { authFetch } from '@/lib/auth/authFetch'

const RAIL_LABELS: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  mobile_money: 'Mobile Money',
  wire_transfer: 'Wire Transfer',
  cash_deposit: 'Cash Deposit',
}

const RAIL_ICONS: Record<string, string> = {
  bank_transfer: '🏦',
  mobile_money: '📱',
  wire_transfer: '🌐',
  cash_deposit: '💵',
}

interface OfferCardProps {
  offer: {
    id: string
    stablecoin: string
    amount: string | number
    fiatCurrency: string
    fiatRate: string | number
    paymentRails: string[]
    seller: {
      walletAddress: string
      kycTier: number
      reputation: { score: number } | null
    }
  }
  index?: number
}

export function OfferCard({ offer, index = 0 }: OfferCardProps) {
  const router = useRouter()
  const [accepting, setAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)

  const shortAddress = `${offer.seller.walletAddress.slice(0, 6)}…${offer.seller.walletAddress.slice(-4)}`
  const repScore = offer.seller.reputation?.score ?? 500

  async function handleAccept() {
    setAccepting(true)
    setAcceptError(null)
    try {
      const res = await authFetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId: offer.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`)
      setAccepted(true)
      setTimeout(() => router.push(`/trade/${(data as { id: string }).id}`), 600)
    } catch (err) {
      setAcceptError(err instanceof Error ? err.message : 'Failed to accept offer')
      setAccepting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.06,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <GlassCard
        hover
        glow="blue"
        className="p-5 flex flex-col gap-4 group"
      >
        {/* Header: seller + stablecoin */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-slate-500 font-mono">{shortAddress}</span>
            <div className="flex flex-wrap gap-1.5">
              <ReputationBadge score={repScore} size="sm" />
              <KYCTierBadge tier={offer.seller.kycTier as 0 | 1 | 2 | 3} size="sm" />
            </div>
          </div>
          <motion.span
            whileHover={{ scale: 1.1 }}
            className="text-lg font-bold text-brand-blue shrink-0 px-2.5 py-1 rounded-lg bg-brand-blue/10 border border-brand-blue/20"
          >
            {offer.stablecoin}
          </motion.span>
        </div>

        {/* Amount + Rate */}
        <div>
          <p className="text-2xl font-bold text-slate-100 tracking-tight">
            {Number(offer.amount).toLocaleString()}
            <span className="text-sm font-normal text-slate-400 ml-1.5">{offer.stablecoin}</span>
          </p>
          <p className="text-sm text-slate-400 mt-1">
            Rate:{' '}
            <span className="text-brand-emerald font-semibold">
              {Number(offer.fiatRate).toLocaleString()} {offer.fiatCurrency}
            </span>
          </p>
        </div>

        {/* Payment rails */}
        <div className="flex flex-wrap gap-1.5">
          {offer.paymentRails.map((rail) => (
            <span
              key={rail}
              className="text-xs px-2 py-0.5 rounded-full bg-surface-700/60 border border-[rgba(255,255,255,0.06)] text-slate-300 flex items-center gap-1"
            >
              <span>{RAIL_ICONS[rail] ?? '💳'}</span>
              {RAIL_LABELS[rail] ?? rail}
            </span>
          ))}
        </div>

        {/* Error */}
        <AnimatePresence>
          {acceptError && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-xs text-brand-red"
            >
              {acceptError}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Accept button */}
        <motion.button
          onClick={handleAccept}
          disabled={accepting || accepted}
          whileTap={{ scale: 0.97 }}
          className={`
            mt-1 w-full rounded-lg py-2.5 text-center text-sm font-semibold
            transition-all duration-300 disabled:cursor-not-allowed
            ${accepted
              ? 'bg-brand-emerald/20 border border-brand-emerald/40 text-brand-emerald'
              : 'bg-brand-blue/15 border border-brand-blue/30 text-brand-blue hover:bg-brand-blue/25 hover:border-brand-blue/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]'
            }
          `}
        >
          <AnimatePresence mode="wait">
            {accepted ? (
              <motion.span
                key="accepted"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Accepted!
              </motion.span>
            ) : accepting ? (
              <motion.span
                key="accepting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Accepting…
              </motion.span>
            ) : (
              <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                Accept Offer
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </GlassCard>
    </motion.div>
  )
}
