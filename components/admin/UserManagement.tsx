'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/shared/GlassCard'
import { KYCTierBadge } from '@/components/shared/KYCTierBadge'
import { ReputationBadge } from '@/components/shared/ReputationBadge'
import { AuthPrompt } from '@/components/shared/AuthPrompt'
import { authFetch, AuthError } from '@/lib/auth/authFetch'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserResult {
  id: string
  walletAddress: string
  kycTier: 0 | 1 | 2 | 3
  isSuspended: boolean
  createdAt: string
  reputation: { score: number } | null
}

// ─── Suspend Modal ────────────────────────────────────────────────────────────

interface SuspendModalProps {
  user: UserResult
  onClose: () => void
  onSuspended: () => void
}

function SuspendModal({ user, onClose, onSuspended }: SuspendModalProps) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!reason.trim()) {
      setError('Reason is required.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
      onSuspended()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to suspend user')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        className="relative z-10 w-full max-w-md"
      >
        <GlassCard className="p-6 flex flex-col gap-4 border-brand-red/30">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-100">Suspend User</h3>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300 transition-colors text-lg leading-none"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-xs text-slate-500">Wallet address</p>
            <p className="text-sm font-mono text-slate-300 break-all">{user.walletAddress}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Suspension reason <span className="text-brand-red">*</span></label>
            <textarea
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError(null) }}
              placeholder="Describe the reason for suspension..."
              rows={3}
              className="w-full rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-sm text-slate-200 placeholder-slate-600 px-3 py-2.5 resize-none focus:outline-none focus:border-brand-red/40 transition-colors"
            />
          </div>

          {error && <p className="text-xs text-brand-red">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSubmit}
              disabled={submitting || !reason.trim()}
              className="flex-1 py-2.5 rounded-lg bg-brand-red/20 border border-brand-red/40 text-brand-red text-sm font-semibold hover:bg-brand-red/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Suspending…' : 'Confirm Suspension'}
            </button>
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-lg text-sm text-slate-400 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  )
}

// ─── User Row ─────────────────────────────────────────────────────────────────

interface UserRowProps {
  user: UserResult
  onSuspend: (user: UserResult) => void
  onKycApprove: (user: UserResult) => void
  approving: boolean
}

function UserRow({ user, onSuspend, onKycApprove, approving }: UserRowProps) {
  function shortAddr(addr: string) {
    return `${addr.slice(0, 8)}…${addr.slice(-6)}`
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-[rgba(255,255,255,0.05)] last:border-0"
    >
      {/* Address */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-mono text-slate-200 truncate">{shortAddr(user.walletAddress)}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Joined {new Date(user.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <KYCTierBadge tier={user.kycTier} size="sm" />
        {user.reputation && <ReputationBadge score={user.reputation.score} size="sm" />}
        {user.isSuspended && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-brand-red/15 text-brand-red border border-brand-red/30">
            Suspended
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {user.kycTier === 2 && (
          <button
            onClick={() => onKycApprove(user)}
            disabled={approving}
            className="text-xs px-3 py-1.5 rounded-lg bg-brand-emerald/15 border border-brand-emerald/30 text-brand-emerald hover:bg-brand-emerald/25 transition-colors disabled:opacity-50"
          >
            {approving ? 'Approving…' : 'KYC Approve'}
          </button>
        )}
        {!user.isSuspended && (
          <button
            onClick={() => onSuspend(user)}
            className="text-xs px-3 py-1.5 rounded-lg bg-brand-red/10 border border-brand-red/20 text-brand-red hover:bg-brand-red/20 transition-colors"
          >
            Suspend
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ─── UserManagement ───────────────────────────────────────────────────────────

export function UserManagement() {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<UserResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAuthError, setIsAuthError] = useState(false)
  const [suspendTarget, setSuspendTarget] = useState<UserResult | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const search = useCallback(async (address: string) => {
    if (!address.trim()) { setUsers([]); return }
    setLoading(true)
    setError(null)
    setIsAuthError(false)
    try {
      const res = await authFetch(`/api/users/${encodeURIComponent(address.trim())}`)
      if (res.status === 404) {
        setUsers([])
        setError('No user found for that address.')
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      setUsers([data])
    } catch (err) {
      if (err instanceof AuthError) {
        setIsAuthError(true)
      } else {
        setError(err instanceof Error ? err.message : 'Search failed')
      }
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') search(query)
  }

  async function handleKycApprove(user: UserResult) {
    setApprovingId(user.id)
    setError(null)
    setIsAuthError(false)
    try {
      const res = await authFetch(`/api/admin/users/${user.id}/kyc-approve`, { method: 'POST' })
      const body = await res.json()
      if (!res.ok) throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
      setSuccessMsg(`KYC approved for ${user.walletAddress.slice(0, 8)}…`)
      await search(query)
    } catch (err) {
      if (err instanceof AuthError) {
        setIsAuthError(true)
      } else {
        setError(err instanceof Error ? err.message : 'KYC approval failed')
      }
    } finally {
      setApprovingId(null)
    }
  }

  async function handleSuspended() {
    setSuspendTarget(null)
    setSuccessMsg(`User suspended successfully.`)
    await search(query)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search by wallet address (0x…)"
          className="flex-1 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-sm text-slate-200 placeholder-slate-600 px-4 py-2.5 focus:outline-none focus:border-brand-blue/40 transition-colors font-mono"
        />
        <button
          onClick={() => search(query)}
          disabled={loading}
          className="px-5 py-2.5 rounded-lg bg-brand-blue/20 border border-brand-blue/40 text-brand-blue text-sm font-semibold hover:bg-brand-blue/30 transition-colors disabled:opacity-50"
        >
          {loading ? '…' : 'Search'}
        </button>
      </div>

      {/* Success message */}
      <AnimatePresence>
        {successMsg && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-brand-emerald"
          >
            ✓ {successMsg}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Error */}
      {isAuthError ? (
        <AuthPrompt message="Connect your wallet to manage users." />
      ) : error ? (
        <p className="text-xs text-brand-red">{error}</p>
      ) : null}

      {/* Results */}
      {users.length > 0 && (
        <GlassCard>
          {users.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              onSuspend={setSuspendTarget}
              onKycApprove={handleKycApprove}
              approving={approvingId === user.id}
            />
          ))}
        </GlassCard>
      )}

      {/* Suspend modal */}
      <AnimatePresence>
        {suspendTarget && (
          <SuspendModal
            user={suspendTarget}
            onClose={() => setSuspendTarget(null)}
            onSuspended={handleSuspended}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
