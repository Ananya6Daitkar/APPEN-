'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { GlassCard } from '@/components/shared/GlassCard'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminMetrics {
  activeTrades: number
  lockedStablecoinValue: number
  openDisputeCount: number
  avgResolutionTimeHours: number
  trustScoreDistribution: Record<string, number>
}

// ─── Count-up hook ────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const start = performance.now()
    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, duration])

  return value
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string
  value: number
  format?: (v: number) => string
  accent: string
  icon: string
  delay?: number
}

function MetricCard({ label, value, format, accent, icon, delay = 0 }: MetricCardProps) {
  const animated = useCountUp(value)
  const display = format ? format(animated) : animated.toLocaleString()

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
    >
      <GlassCard className="p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</span>
          <span className="text-lg">{icon}</span>
        </div>
        <p className={`text-3xl font-bold ${accent}`}>{display}</p>
      </GlassCard>
    </motion.div>
  )
}

// ─── Trust Score Histogram ────────────────────────────────────────────────────

const BUCKET_COLORS: Record<string, string> = {
  '0-19': '#EF4444',
  '20-39': '#F59E0B',
  '40-59': '#F59E0B',
  '60-79': '#3B82F6',
  '80-100': '#10B981',
}

function TrustScoreHistogram({ distribution }: { distribution: Record<string, number> }) {
  const data = Object.entries(distribution).map(([bucket, count]) => ({ bucket, count }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.4, ease: 'easeOut' }}
    >
      <GlassCard className="p-5 col-span-full lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Trust Score Distribution</span>
          <span className="text-lg">📊</span>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="bucket"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(15,23,42,0.95)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                color: '#e2e8f0',
                fontSize: 12,
              }}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.bucket} fill={BUCKET_COLORS[entry.bucket] ?? '#3B82F6'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>
    </motion.div>
  )
}

// ─── MetricsGrid ──────────────────────────────────────────────────────────────

interface MetricsGridProps {
  metrics: AdminMetrics
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        label="Active Trades"
        value={metrics.activeTrades}
        accent="text-brand-blue"
        icon="⚡"
        delay={0}
      />
      <MetricCard
        label="Locked Value (USDT/USDC)"
        value={metrics.lockedStablecoinValue}
        format={(v) => `$${v.toLocaleString()}`}
        accent="text-brand-emerald"
        icon="🔒"
        delay={0.08}
      />
      <MetricCard
        label="Open Disputes"
        value={metrics.openDisputeCount}
        accent="text-brand-red"
        icon="⚖️"
        delay={0.16}
      />
      <MetricCard
        label="Avg Resolution (hrs)"
        value={metrics.avgResolutionTimeHours}
        format={(v) => `${v.toFixed(1)}h`}
        accent="text-brand-amber"
        icon="⏱️"
        delay={0.24}
      />
      <div className="sm:col-span-2 lg:col-span-4">
        <TrustScoreHistogram distribution={metrics.trustScoreDistribution} />
      </div>
    </div>
  )
}
