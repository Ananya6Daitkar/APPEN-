'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { GlassCard } from '@/components/shared/GlassCard'
import { ReputationBadge } from '@/components/shared/ReputationBadge'
import { KYCTierBadge } from '@/components/shared/KYCTierBadge'
import { ProofStatus } from '@/components/trade/ProofStatus'
import { ProofViewer } from '@/components/dispute/ProofViewer'
import { AIPreAssessment } from '@/components/dispute/AIPreAssessment'
import { authFetch } from '@/lib/auth/authFetch'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string
  walletAddress: string
  kycTier: 0 | 1 | 2 | 3
  reputation: { score: number; totalTrades: number; disputeCount: number } | null
}

interface Trade {
  id: string
  state: string
  amount: string
  stablecoin: string
  fiatCurrency: string
  fiatRate: string
  createdAt: string
  markedPaidAt: string | null
  buyer: UserProfile
  seller: UserProfile
}

interface Proof {
  id: string
  storageKey: string
  mimeType: string
  evidenceHash: string
  fileName?: string
}

interface OCRResult {
  amount: number | null
  currency: string | null
  timestamp: string | null
  transactionId: string | null
  payerName: string | null
  payeeName: string | null
  paymentRail: string | null
  bankName: string | null
  fieldConfidences: Record<string, number>
  overallConfidence: number
  verificationStatus: 'VERIFIED' | 'NEEDS_REVIEW' | 'SUSPICIOUS'
  explanation: string
}

interface RiskScore {
  trustScore: number
  recommendation: 'auto_release' | 'challenge_window' | 'manual_review'
  fraudFlags: { type: string; description?: string }[]
  subScores: Record<string, number>
}

interface ResolverCase {
  id: string
  disputeId: string   // populated from the API include
  decision: 'PENDING' | 'RELEASE' | 'REFUND'
  aiSummary: string | null
  createdAt: string
  assignedTo: { id: string; walletAddress: string } | null
}

interface DisputeDetailResponse {
  case: ResolverCase
  trade: Trade
  proof: Proof | null
  ocrResult: OCRResult | null
  riskScore: RiskScore | null
  aiSummary: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString()
}

const DECISION_CONFIG = {
  PENDING: { label: 'Pending', color: 'bg-brand-amber/20 text-brand-amber border-brand-amber/30' },
  RELEASE: { label: 'Released', color: 'bg-brand-emerald/20 text-brand-emerald border-brand-emerald/30' },
  REFUND: { label: 'Refunded', color: 'bg-brand-red/20 text-brand-red border-brand-red/30' },
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`rounded-lg bg-[rgba(255,255,255,0.04)] animate-pulse ${className ?? ''}`} />
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-24" />
      <Skeleton className="h-32" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-40" />
    </div>
  )
}

// ─── Resolver Actions ─────────────────────────────────────────────────────────

function ResolverActions({ caseId, onResolved }: { caseId: string; onResolved: () => void }) {
  const [active, setActive] = useState<'release' | 'refund' | null>(null)
  const [rationale, setRationale] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const MIN_CHARS = 20
  const charCount = rationale.trim().length

  async function handleSubmit() {
    if (charCount < MIN_CHARS) {
      setError(`Rationale must be at least ${MIN_CHARS} characters.`)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await authFetch(`/api/disputes/${caseId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: active, rationale: rationale.trim() }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
      onResolved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit decision')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <GlassCard className="p-5 flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-slate-300">Resolver Decision</h3>

        {!active ? (
          <div className="flex gap-3">
            <button
              onClick={() => setActive('release')}
              className="flex-1 py-2.5 rounded-lg bg-brand-emerald/20 border border-brand-emerald/40 text-brand-emerald text-sm font-semibold hover:bg-brand-emerald/30 transition-colors"
            >
              Release to Buyer
            </button>
            <button
              onClick={() => setActive('refund')}
              className="flex-1 py-2.5 rounded-lg bg-brand-red/20 border border-brand-red/40 text-brand-red text-sm font-semibold hover:bg-brand-red/30 transition-colors"
            >
              Refund to Seller
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex flex-col gap-3"
          >
            <div className={`text-xs font-semibold px-3 py-1.5 rounded-lg border w-fit ${
              active === 'release'
                ? 'bg-brand-emerald/20 text-brand-emerald border-brand-emerald/30'
                : 'bg-brand-red/20 text-brand-red border-brand-red/30'
            }`}>
              Decision: {active === 'release' ? 'Release to Buyer' : 'Refund to Seller'}
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400">Rationale</label>
                <span className={`text-xs font-mono ${charCount >= MIN_CHARS ? 'text-brand-emerald' : 'text-slate-500'}`}>
                  {charCount}/{MIN_CHARS} min
                </span>
              </div>
              <textarea
                value={rationale}
                onChange={(e) => { setRationale(e.target.value); setError(null) }}
                placeholder="Explain your decision in detail..."
                rows={4}
                className="w-full rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-sm text-slate-200 placeholder-slate-600 px-3 py-2.5 resize-none focus:outline-none focus:border-brand-blue/40 transition-colors"
              />
            </div>

            {error && (
              <p className="text-xs text-brand-red">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={submitting || charCount < MIN_CHARS}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  active === 'release'
                    ? 'bg-brand-emerald/20 border border-brand-emerald/40 text-brand-emerald hover:bg-brand-emerald/30'
                    : 'bg-brand-red/20 border border-brand-red/40 text-brand-red hover:bg-brand-red/30'
                }`}
              >
                {submitting ? 'Submitting…' : 'Confirm Decision'}
              </button>
              <button
                onClick={() => { setActive(null); setRationale(''); setError(null) }}
                disabled={submitting}
                className="px-4 py-2.5 rounded-lg text-sm text-slate-400 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </GlassCard>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DisputeDetailPage() {
  const params = useParams()
  const caseId = params.id as string

  const [data, setData] = useState<DisputeDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolved, setResolved] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch(`/api/disputes/${caseId}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const json: DisputeDetailResponse = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dispute')
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => { fetchData() }, [fetchData])

  function handleResolved() {
    setResolved(true)
    fetchData()
  }

  const decisionCfg = data ? DECISION_CONFIG[data.case.decision] : null
  const wordCount = data?.aiSummary ? data.aiSummary.trim().split(/\s+/).length : 0

  return (
    <div className="min-h-screen pt-4 px-4 pb-12 max-w-6xl mx-auto">

        {loading ? (
          <div className="mt-6">
            <PageSkeleton />
          </div>
        ) : error ? (
          <GlassCard className="mt-6 p-8 text-center">
            <p className="text-brand-red font-semibold">{error}</p>
            <button onClick={fetchData} className="mt-4 text-sm text-brand-blue hover:underline">
              Retry
            </button>
          </GlassCard>
        ) : data ? (
          <div className="flex flex-col gap-6 mt-6">

            {/* ── Header ── */}
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
              <Link href="/disputes" className="text-xs text-slate-500 hover:text-slate-300 transition-colors mb-3 inline-flex items-center gap-1">
                ← Back to Dispute Queue
              </Link>
              <GlassCard className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-slate-500 font-mono">
                      Case {data.case.id.slice(0, 8)}… · Dispute {data.case.disputeId ?? data.case.id.slice(0, 8)}…
                    </p>
                    <h1 className="text-2xl font-bold text-slate-100">
                      {Number(data.trade.amount).toLocaleString()} {data.trade.stablecoin}
                    </h1>
                    <p className="text-sm text-slate-400">
                      @ {Number(data.trade.fiatRate).toLocaleString()} {data.trade.fiatCurrency}
                    </p>
                  </div>
                  {decisionCfg && (
                    <span className={`text-sm font-semibold px-3 py-1.5 rounded-full border ${decisionCfg.color}`}>
                      {decisionCfg.label}
                    </span>
                  )}
                </div>
              </GlassCard>
            </motion.div>

            {/* ── AI Pre-Assessment ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
              <AIPreAssessment caseId={caseId} />
            </motion.div>

            {/* ── AI Summary ── */}
            {data.aiSummary && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <GlassCard className="p-5 border-brand-violet/30" style={{ borderColor: 'rgba(139,92,246,0.3)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-brand-violet" />
                      <h3 className="text-sm font-semibold text-slate-300">AI Case Summary</h3>
                    </div>
                    <span className="text-xs text-slate-500">{wordCount} words</span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{data.aiSummary}</p>
                </GlassCard>
              </motion.div>
            )}

            {/* ── Evidence Bundle ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Evidence Bundle</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: ProofViewer */}
                <ProofViewer
                  fileUrl={data.proof
                    ? (data.proof.storageKey?.includes('disputed')
                        ? '/demo/receipt-bank-transfer.svg'
                        : '/demo/receipt-bank-transfer.svg')
                    : ''}
                  mimeType="image/svg+xml"
                  fileName="payment-receipt.svg"
                  evidenceHash={data.proof?.evidenceHash}
                />

                {/* Right: ProofStatus */}
                {data.ocrResult ? (
                  <ProofStatus ocrResult={data.ocrResult} riskScore={data.riskScore} />
                ) : (
                  <GlassCard className="p-5 flex items-center justify-center">
                    <p className="text-sm text-slate-500">No OCR data available</p>
                  </GlassCard>
                )}
              </div>
            </motion.div>

            {/* ── Trade Details ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <GlassCard className="p-5">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Trade Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Buyer */}
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Buyer</p>
                    <p className="text-sm font-mono text-slate-300">{shortAddress(data.trade.buyer.walletAddress)}</p>
                    <div className="flex flex-wrap gap-2">
                      <KYCTierBadge tier={data.trade.buyer.kycTier} size="sm" />
                      {data.trade.buyer.reputation && (
                        <ReputationBadge score={data.trade.buyer.reputation.score} size="sm" />
                      )}
                    </div>
                  </div>

                  {/* Seller */}
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Seller</p>
                    <p className="text-sm font-mono text-slate-300">{shortAddress(data.trade.seller.walletAddress)}</p>
                    <div className="flex flex-wrap gap-2">
                      <KYCTierBadge tier={data.trade.seller.kycTier} size="sm" />
                      {data.trade.seller.reputation && (
                        <ReputationBadge score={data.trade.seller.reputation.score} size="sm" />
                      )}
                    </div>
                  </div>

                  {/* Trade info */}
                  <div className="flex flex-col gap-2 sm:col-span-2 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { label: 'Amount', value: `${Number(data.trade.amount).toLocaleString()} ${data.trade.stablecoin}` },
                        { label: 'Fiat Rate', value: `${Number(data.trade.fiatRate).toLocaleString()} ${data.trade.fiatCurrency}` },
                        { label: 'State', value: data.trade.state },
                        { label: 'Created', value: formatDate(data.trade.createdAt) },
                        { label: 'Marked Paid', value: formatDate(data.trade.markedPaidAt) },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex flex-col gap-0.5">
                          <p className="text-xs text-slate-500">{label}</p>
                          <p className="text-xs text-slate-300 font-mono">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* ── Resolver Actions ── */}
            {resolved ? (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
                <GlassCard className="p-6 text-center border-brand-emerald/30" style={{ borderColor: 'rgba(16,185,129,0.3)' }}>
                  <div className="text-3xl mb-2">✓</div>
                  <p className="text-brand-emerald font-semibold">Decision submitted successfully</p>
                  <p className="text-slate-400 text-sm mt-1">The trade has been updated and parties notified.</p>
                  <Link href="/disputes" className="mt-4 inline-block text-sm text-brand-blue hover:underline">
                    Back to queue →
                  </Link>
                </GlassCard>
              </motion.div>
            ) : data.case.decision === 'PENDING' ? (
              <ResolverActions caseId={caseId} onResolved={handleResolved} />
            ) : null}

          </div>
        ) : null}
      </div>
  )
}
