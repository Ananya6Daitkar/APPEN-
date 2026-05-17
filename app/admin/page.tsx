'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/shared/GlassCard'
import { AuthPrompt } from '@/components/shared/AuthPrompt'
import { MetricsGrid, type AdminMetrics } from '@/components/admin/MetricsGrid'
import { UserManagement } from '@/components/admin/UserManagement'
import { RiskConfigPanel } from '@/components/admin/RiskConfigPanel'
import { AuditLogTable } from '@/components/admin/AuditLogTable'
import { authFetch } from '@/lib/auth/authFetch'

// ─── Tab config ───────────────────────────────────────────────────────────────

type Tab = 'metrics' | 'users' | 'risk' | 'audit'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'metrics', label: 'Metrics', icon: 'CHART' },
  { id: 'users', label: 'User Management', icon: 'USER' },
  { id: 'risk', label: 'Risk Config', icon: '⚙️' },
  { id: 'audit', label: 'Audit Log', icon: '📋' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('metrics')
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [metricsError, setMetricsError] = useState<string | null>(null)
  const [metricsAuthError, setMetricsAuthError] = useState(false)

  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true)
    setMetricsError(null)
    setMetricsAuthError(false)
    try {
      const res = await authFetch('/api/admin/metrics')
      if (res.status === 401 || res.status === 403) {
        setMetricsAuthError(true)
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      setMetrics(data)
    } catch (err) {
      setMetricsError(err instanceof Error ? err.message : 'Failed to load metrics')
    } finally {
      setMetricsLoading(false)
    }
  }, [])

  useEffect(() => { fetchMetrics() }, [fetchMetrics])

  // Auto-refresh metrics every 30s
  useEffect(() => {
    const interval = setInterval(fetchMetrics, 30_000)
    return () => clearInterval(interval)
  }, [fetchMetrics])

  return (
    <div className="min-h-screen pt-4 px-4 pb-12 max-w-7xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <p className="text-xs text-slate-500 mb-1">Compliance Operations</p>
          <h1 className="text-3xl font-bold text-slate-100">Admin Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            Platform health, user management, risk configuration, and audit trail
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex flex-wrap gap-2 mb-6"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-brand-blue/20 border border-brand-blue/40 text-brand-blue'
                  : 'border border-[rgba(255,255,255,0.08)] text-slate-400 hover:text-slate-200 hover:border-[rgba(255,255,255,0.16)]'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Tab content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {activeTab === 'metrics' && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Platform Metrics
                </p>
                <button
                  onClick={fetchMetrics}
                  disabled={metricsLoading}
                  className="text-xs text-brand-blue hover:underline disabled:opacity-50"
                >
                  {metricsLoading ? 'Refreshing…' : '↻ Refresh'}
                </button>
              </div>

              {metricsAuthError ? (
                <div className="py-4">
                  <AuthPrompt message="Connect your wallet to view admin metrics." />
                </div>
              ) : metricsError ? (
                <GlassCard className="p-8 text-center">
                  <p className="text-brand-red text-sm">{metricsError}</p>
                  <button
                    onClick={fetchMetrics}
                    className="mt-3 text-xs text-brand-blue hover:underline"
                  >
                    Retry
                  </button>
                </GlassCard>
              ) : metricsLoading && !metrics ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-28 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(15,23,42,0.5)] animate-pulse"
                    />
                  ))}
                  <div className="sm:col-span-2 lg:col-span-4 h-52 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(15,23,42,0.5)] animate-pulse" />
                </div>
              ) : metrics ? (
                <MetricsGrid metrics={metrics} />
              ) : null}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="flex flex-col gap-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                User Management
              </p>
              <UserManagement />
            </div>
          )}

          {activeTab === 'risk' && (
            <div className="flex flex-col gap-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Risk Engine Configuration
              </p>
              <RiskConfigPanel />
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="flex flex-col gap-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Audit Log
              </p>
              <AuditLogTable />
            </div>
          )}
        </motion.div>
      </div>
  )
}
