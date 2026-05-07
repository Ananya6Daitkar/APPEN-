'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/shared/GlassCard'
import { TradeVolumeChart } from '@/components/analytics/TradeVolumeChart'
import { VolumeByStablecoinChart } from '@/components/analytics/VolumeByStablecoinChart'
import { TrustScoreHistogram } from '@/components/analytics/TrustScoreHistogram'
import { DisputeRateChart } from '@/components/analytics/DisputeRateChart'
import { TopTradersLeaderboard } from '@/components/analytics/TopTradersLeaderboard'
import { useWebSocket } from '@/lib/websocket/useWebSocket'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  tradesOverTime: { date: string; count: number }[]
  volumeByStablecoin: { stablecoin: string; volume: number }[]
  trustScoreDistribution: { bucket: string; count: number }[]
  disputeRateOverTime: { week: string; disputeRate: number }[]
  topTradersByVolume: { walletAddress: string; totalVolume: number; totalTrades: number }[]
}

// ─── Demo walkthrough steps ───────────────────────────────────────────────────

const BUYER_ADDR = '0xBuyer1111111111111111111111111111111111'
const SELLER_ADDR = '0xSeller222222222222222222222222222222222'
const RESOLVER_ADDR = '0xResolver33333333333333333333333333333'
const ADMIN_ADDR = '0xAdmin4444444444444444444444444444444444'

interface WalkthroughStep {
  title: string
  description: string
  wallets?: { label: string; address: string }[]
  link?: { href: string; label: string }
  icon: string
}

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    icon: '🔑',
    title: 'Connect as Seller',
    description:
      'Use the demo seller wallet to create a new offer. Set your stablecoin (USDC or USDT), amount, fiat currency, and payment rail.',
    wallets: [{ label: 'Seller', address: SELLER_ADDR }],
    link: { href: '/create-offer', label: 'Go to Create Offer →' },
  },
  {
    icon: '🛒',
    title: 'Connect as Buyer',
    description:
      'Switch to the demo buyer wallet and browse the marketplace. Accept the seller\'s offer to initiate an escrow trade.',
    wallets: [{ label: 'Buyer', address: BUYER_ADDR }],
    link: { href: '/marketplace', label: 'Go to Marketplace →' },
  },
  {
    icon: '📄',
    title: 'Upload Payment Proof',
    description:
      'As the buyer, upload a demo payment receipt (JPEG/PNG). The file is stored in MinIO and hashed on-chain.',
    wallets: [{ label: 'Buyer', address: BUYER_ADDR }],
    link: { href: '/marketplace', label: 'View Active Trades →' },
  },
  {
    icon: '🤖',
    title: 'AI Verification',
    description:
      'Watch the OCR engine extract amount, timestamp, and transaction ID from the receipt. The risk engine computes a Trust Score and recommends auto-release or manual review.',
    wallets: [
      { label: 'Buyer', address: BUYER_ADDR },
      { label: 'Seller', address: SELLER_ADDR },
    ],
  },
  {
    icon: '✅',
    title: 'Trade Released',
    description:
      'If Trust Score ≥ 80, the escrow auto-releases to the seller after the challenge window. Both parties receive reputation points.',
    wallets: [
      { label: 'Buyer', address: BUYER_ADDR },
      { label: 'Seller', address: SELLER_ADDR },
    ],
  },
  {
    icon: '⚠️',
    title: 'View Dispute',
    description:
      'Explore a pre-seeded disputed trade where OCR detected an amount mismatch. The trade is in DISPUTED state awaiting resolver review.',
    wallets: [
      { label: 'Buyer', address: BUYER_ADDR },
      { label: 'Seller', address: SELLER_ADDR },
    ],
    link: { href: '/disputes', label: 'Go to Dispute Center →' },
  },
  {
    icon: '⚖️',
    title: 'Resolver Decision',
    description:
      'Connect as the resolver to review the AI summary, OCR evidence, and risk flags. Issue a decision to release funds to buyer or seller.',
    wallets: [{ label: 'Resolver', address: RESOLVER_ADDR }],
    link: { href: '/disputes', label: 'Open Resolver Console →' },
  },
  {
    icon: '📊',
    title: 'Admin Dashboard',
    description:
      'Connect as admin to view platform metrics, manage user KYC tiers, configure risk thresholds, and review the full audit log.',
    wallets: [{ label: 'Admin', address: ADMIN_ADDR }],
    link: { href: '/admin', label: 'Go to Admin Dashboard →' },
  },
]

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="h-[200px] rounded-lg bg-surface-800/60 animate-pulse" />
  )
}

// ─── Demo Walkthrough Panel ───────────────────────────────────────────────────

function DemoWalkthroughPanel() {
  const [step, setStep] = useState(0)
  const current = WALKTHROUGH_STEPS[step]

  return (
    <GlassCard className="p-5 border border-brand-violet/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand-violet animate-pulse" />
          <h2 className="text-sm font-semibold text-slate-300">Demo Walkthrough</h2>
        </div>
        <span className="text-xs text-slate-500">
          Step {step + 1} of {WALKTHROUGH_STEPS.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-surface-700 mb-5">
        <div
          className="h-full rounded-full bg-brand-violet transition-all duration-500"
          style={{ width: `${((step + 1) / WALKTHROUGH_STEPS.length) * 100}%` }}
        />
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-3"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">{current.icon}</span>
            <div>
              <h3 className="text-base font-semibold text-slate-100">{current.title}</h3>
              <p className="text-sm text-slate-400 mt-1 leading-relaxed">{current.description}</p>
            </div>
          </div>

          {/* Wallet addresses */}
          {current.wallets && current.wallets.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {current.wallets.map((w) => (
                <div
                  key={w.address}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-800 border border-[rgba(255,255,255,0.06)]"
                >
                  <span className="text-xs text-slate-500">{w.label}:</span>
                  <span className="font-mono text-xs text-slate-300">
                    {w.address.slice(0, 8)}…{w.address.slice(-6)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Navigation link */}
          {current.link && (
            <a
              href={current.link.href}
              className="inline-flex items-center text-xs text-brand-blue hover:underline mt-1"
            >
              {current.link.label}
            </a>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-5 pt-4 border-t border-[rgba(255,255,255,0.06)]">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="px-3 py-1.5 rounded-lg text-xs text-slate-400 border border-[rgba(255,255,255,0.08)] hover:text-slate-200 hover:border-[rgba(255,255,255,0.16)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          ← Previous
        </button>

        {/* Step dots */}
        <div className="flex gap-1.5">
          {WALKTHROUGH_STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === step ? 'bg-brand-violet w-4' : 'bg-surface-700 hover:bg-slate-500'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => setStep((s) => Math.min(WALKTHROUGH_STEPS.length - 1, s + 1))}
          disabled={step === WALKTHROUGH_STEPS.length - 1}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-violet/20 border border-brand-violet/40 text-brand-violet hover:bg-brand-violet/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          Next Step →
        </button>
      </div>
    </GlassCard>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)
  const [seedMsg, setSeedMsg] = useState<string | null>(null)
  const [wsUpdates, setWsUpdates] = useState(0)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/analytics')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // ── WebSocket: listen for analytics:update events ──────────────────────────
  useWebSocket({
    onEvent: (event) => {
      if (event.type === 'analytics:update') {
        setWsUpdates((n) => n + 1)
        // Debounce refresh — wait 1s after last event before re-fetching
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = setTimeout(() => {
          fetchAnalytics()
        }, 1000)
      }
    },
  })

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, [])

  async function loadDemoData() {
    setSeeding(true)
    setSeedMsg(null)
    try {
      const res = await fetch('/api/analytics/demo-seed')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const body = await res.json()
      setSeedMsg(body.message ?? 'Demo data loaded successfully')
      await fetchAnalytics()
    } catch (err) {
      setSeedMsg(err instanceof Error ? err.message : 'Failed to seed demo data')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="min-h-screen px-4 pt-4 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Platform Intelligence</p>
            <h1 className="text-3xl font-bold text-slate-100">Analytics</h1>
            <p className="text-slate-400 text-sm mt-1">
              Trade volume, trust scores, dispute rates, and top traders
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            {/* Real-time indicator */}
            {wsUpdates > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-brand-emerald">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald animate-pulse" />
                {wsUpdates} live update{wsUpdates !== 1 ? 's' : ''}
              </div>
            )}

            {/* Demo mode button — always visible so judges can use it */}
            <button
              onClick={loadDemoData}
              disabled={seeding}
              className="px-4 py-2 rounded-lg bg-brand-amber/20 border border-brand-amber/40 text-brand-amber text-sm font-semibold hover:bg-brand-amber/30 transition-colors disabled:opacity-50"
            >
              {seeding ? 'Loading Demo Data…' : '⚡ Load Demo Data'}
            </button>

            {seedMsg && (
              <p
                className={`text-xs ${
                  seedMsg.toLowerCase().includes('error') ||
                  seedMsg.toLowerCase().includes('fail') ||
                  seedMsg.toLowerCase().includes('not enabled')
                    ? 'text-brand-red'
                    : 'text-brand-emerald'
                }`}
              >
                {seedMsg}
              </p>
            )}

            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="text-xs text-brand-blue hover:underline disabled:opacity-50"
            >
              {loading ? 'Refreshing…' : '↻ Refresh'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Error state */}
      {error && !loading && (
        <GlassCard className="p-8 text-center mb-6">
          <p className="text-brand-red font-semibold">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-4 text-sm text-brand-blue hover:underline"
          >
            Retry
          </button>
        </GlassCard>
      )}

      <div className="flex flex-col gap-6">
        {/* Summary stats */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl bg-surface-800/60 animate-pulse"
                />
              ))
            : [
                {
                  label: 'Total Trades',
                  value: data
                    ? data.tradesOverTime.reduce((s, d) => s + d.count, 0).toLocaleString()
                    : '—',
                  accent: 'text-brand-blue',
                },
                {
                  label: 'USDC Volume',
                  value: data
                    ? (
                        data.volumeByStablecoin.find((v) => v.stablecoin === 'USDC')?.volume ?? 0
                      ).toLocaleString(undefined, { maximumFractionDigits: 0 })
                    : '—',
                  accent: 'text-brand-emerald',
                },
                {
                  label: 'USDT Volume',
                  value: data
                    ? (
                        data.volumeByStablecoin.find((v) => v.stablecoin === 'USDT')?.volume ?? 0
                      ).toLocaleString(undefined, { maximumFractionDigits: 0 })
                    : '—',
                  accent: 'text-brand-violet',
                },
                {
                  label: 'Top Traders',
                  value: data ? data.topTradersByVolume.length.toLocaleString() : '—',
                  accent: 'text-brand-amber',
                },
              ].map(({ label, value, accent }) => (
                <GlassCard key={label} className="p-4 flex flex-col gap-1">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className={`text-2xl font-bold ${accent}`}>{value}</p>
                </GlassCard>
              ))}
        </motion.div>

        {/* Trades over time */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard className="p-5">
            <h2 className="text-sm font-semibold text-slate-400 mb-4">Trades Over Time</h2>
            {loading ? (
              <ChartSkeleton />
            ) : (
              <TradeVolumeChart data={data?.tradesOverTime ?? []} />
            )}
          </GlassCard>
        </motion.div>

        {/* Volume by stablecoin + Trust score distribution */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <GlassCard className="p-5">
            <h2 className="text-sm font-semibold text-slate-400 mb-4">Volume by Stablecoin</h2>
            {loading ? (
              <ChartSkeleton />
            ) : (
              <VolumeByStablecoinChart data={data?.volumeByStablecoin ?? []} />
            )}
          </GlassCard>

          <GlassCard className="p-5">
            <h2 className="text-sm font-semibold text-slate-400 mb-4">
              Trust Score Distribution
            </h2>
            {loading ? (
              <ChartSkeleton />
            ) : (
              <TrustScoreHistogram data={data?.trustScoreDistribution ?? []} />
            )}
          </GlassCard>
        </motion.div>

        {/* Dispute rate over time */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="p-5">
            <h2 className="text-sm font-semibold text-slate-400 mb-4">
              Dispute Rate Over Time (%)
            </h2>
            {loading ? (
              <ChartSkeleton />
            ) : (
              <DisputeRateChart data={data?.disputeRateOverTime ?? []} />
            )}
          </GlassCard>
        </motion.div>

        {/* Top traders leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <GlassCard className="overflow-hidden">
            <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
              <h2 className="text-sm font-semibold text-slate-300">Top Traders by Volume</h2>
            </div>
            {loading ? (
              <div className="p-5">
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-10 rounded-lg bg-surface-800/60 animate-pulse" />
                  ))}
                </div>
              </div>
            ) : (
              <TopTradersLeaderboard data={data?.topTradersByVolume ?? []} />
            )}
          </GlassCard>
        </motion.div>

        {/* Demo walkthrough panel */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <DemoWalkthroughPanel />
        </motion.div>
      </div>
    </div>
  )
}
