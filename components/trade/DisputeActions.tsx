'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/shared/GlassCard'
import { AuthPrompt } from '@/components/shared/AuthPrompt'
import { useEscrowContract } from '@/lib/contracts/escrow'
import { authFetch } from '@/lib/auth/authFetch'

type TradeState =
  | 'CREATED' | 'FUNDED' | 'MARKED_PAID' | 'UNDER_REVIEW'
  | 'DISPUTED' | 'RELEASED' | 'REFUNDED' | 'CANCELLED'

type UserRole = 'buyer' | 'seller' | 'resolver' | 'observer'

interface DisputeActionsProps {
  tradeId: string
  tradeState: TradeState
  role: UserRole
  challengeExpiresAt?: string | null
  disputeId?: string | null       // resolver case id
  onChainTradeId?: `0x${string}` | null  // bytes32 on-chain trade id
  onAction?: (newState: TradeState) => void
}

function ChallengeCountdown({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState(() => {
    const diff = new Date(expiresAt).getTime() - Date.now()
    return Math.max(0, Math.floor(diff / 1000))
  })

  // Update every second
  useState(() => {
    const interval = setInterval(() => {
      const diff = new Date(expiresAt).getTime() - Date.now()
      setRemaining(Math.max(0, Math.floor(diff / 1000)))
    }, 1000)
    return () => clearInterval(interval)
  })

  const h = Math.floor(remaining / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  const s = remaining % 60
  const expired = remaining === 0

  return (
    <div className={cn(
      'flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border',
      expired
        ? 'bg-slate-700/30 border-slate-600 text-slate-500'
        : remaining < 300
        ? 'bg-brand-red/10 border-brand-red/30 text-brand-red'
        : 'bg-brand-amber/10 border-brand-amber/30 text-brand-amber'
    )}>
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 6v6l4 2" />
      </svg>
      {expired ? 'Window expired' : `${h > 0 ? `${h}h ` : ''}${m}m ${s}s`}
    </div>
  )
}

export function DisputeActions({
  tradeId,
  tradeState,
  role,
  challengeExpiresAt,
  disputeId,
  onChainTradeId,
  onAction,
}: DisputeActionsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAuthError, setIsAuthError] = useState(false)
  const [showResolverForm, setShowResolverForm] = useState(false)
  const [resolverDecision, setResolverDecision] = useState<'release' | 'refund' | null>(null)
  const [rationale, setRationale] = useState('')

  const { markPaid: markPaidOnChain, dispute: disputeOnChain, release: releaseOnChain, refund: refundOnChain } = useEscrowContract()

  const windowExpired = challengeExpiresAt
    ? new Date(challengeExpiresAt).getTime() < Date.now()
    : false

  async function handleMarkPaid() {
    setLoading('mark-paid')
    setError(null)
    setIsAuthError(false)
    try {
      if (onChainTradeId) await markPaidOnChain(onChainTradeId)
      const res = await authFetch(`/api/trades/${tradeId}/mark-paid`, { method: 'POST' })
      if (res.status === 401) { setIsAuthError(true); return }
      if (!res.ok) {
        const data = await res.json()
        throw new Error((data as { error?: string }).error ?? 'Failed to mark as paid')
      }
      onAction?.('MARKED_PAID')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setLoading(null)
    }
  }

  async function handleDispute() {
    setLoading('dispute')
    setError(null)
    setIsAuthError(false)
    try {
      if (onChainTradeId) await disputeOnChain(onChainTradeId)
      const res = await authFetch(`/api/trades/${tradeId}/dispute`, { method: 'POST' })
      if (res.status === 401) { setIsAuthError(true); return }
      if (!res.ok) {
        const data = await res.json()
        throw new Error((data as { error?: string }).error ?? 'Failed to raise dispute')
      }
      onAction?.('DISPUTED')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setLoading(null)
    }
  }

  async function handleResolve() {
    if (!resolverDecision || rationale.trim().length < 20 || !disputeId) return
    setLoading('resolve')
    setError(null)
    setIsAuthError(false)
    try {
      if (onChainTradeId) {
        if (resolverDecision === 'release') await releaseOnChain(onChainTradeId)
        else await refundOnChain(onChainTradeId)
      }
      const res = await authFetch(`/api/disputes/${disputeId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: resolverDecision, rationale: rationale.trim() }),
      })
      if (res.status === 401) { setIsAuthError(true); return }
      if (!res.ok) {
        const data = await res.json()
        throw new Error((data as { error?: string }).error ?? 'Failed to resolve dispute')
      }
      onAction?.(resolverDecision === 'release' ? 'RELEASED' : 'REFUNDED')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setLoading(null)
    }
  }

  // Terminal states — no actions
  if (['RELEASED', 'REFUNDED', 'CANCELLED'].includes(tradeState)) {
    const stateLabel = tradeState === 'RELEASED' ? 'Released' : tradeState === 'REFUNDED' ? 'Refunded' : 'Cancelled'
    const stateColor = tradeState === 'RELEASED' ? 'text-brand-emerald' : tradeState === 'REFUNDED' ? 'text-brand-amber' : 'text-slate-500'
    return (
      <GlassCard className="p-4">
        <p className={cn('text-sm font-semibold', stateColor)}>Trade {stateLabel}</p>
        <p className="text-xs text-slate-500 mt-1">No further actions available.</p>
      </GlassCard>
    )
  }

  return (
    <GlassCard className="p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-slate-300">Actions</h3>
        {challengeExpiresAt && tradeState === 'MARKED_PAID' && (
          <ChallengeCountdown expiresAt={challengeExpiresAt} />
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* BUYER: mark paid (when FUNDED) */}
        {role === 'buyer' && tradeState === 'FUNDED' && (
          <motion.div key="buyer-mark-paid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-xs text-slate-400 mb-3">
              Once you've sent the fiat payment, mark the trade as paid to start the challenge window.
            </p>
            <button
              onClick={handleMarkPaid}
              disabled={loading === 'mark-paid'}
              className="w-full py-2.5 rounded-lg bg-brand-blue/20 border border-brand-blue/30 text-brand-blue text-sm font-semibold hover:bg-brand-blue/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading === 'mark-paid' ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : null}
              Mark as Paid
            </button>
          </motion.div>
        )}

        {/* BUYER: waiting for seller (when MARKED_PAID) */}
        {role === 'buyer' && tradeState === 'MARKED_PAID' && (
          <motion.div key="buyer-waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-brand-blue/10 border border-brand-blue/20">
              <svg className="w-4 h-4 text-brand-blue animate-pulse shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 6v6l4 2" />
              </svg>
              <p className="text-xs text-slate-300">
                Waiting for the challenge window to expire. Funds will auto-release if the seller doesn't dispute.
              </p>
            </div>
          </motion.div>
        )}

        {/* SELLER: dispute button (MARKED_PAID + window active) */}
        {role === 'seller' && tradeState === 'MARKED_PAID' && (
          <motion.div key="seller-dispute" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {!windowExpired ? (
              <>
                <p className="text-xs text-slate-400 mb-3">
                  If you haven't received the fiat payment, raise a dispute before the challenge window expires.
                </p>
                <button
                  onClick={handleDispute}
                  disabled={loading === 'dispute'}
                  className="w-full py-2.5 rounded-lg bg-brand-red/20 border border-brand-red/30 text-brand-red text-sm font-semibold hover:bg-brand-red/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading === 'dispute' ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : null}
                  Raise Dispute
                </button>
              </>
            ) : (
              <div className="p-3 rounded-lg bg-slate-700/30 border border-slate-600/30">
                <p className="text-xs text-slate-500">Challenge window has expired. Funds will be released to the buyer.</p>
              </div>
            )}
          </motion.div>
        )}

        {/* RESOLVER: release/refund (DISPUTED) */}
        {role === 'resolver' && tradeState === 'DISPUTED' && (
          <motion.div key="resolver-actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
            {!showResolverForm ? (
              <div className="flex gap-2">
                <button
                  onClick={() => { setResolverDecision('release'); setShowResolverForm(true) }}
                  className="flex-1 py-2.5 rounded-lg bg-brand-emerald/20 border border-brand-emerald/30 text-brand-emerald text-sm font-semibold hover:bg-brand-emerald/30 transition-colors"
                >
                  Release to Buyer
                </button>
                <button
                  onClick={() => { setResolverDecision('refund'); setShowResolverForm(true) }}
                  className="flex-1 py-2.5 rounded-lg bg-brand-amber/20 border border-brand-amber/30 text-brand-amber text-sm font-semibold hover:bg-brand-amber/30 transition-colors"
                >
                  Refund to Seller
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className={cn(
                  'text-xs font-semibold px-2.5 py-1 rounded-full border w-fit',
                  resolverDecision === 'release'
                    ? 'bg-brand-emerald/20 text-brand-emerald border-brand-emerald/30'
                    : 'bg-brand-amber/20 text-brand-amber border-brand-amber/30'
                )}>
                  Decision: {resolverDecision === 'release' ? 'Release to Buyer' : 'Refund to Seller'}
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">
                    Rationale <span className="text-slate-600">(min 20 characters)</span>
                  </label>
                  <textarea
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                    rows={3}
                    placeholder="Explain your decision based on the evidence..."
                    className="w-full rounded-lg bg-surface-800 border border-[rgba(255,255,255,0.08)] text-sm text-slate-200 placeholder-slate-600 px-3 py-2 resize-none focus:outline-none focus:border-brand-blue/50 transition-colors"
                  />
                  <p className={cn('text-xs mt-1', rationale.trim().length >= 20 ? 'text-brand-emerald' : 'text-slate-600')}>
                    {rationale.trim().length}/20 min characters
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowResolverForm(false); setRationale('') }}
                    className="px-4 py-2 rounded-lg border border-slate-700 text-slate-400 text-sm hover:border-slate-500 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleResolve}
                    disabled={loading === 'resolve' || rationale.trim().length < 20}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2',
                      resolverDecision === 'release'
                        ? 'bg-brand-emerald/20 border border-brand-emerald/30 text-brand-emerald hover:bg-brand-emerald/30'
                        : 'bg-brand-amber/20 border border-brand-amber/30 text-brand-amber hover:bg-brand-amber/30'
                    )}
                  >
                    {loading === 'resolve' && (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    )}
                    Confirm Decision
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Under review / waiting */}
        {tradeState === 'UNDER_REVIEW' && role !== 'resolver' && (
          <motion.div key="under-review" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-brand-amber/10 border border-brand-amber/20">
              <svg className="w-4 h-4 text-brand-amber shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <p className="text-xs text-slate-300">This trade is under manual review by a resolver.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isAuthError && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <AuthPrompt message="Connect your wallet to perform trade actions." />
        </motion.div>
      )}

      {!isAuthError && error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-brand-red"
        >
          {error}
        </motion.p>
      )}
    </GlassCard>
  )
}
