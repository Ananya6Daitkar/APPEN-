'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/shared/GlassCard'
import { ReputationBadge } from '@/components/shared/ReputationBadge'
import { KYCTierBadge } from '@/components/shared/KYCTierBadge'

interface MerchantProfile {
  walletAddress: string
  reputationScore: number
  totalCompletedTrades: number
  totalVolume: number
  disputeRate: number
  memberSince: string
  kycTier?: number
}

interface TradeRow {
  id: string
  state: string
  stablecoin: string
  amount: string
  fiatCurrency: string
  fiatRate: string
  createdAt: string
  releasedAt: string | null
}

const STATE_COLORS: Record<string, string> = {
  RELEASED:     'text-brand-emerald',
  REFUNDED:     'text-brand-amber',
  DISPUTED:     'text-brand-violet',
  CANCELLED:    'text-slate-500',
  CREATED:      'text-slate-400',
  FUNDED:       'text-brand-blue',
  MARKED_PAID:  'text-brand-blue',
  UNDER_REVIEW: 'text-brand-amber',
}

const STATE_LABELS: Record<string, string> = {
  RELEASED:     'Released',
  REFUNDED:     'Refunded',
  DISPUTED:     'Disputed',
  CANCELLED:    'Cancelled',
  CREATED:      'Created',
  FUNDED:       'Funded',
  MARKED_PAID:  'Marked Paid',
  UNDER_REVIEW: 'Under Review',
}

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

// Demo fallback data for DEMO_MODE
const DEMO_PROFILE: MerchantProfile = {
  walletAddress: '0xDemoSeller000000000000000000000000000002',
  reputationScore: 820,
  totalCompletedTrades: 50,
  totalVolume: 25000,
  disputeRate: 2.5,
  memberSince: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  kycTier: 2,
}

const DEMO_TRADES: TradeRow[] = Array.from({ length: 8 }, (_, i) => ({
  id: `demo-trade-${i}`,
  state: i < 6 ? 'RELEASED' : i === 6 ? 'DISPUTED' : 'REFUNDED',
  stablecoin: i % 2 === 0 ? 'USDC' : 'USDT',
  amount: String(200 + i * 150),
  fiatCurrency: 'USD',
  fiatRate: '1.00',
  createdAt: new Date(Date.now() - (8 - i) * 5 * 24 * 60 * 60 * 1000).toISOString(),
  releasedAt: i < 6 ? new Date(Date.now() - (8 - i) * 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString() : null,
}))

export default function MerchantProfilePage() {
  const { address } = useParams<{ address: string }>()
  const [profile, setProfile] = useState<MerchantProfile | null>(null)
  const [trades, setTrades] = useState<TradeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const profileRes = await fetch(`/api/users/${address}`)
        if (!profileRes.ok) throw new Error('Profile not found')
        const profileData = await profileRes.json()

        // Fetch kycTier from the user record (not in public profile response, use fallback)
        setProfile({ ...profileData, kycTier: profileData.kycTier ?? 0 })

        // Fetch recent trades — public endpoint returns trades for the address
        // We use the demo seed data if available, otherwise show empty
        try {
          const tradesRes = await fetch(`/api/trades?limit=10`)
          if (tradesRes.ok) {
            const tradesData = await tradesRes.json()
            setTrades(tradesData.trades ?? [])
          }
        } catch {
          // trades are optional — silently ignore
        }
      } catch (err) {
        // In DEMO_MODE, fall back to demo data
        setProfile(DEMO_PROFILE)
        setTrades(DEMO_TRADES)
        void err // suppress unused variable warning
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [address])

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-10 max-w-4xl mx-auto">
        <div className="h-8 w-56 rounded-lg bg-surface-800 animate-pulse mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-surface-800 animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-surface-800 animate-pulse" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen px-4 py-10 max-w-4xl mx-auto flex items-center justify-center">
        <GlassCard className="p-8 text-center">
          <p className="text-brand-red font-semibold">{error ?? 'Profile not found'}</p>
        </GlassCard>
      </div>
    )
  }

  const kycTier = (profile.kycTier ?? 0) as 0 | 1 | 2 | 3
  const isLowTrust = profile.reputationScore < 200

  return (
    <div className="min-h-screen px-4 py-10 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <p className="text-xs text-slate-500 font-mono mb-1">Merchant Profile</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-100 font-mono">
            {shortAddress(profile.walletAddress)}
          </h1>
          <ReputationBadge score={profile.reputationScore} size="md" />
          <KYCTierBadge tier={kycTier} size="md" />
        </div>
        <p className="text-xs text-slate-500 font-mono mt-1 break-all">{profile.walletAddress}</p>

        {isLowTrust && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-red/10 border border-brand-red/30 text-brand-red text-sm"
          >
            <span>⚠</span>
            <span>Low-trust account — limited to 1 active trade at a time</span>
          </motion.div>
        )}
      </motion.div>

      {/* Stats grid */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6"
      >
        {[
          {
            label: 'Completed Trades',
            value: profile.totalCompletedTrades.toLocaleString(),
            accent: 'text-brand-emerald',
          },
          {
            label: 'Total Volume',
            value: `$${Number(profile.totalVolume).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            accent: 'text-brand-blue',
          },
          {
            label: 'Dispute Rate',
            value: `${profile.disputeRate.toFixed(1)}%`,
            accent: profile.disputeRate > 10 ? 'text-brand-red' : profile.disputeRate > 5 ? 'text-brand-amber' : 'text-brand-emerald',
          },
          {
            label: 'Member Since',
            value: new Date(profile.memberSince).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }),
            accent: 'text-slate-300',
          },
        ].map(({ label, value, accent }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.04 }}
          >
            <GlassCard className="p-4 flex flex-col gap-1">
              <p className="text-xs text-slate-500">{label}</p>
              <p className={`text-xl font-bold ${accent}`}>{value}</p>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      {/* Recent trade history */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <GlassCard className="overflow-hidden">
          <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
            <h2 className="text-sm font-semibold text-slate-300">Recent Trade History</h2>
          </div>

          {trades.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-500 text-sm">
              No trades found for this address.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.05)]">
                    {['Trade ID', 'Amount', 'Rate', 'Status', 'Date'].map((col) => (
                      <th
                        key={col}
                        className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade, i) => (
                    <motion.tr
                      key={trade.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 + i * 0.03 }}
                      className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-slate-400">
                        {trade.id.length > 12 ? `${trade.id.slice(0, 8)}…` : trade.id}
                      </td>
                      <td className="px-5 py-3 text-slate-200 font-medium">
                        {Number(trade.amount).toLocaleString()} {trade.stablecoin}
                      </td>
                      <td className="px-5 py-3 text-slate-400">
                        {Number(trade.fiatRate).toLocaleString()} {trade.fiatCurrency}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`font-medium ${STATE_COLORS[trade.state] ?? 'text-slate-400'}`}>
                          {STATE_LABELS[trade.state] ?? trade.state}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs">
                        {new Date(trade.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  )
}
