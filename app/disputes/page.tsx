'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/shared/GlassCard'
import { AuthPrompt } from '@/components/shared/AuthPrompt'
import { authFetch, AuthError } from '@/lib/auth/authFetch'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResolverCaseItem {
  id: string
  disputeId: string
  assignedToId: string | null
  assignedAt: string | null
  escalatedAt: string | null
  decision: string
  aiSummary: string | null
  createdAt: string
  dispute: {
    id: string
    decision: string
    createdAt: string
    trade: {
      id: string
      state: string
      amount: string
      stablecoin: string
      fiatCurrency: string
      fiatRate: string
      createdAt: string
      buyer: { walletAddress: string }
      seller: { walletAddress: string }
    }
  }
  assignedTo: { id: string; walletAddress: string } | null
}

interface DisputesResponse {
  cases: ResolverCaseItem[]
  total: number
  page: number
  limit: number
}

// ─── Priority helpers ─────────────────────────────────────────────────────────

type Priority = 'escalated' | 'high' | 'normal'

function getPriority(c: ResolverCaseItem): Priority {
  if (c.escalatedAt) return 'escalated'
  const ageMs = Date.now() - new Date(c.createdAt).getTime()
  if (ageMs > 24 * 60 * 60 * 1000) return 'high'
  return 'normal'
}

const PRIORITY_CONFIG: Record<Priority, { label: string; dot: string; badge: string; border: string }> = {
  escalated: {
    label: 'Escalated',
    dot: 'bg-brand-red',
    badge: 'bg-brand-red/15 text-brand-red border-brand-red/30',
    border: 'border-brand-red/30',
  },
  high: {
    label: '>24h Unresolved',
    dot: 'bg-brand-amber',
    badge: 'bg-brand-amber/15 text-brand-amber border-brand-amber/30',
    border: 'border-brand-amber/30',
  },
  normal: {
    label: 'New',
    dot: 'bg-brand-blue',
    badge: 'bg-brand-blue/15 text-brand-blue border-brand-blue/30',
    border: 'border-[rgba(255,255,255,0.08)]',
  },
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function formatAge(dateStr: string) {
  const ms = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(ms / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ─── Priority Badge ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg = PRIORITY_CONFIG[priority]
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

// ─── Case Card ────────────────────────────────────────────────────────────────

function CaseCard({ item, index }: { item: ResolverCaseItem; index: number }) {
  const priority = getPriority(item)
  const cfg = PRIORITY_CONFIG[priority]
  const trade = item.dispute.trade

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: 'easeOut' }}
    >
      <Link href={`/disputes/${item.id}`} className="block group">
        <GlassCard
          hover
          className={`p-5 border ${cfg.border} group-hover:shadow-lg transition-all duration-300`}
        >
          {/* Top row */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex flex-col gap-1 min-w-0">
              <p className="text-xs text-slate-500 font-mono truncate">
                Case {item.id.slice(0, 8)}… · Dispute {item.disputeId.slice(0, 8)}…
              </p>
              <p className="text-base font-semibold text-slate-100">
                {Number(trade.amount).toLocaleString()} {trade.stablecoin}
                <span className="text-slate-400 font-normal text-sm ml-2">
                  @ {Number(trade.fiatRate).toLocaleString()} {trade.fiatCurrency}
                </span>
              </p>
            </div>
            <PriorityBadge priority={priority} />
          </div>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Buyer', addr: trade.buyer.walletAddress },
              { label: 'Seller', addr: trade.seller.walletAddress },
            ].map(({ label, addr }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-xs font-mono text-slate-300">{shortAddress(addr)}</p>
              </div>
            ))}
          </div>

          {/* Footer row */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-[rgba(255,255,255,0.05)]">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                Opened {formatAge(item.dispute.createdAt)}
              </span>
              {item.assignedTo ? (
                <span className="text-xs text-slate-500">
                  Assigned to{' '}
                  <span className="font-mono text-slate-400">
                    {shortAddress(item.assignedTo.walletAddress)}
                  </span>
                </span>
              ) : (
                <span className="text-xs text-brand-amber">Unassigned</span>
              )}
            </div>
            <span className="text-xs text-brand-blue group-hover:text-brand-blue/80 transition-colors">
              Review →
            </span>
          </div>
        </GlassCard>
      </Link>
    </motion.div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <GlassCard className="p-12 text-center">
        <div className="text-4xl mb-4">⚖️</div>
        <p className="text-slate-300 font-semibold mb-1">No cases in your queue</p>
        <p className="text-slate-500 text-sm">
          New disputes will appear here when assigned to you.
        </p>
      </GlassCard>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DisputesPage() {
  const [cases, setCases] = useState<ResolverCaseItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthError, setIsAuthError] = useState(false)
  const limit = 20

  const fetchCases = useCallback(async (p: number) => {
    setLoading(true)
    setError(null)
    setIsAuthError(false)
    try {
      const res = await authFetch(`/api/disputes?page=${p}&limit=${limit}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      const data: DisputesResponse = await res.json()
      setCases(data.cases)
      setTotal(data.total)
    } catch (err) {
      if (err instanceof AuthError) {
        setIsAuthError(true)
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load disputes')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCases(page) }, [fetchCases, page])

  // Sort: escalated first, then high, then normal
  const sorted = [...cases].sort((a, b) => {
    const order: Record<Priority, number> = { escalated: 0, high: 1, normal: 2 }
    return order[getPriority(a)] - order[getPriority(b)]
  })

  const totalPages = Math.ceil(total / limit)

  return (
    <>
      <div className="min-h-screen pt-4 px-4 pb-12 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <p className="text-xs text-slate-500 mb-1">Resolver Console</p>
          <h1 className="text-3xl font-bold text-slate-100">Dispute Queue</h1>
          <p className="text-slate-400 text-sm mt-1">
            Your assigned and unassigned cases, sorted by priority
          </p>
        </motion.div>

        {/* Priority legend */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex flex-wrap gap-3 mb-6"
        >
          {(Object.entries(PRIORITY_CONFIG) as [Priority, typeof PRIORITY_CONFIG[Priority]][]).map(
            ([key, cfg]) => (
              <span
                key={key}
                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${cfg.badge}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
            )
          )}
          {!loading && (
            <span className="text-xs text-slate-500 self-center ml-auto">
              {total} case{total !== 1 ? 's' : ''} total
            </span>
          )}
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-36 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(15,23,42,0.5)] animate-pulse"
              />
            ))}
          </div>
        ) : isAuthError ? (
          <AuthPrompt message="Connect your wallet to view your dispute queue." />
        ) : error ? (
          <GlassCard className="p-8 text-center">
            <p className="text-brand-red font-semibold">{error}</p>
            <button
              onClick={() => fetchCases(page)}
              className="mt-4 text-sm text-brand-blue hover:underline"
            >
              Retry
            </button>
          </GlassCard>
        ) : sorted.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-4">
            {sorted.map((item, i) => (
              <CaseCard key={item.id} item={item} index={i} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-3 mt-8"
          >
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 text-sm rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(15,23,42,0.7)] text-slate-300 disabled:opacity-40 hover:border-brand-blue/40 transition-colors"
            >
              ← Prev
            </button>
            <span className="text-sm text-slate-500">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 text-sm rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(15,23,42,0.7)] text-slate-300 disabled:opacity-40 hover:border-brand-blue/40 transition-colors"
            >
              Next →
            </button>
          </motion.div>
        )}
      </div>
    </>
  )
}
