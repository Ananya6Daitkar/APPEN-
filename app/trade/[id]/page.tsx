'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/shared/GlassCard'
import { ReputationBadge } from '@/components/shared/ReputationBadge'
import { KYCTierBadge } from '@/components/shared/KYCTierBadge'
import { TradeStateTimeline } from '@/components/trade/TradeStateTimeline'
import { ProofUploader } from '@/components/trade/ProofUploader'
import { ProofStatus } from '@/components/trade/ProofStatus'
import { DisputeActions } from '@/components/trade/DisputeActions'
import { ChatThread } from '@/components/trade/ChatThread'
import { useWebSocket } from '@/lib/websocket/useWebSocket'
import { authFetch } from '@/lib/auth/authFetch'

type TradeState =
  | 'CREATED' | 'FUNDED' | 'MARKED_PAID' | 'UNDER_REVIEW'
  | 'DISPUTED' | 'RELEASED' | 'REFUNDED' | 'CANCELLED'

interface TradeDetail {
  id: string
  state: TradeState
  stablecoin: string
  amount: string
  fiatCurrency: string
  fiatRate: string
  challengeWindowSeconds: number
  markedPaidAt: string | null
  challengeExpiresAt: string | null
  releasedAt: string | null
  refundedAt: string | null
  createdAt: string
  buyerId: string
  sellerId: string
  buyer: {
    id: string
    walletAddress: string
    kycTier: number
    reputation: { score: number; totalTrades: number; disputeCount: number } | null
  }
  seller: {
    id: string
    walletAddress: string
    kycTier: number
    reputation: { score: number; totalTrades: number; disputeCount: number } | null
  }
  proofs: Array<{
    id: string
    evidenceHash: string
    mimeType: string
    createdAt: string
    ocrResult: {
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
    } | null
    riskScore: {
      trustScore: number
      recommendation: 'auto_release' | 'challenge_window' | 'manual_review'
      fraudFlags: { type: string; description?: string }[]
      subScores: Record<string, number>
    } | null
  }>
  dispute: {
    id: string
    decision: string
    resolverCase: { id: string; assignedToId: string | null; decision: string } | null
  } | null
}

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function StateLabel({ state }: { state: TradeState }) {
  const config: Record<TradeState, { label: string; color: string }> = {
    CREATED:     { label: 'Created',      color: 'text-slate-400' },
    FUNDED:      { label: 'Funded',       color: 'text-brand-blue' },
    MARKED_PAID: { label: 'Marked Paid',  color: 'text-brand-blue' },
    UNDER_REVIEW:{ label: 'Under Review', color: 'text-brand-amber' },
    DISPUTED:    { label: 'Disputed',     color: 'text-brand-violet' },
    RELEASED:    { label: 'Released',     color: 'text-brand-emerald' },
    REFUNDED:    { label: 'Refunded',     color: 'text-brand-amber' },
    CANCELLED:   { label: 'Cancelled',    color: 'text-slate-500' },
  }
  const { label, color } = config[state]
  return <span className={color}>{label}</span>
}

export default function TradePage() {
  const { id } = useParams<{ id: string }>()
  const [trade, setTrade] = useState<TradeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthError, setIsAuthError] = useState(false)
  const [currentAddress, setCurrentAddress] = useState<string | null>(null)

  // Read the stored wallet address on mount (client-only — avoids SSR localStorage crash)
  useEffect(() => {
    const addr = localStorage.getItem('appen_demo_address')
    setCurrentAddress(addr)
  }, [])

  const fetchTrade = useCallback(async () => {
    try {
      const res = await authFetch(`/api/trades/${id}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Trade not found')
      }
      const data = await res.json()
      setTrade(data)
    } catch (err) {
      if (err instanceof Error && err.name === 'AuthError') {
        setIsAuthError(true)
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load trade')
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchTrade() }, [fetchTrade])

  // Real-time state updates
  const handleWsEvent = useCallback((event: { type: string; payload: Record<string, unknown> }) => {
    if (
      event.type === 'trade:state_changed' &&
      (event.payload as { tradeId?: string }).tradeId === id
    ) {
      fetchTrade()
    }
    if (
      event.type === 'trade:proof_processed' &&
      (event.payload as { tradeId?: string }).tradeId === id
    ) {
      fetchTrade()
    }
  }, [id, fetchTrade])

  useWebSocket({ onEvent: handleWsEvent, tradeId: id })

  // Determine current user's role using stored demo address
  const role = (() => {
    if (!trade) return 'observer' as const
    const addr = (currentAddress ?? '').toLowerCase()
    if (!addr) return 'observer' as const
    if (trade.buyer.walletAddress.toLowerCase() === addr) return 'buyer' as const
    if (trade.seller.walletAddress.toLowerCase() === addr) return 'seller' as const
    if (trade.dispute?.resolverCase?.assignedToId) return 'resolver' as const
    return 'observer' as const
  })()

  const latestProof = trade?.proofs[0] ?? null

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-10 max-w-5xl mx-auto">
        <div className="h-8 w-48 rounded-lg bg-surface-800 animate-pulse mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-surface-800 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !trade) {
    return (
      <div className="min-h-screen px-4 py-10 max-w-5xl mx-auto flex items-center justify-center">
        <GlassCard className="p-8 text-center">
          {isAuthError ? (
            <div className="flex flex-col items-center gap-4">
              <div className="text-3xl">🔑</div>
              <p className="text-slate-200 font-semibold">Wallet Required</p>
              <p className="text-slate-400 text-sm">Please log in using Demo Login in the navbar to view this trade.</p>
            </div>
          ) : (
            <p className="text-brand-red font-semibold">{error ?? 'Trade not found'}</p>
          )}
        </GlassCard>
      </div>
    )
  }

  const canUploadProof = role === 'buyer' && ['FUNDED', 'MARKED_PAID', 'UNDER_REVIEW'].includes(trade.state)
  const canChat = role === 'buyer' || role === 'seller'

  return (
    <div className="min-h-screen px-4 py-10 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-slate-500 font-mono mb-1">Trade ID: {trade.id}</p>
            <h1 className="text-2xl font-bold text-slate-100">
              {Number(trade.amount).toLocaleString()} {trade.stablecoin}
              <span className="text-slate-400 font-normal text-lg ml-2">
                @ {Number(trade.fiatRate).toLocaleString()} {trade.fiatCurrency}
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Status: <StateLabel state={trade.state} />
              {role !== 'observer' && (
                <span className="ml-3 text-xs px-2 py-0.5 rounded-full bg-surface-700 border border-[rgba(255,255,255,0.06)] text-slate-400 capitalize">
                  You are the {role}
                </span>
              )}
            </p>
          </div>
        </div>
      </motion.div>

      {/* State Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-6"
      >
        <GlassCard className="p-5">
          <TradeStateTimeline currentState={trade.state} />
        </GlassCard>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Parties */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <GlassCard className="p-5">
              <h2 className="text-sm font-semibold text-slate-400 mb-4">Trade Parties</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Buyer', user: trade.buyer },
                  { label: 'Seller', user: trade.seller },
                ].map(({ label, user }) => (
                  <div key={label} className="flex flex-col gap-2 p-3 rounded-lg bg-surface-800 border border-[rgba(255,255,255,0.05)]">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="text-sm font-mono text-slate-200">{shortAddress(user.walletAddress)}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <ReputationBadge score={user.reputation?.score ?? 500} size="sm" />
                      <KYCTierBadge tier={user.kycTier as 0 | 1 | 2 | 3} size="sm" />
                    </div>
                    {user.reputation && (
                      <p className="text-xs text-slate-500">
                        {user.reputation.totalTrades} trades · {user.reputation.disputeCount} disputes
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Proof uploader */}
          {canUploadProof && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <ProofUploader
                tradeId={trade.id}
                onUploaded={() => fetchTrade()}
              />
            </motion.div>
          )}

          {/* Proof status */}
          {latestProof?.ocrResult && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <ProofStatus
                ocrResult={latestProof.ocrResult}
                riskScore={latestProof.riskScore ?? null}
              />
            </motion.div>
          )}

          {/* Chat */}
          {(canChat || trade.proofs.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <ChatThread
                tradeId={trade.id}
                currentUserId={trade.buyerId}
                currentUserAddress={currentAddress ?? ''}
                buyerAddress={trade.buyer.walletAddress}
                sellerAddress={trade.seller.walletAddress}
                disabled={!canChat}
              />
            </motion.div>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <DisputeActions
              tradeId={trade.id}
              tradeState={trade.state}
              role={role}
              challengeExpiresAt={trade.challengeExpiresAt}
              disputeId={trade.dispute?.resolverCase?.id ?? null}
              onChainTradeId={(trade as { onChainId?: string | null }).onChainId as `0x${string}` | null ?? null}
              onAction={(newState) => {
                setTrade((prev) => prev ? { ...prev, state: newState } : prev)
                fetchTrade()
              }}
            />
          </motion.div>

          {/* Trade details */}
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            <GlassCard className="p-5">
              <h3 className="text-sm font-semibold text-slate-400 mb-3">Details</h3>
              <dl className="flex flex-col gap-2">
                {[
                  { label: 'Amount', value: `${Number(trade.amount).toLocaleString()} ${trade.stablecoin}` },
                  { label: 'Rate', value: `${Number(trade.fiatRate).toLocaleString()} ${trade.fiatCurrency}` },
                  { label: 'Challenge Window', value: `${trade.challengeWindowSeconds / 60} min` },
                  { label: 'Created', value: new Date(trade.createdAt).toLocaleString() },
                  ...(trade.markedPaidAt ? [{ label: 'Marked Paid', value: new Date(trade.markedPaidAt).toLocaleString() }] : []),
                  ...(trade.releasedAt ? [{ label: 'Released', value: new Date(trade.releasedAt).toLocaleString() }] : []),
                  ...(trade.refundedAt ? [{ label: 'Refunded', value: new Date(trade.refundedAt).toLocaleString() }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start justify-between gap-2">
                    <dt className="text-xs text-slate-500 shrink-0">{label}</dt>
                    <dd className="text-xs text-slate-300 text-right">{value}</dd>
                  </div>
                ))}
              </dl>
            </GlassCard>
          </motion.div>

          {/* Evidence hash */}
          {latestProof && (
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <GlassCard className="p-5">
                <h3 className="text-sm font-semibold text-slate-400 mb-2">Evidence Hash</h3>
                <p className="text-[10px] font-mono text-slate-400 break-all leading-relaxed">
                  {latestProof.evidenceHash}
                </p>
                <p className="text-xs text-slate-600 mt-2">
                  SHA-256 of original file · tamper-evident
                </p>
              </GlassCard>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
