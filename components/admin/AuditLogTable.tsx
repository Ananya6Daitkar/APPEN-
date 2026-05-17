'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/shared/GlassCard'
import { AuthPrompt } from '@/components/shared/AuthPrompt'
import { authFetch, AuthError } from '@/lib/auth/authFetch'
import { AuditChainView } from './AuditChainView'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditLogEntry {
  id: string
  actorAddress: string | null
  actionType: string
  entityType: string
  entityId: string
  createdAt: string
  beforeState: unknown
  afterState: unknown
}

interface AuditLogResponse {
  logs: AuditLogEntry[]
  total: number
  page: number
  limit: number
}

interface Filters {
  actor: string
  entityId: string
  actionType: string
  dateFrom: string
  dateTo: string
}

// ─── Action type badge colors ─────────────────────────────────────────────────

const ACTION_COLORS: Record<string, string> = {
  USER_SUSPENDED: 'bg-brand-red/15 text-brand-red border-brand-red/30',
  KYC_APPROVED: 'bg-brand-emerald/15 text-brand-emerald border-brand-emerald/30',
  KYC_SUBMITTED: 'bg-brand-blue/15 text-brand-blue border-brand-blue/30',
  RISK_CONFIG_CHANGED: 'bg-brand-violet/15 text-brand-violet border-brand-violet/30',
  RISK_SCORED: 'bg-brand-amber/15 text-brand-amber border-brand-amber/30',
  DISPUTE_RESOLVED: 'bg-brand-emerald/15 text-brand-emerald border-brand-emerald/30',
  DISPUTE_ASSIGNED: 'bg-brand-blue/15 text-brand-blue border-brand-blue/30',
  REPUTATION_UPDATED: 'bg-brand-violet/15 text-brand-violet border-brand-violet/30',
  NOTIFICATION_FAILED: 'bg-brand-red/15 text-brand-red border-brand-red/30',
}

function ActionBadge({ type }: { type: string }) {
  const cls = ACTION_COLORS[type] ?? 'bg-slate-700/40 text-slate-400 border-slate-600/30'
  return (
    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full border ${cls} whitespace-nowrap`}>
      {type.replace(/_/g, ' ')}
    </span>
  )
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCSV(logs: AuditLogEntry[]) {
  const headers = ['id', 'actorAddress', 'actionType', 'entityType', 'entityId', 'createdAt']
  const rows = logs.map((l) => [
    l.id,
    l.actorAddress ?? '',
    l.actionType,
    l.entityType,
    l.entityId,
    l.createdAt,
  ])
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

const INPUT_CLS =
  'rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-xs text-slate-200 placeholder-slate-600 px-3 py-2 focus:outline-none focus:border-brand-blue/40 transition-colors'

interface FilterBarProps {
  filters: Filters
  onChange: (f: Filters) => void
  onApply: () => void
  onReset: () => void
}

function FilterBar({ filters, onChange, onApply, onReset }: FilterBarProps) {
  function set(key: keyof Filters) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange({ ...filters, [key]: e.target.value })
  }

  return (
    <div className="flex flex-wrap gap-2 items-end">
      <input
        className={`${INPUT_CLS} w-44 font-mono`}
        placeholder="Actor address"
        value={filters.actor}
        onChange={set('actor')}
      />
      <input
        className={`${INPUT_CLS} w-36 font-mono`}
        placeholder="Entity ID"
        value={filters.entityId}
        onChange={set('entityId')}
      />
      <input
        className={`${INPUT_CLS} w-40`}
        placeholder="Action type"
        value={filters.actionType}
        onChange={set('actionType')}
      />
      <input
        type="date"
        className={`${INPUT_CLS} w-36`}
        value={filters.dateFrom}
        onChange={set('dateFrom')}
      />
      <input
        type="date"
        className={`${INPUT_CLS} w-36`}
        value={filters.dateTo}
        onChange={set('dateTo')}
      />
      <button
        onClick={onApply}
        className="px-4 py-2 rounded-lg bg-brand-blue/20 border border-brand-blue/40 text-brand-blue text-xs font-semibold hover:bg-brand-blue/30 transition-colors"
      >
        Apply
      </button>
      <button
        onClick={onReset}
        className="px-4 py-2 rounded-lg border border-[rgba(255,255,255,0.08)] text-slate-400 text-xs hover:border-[rgba(255,255,255,0.16)] transition-colors"
      >
        Reset
      </button>
    </div>
  )
}

// ─── AuditLogTable ────────────────────────────────────────────────────────────

const LIMIT = 20
const EMPTY_FILTERS: Filters = { actor: '', entityId: '', actionType: '', dateFrom: '', dateTo: '' }

export function AuditLogTable() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthError, setIsAuthError] = useState(false)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<Filters>(EMPTY_FILTERS)
  const [viewMode, setViewMode] = useState<'table' | 'chain'>('table')

  const fetchLogs = useCallback(async (p: number, f: Filters) => {
    setLoading(true)
    setError(null)
    setIsAuthError(false)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) })
      if (f.actor) params.set('actor', f.actor)
      if (f.entityId) params.set('entityId', f.entityId)
      if (f.actionType) params.set('actionType', f.actionType)
      if (f.dateFrom) params.set('dateFrom', f.dateFrom)
      if (f.dateTo) params.set('dateTo', f.dateTo)

      const res = await authFetch(`/api/admin/audit-log?${params}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      const data: AuditLogResponse = await res.json()
      setLogs(data.logs)
      setTotal(data.total)
    } catch (err) {
      if (err instanceof AuthError) {
        setIsAuthError(true)
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load audit log')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLogs(page, appliedFilters) }, [fetchLogs, page, appliedFilters])

  function handleApply() {
    setPage(1)
    setAppliedFilters(filters)
  }

  function handleReset() {
    setFilters(EMPTY_FILTERS)
    setAppliedFilters(EMPTY_FILTERS)
    setPage(1)
  }

  const totalPages = Math.ceil(total / LIMIT)

  function shortAddr(addr: string | null) {
    if (!addr) return '—'
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        onApply={handleApply}
        onReset={handleReset}
      />

      {/* Export + count + view toggle */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {loading ? 'Loading…' : `${total.toLocaleString()} entries`}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'table' ? 'chain' : 'table')}
            className="text-xs px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] text-slate-400 hover:border-brand-violet/30 hover:text-brand-violet transition-colors"
          >
            {viewMode === 'table' ? 'Chain View' : 'Table View'}
          </button>
          <button
            onClick={() => exportCSV(logs)}
            disabled={logs.length === 0}
            className="text-xs px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] text-slate-400 hover:border-brand-blue/30 hover:text-brand-blue transition-colors disabled:opacity-40"
          >
            ↓ Export CSV
          </button>
        </div>
      </div>

      {/* Chain view */}
      {viewMode === 'chain' && !loading && !isAuthError && !error && logs.length > 0 && (
        <AuditChainView logs={logs as (AuditLogEntry & { contentHash: string; previousHash: string | null })[]} />
      )}

      {/* Table (only in table mode) */}
      {viewMode === 'table' && (
      <GlassCard className="overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_1fr_1.5fr_1fr_1fr] gap-3 px-4 py-2.5 border-b border-[rgba(255,255,255,0.06)] text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <span>Actor</span>
          <span>Action</span>
          <span>Entity</span>
          <span>Entity ID</span>
          <span>Timestamp</span>
        </div>

        {loading ? (
          <div className="flex flex-col">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 mx-4 my-1.5 rounded-lg bg-[rgba(255,255,255,0.03)] animate-pulse" />
            ))}
          </div>
        ) : isAuthError ? (
          <div className="p-8">
            <AuthPrompt message="Connect your wallet to view the audit log." />
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-brand-red text-sm">{error}</p>
            <button
              onClick={() => fetchLogs(page, appliedFilters)}
              className="mt-3 text-xs text-brand-blue hover:underline"
            >
              Retry
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No audit log entries found.</div>
        ) : (
          <div className="flex flex-col divide-y divide-[rgba(255,255,255,0.04)]">
            {logs.map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="grid grid-cols-[1fr_1fr_1.5fr_1fr_1fr] gap-3 px-4 py-3 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
              >
                <span className="text-xs font-mono text-slate-400 truncate" title={log.actorAddress ?? ''}>
                  {shortAddr(log.actorAddress)}
                </span>
                <div className="flex items-center">
                  <ActionBadge type={log.actionType} />
                </div>
                <span className="text-xs text-slate-400 truncate">{log.entityType}</span>
                <span className="text-xs font-mono text-slate-500 truncate" title={log.entityId}>
                  {log.entityId.slice(0, 8)}…
                </span>
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </GlassCard>
      )} {/* end table mode */}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
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
        </div>
      )}
    </div>
  )
}
