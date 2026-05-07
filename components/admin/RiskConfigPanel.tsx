'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/shared/GlassCard'
import { AuthPrompt } from '@/components/shared/AuthPrompt'
import { authFetch, AuthError } from '@/lib/auth/authFetch'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RiskConfig {
  autoReleaseCutoff: number
  challengeWindowCutoff: number
  manualReviewCutoff: number
  challengeWindowSeconds: number
}

// ─── Slider ───────────────────────────────────────────────────────────────────

interface SliderFieldProps {
  label: string
  description: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  accent: string
  onChange: (v: number) => void
}

function SliderField({ label, description, value, min, max, step, format, accent, onChange }: SliderFieldProps) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-200">{label}</p>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
        <span className={`text-sm font-bold font-mono ${accent} min-w-[4rem] text-right`}>
          {format(value)}
        </span>
      </div>
      <div className="relative h-6 flex items-center">
        {/* Track background */}
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-[rgba(255,255,255,0.06)]" />
        {/* Filled track */}
        <div
          className={`absolute left-0 h-1.5 rounded-full transition-all duration-150`}
          style={{ width: `${pct}%`, background: accent.replace('text-', '').includes('brand') ? 'currentColor' : '#3B82F6' }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-6"
          style={{ zIndex: 2 }}
        />
        {/* Thumb */}
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white bg-slate-900 shadow-lg pointer-events-none transition-all duration-150"
          style={{ left: `calc(${pct}% - 8px)`, zIndex: 1 }}
        />
      </div>
    </div>
  )
}

// ─── RiskConfigPanel ──────────────────────────────────────────────────────────

export function RiskConfigPanel() {
  const [config, setConfig] = useState<RiskConfig>({
    autoReleaseCutoff: 80,
    challengeWindowCutoff: 50,
    manualReviewCutoff: 50,
    challengeWindowSeconds: 1800,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAuthError, setIsAuthError] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    authFetch('/api/admin/risk-config')
      .then((r) => r.json())
      .then((data) => {
        setConfig({
          autoReleaseCutoff: (data as RiskConfig).autoReleaseCutoff ?? 80,
          challengeWindowCutoff: (data as RiskConfig).challengeWindowCutoff ?? 50,
          manualReviewCutoff: (data as RiskConfig).manualReviewCutoff ?? 50,
          challengeWindowSeconds: (data as RiskConfig).challengeWindowSeconds ?? 1800,
        })
      })
      .catch((err) => {
        if (err instanceof AuthError) setIsAuthError(true)
        // else use defaults silently
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)
    setIsAuthError(false)
    setSaved(false)
    try {
      const res = await authFetch('/api/admin/risk-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const body = await res.json()
      if (!res.ok) throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      if (err instanceof AuthError) {
        setIsAuthError(true)
      } else {
        setError(err instanceof Error ? err.message : 'Failed to save config')
      }
    } finally {
      setSaving(false)
    }
  }

  function update(key: keyof RiskConfig) {
    return (v: number) => setConfig((prev) => ({ ...prev, [key]: v }))
  }

  if (loading) {
    return (
      <GlassCard className="p-6">
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-[rgba(255,255,255,0.04)] animate-pulse" />
          ))}
        </div>
      </GlassCard>
    )
  }

  if (isAuthError) {
    return <AuthPrompt message="Connect your wallet to configure risk thresholds." />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <GlassCard className="p-6 flex flex-col gap-6">
        <SliderField
          label="Auto-Release Cutoff"
          description="Trust scores at or above this threshold trigger automatic fund release"
          value={config.autoReleaseCutoff}
          min={50}
          max={100}
          step={1}
          format={(v) => `${v}`}
          accent="text-brand-emerald"
          onChange={update('autoReleaseCutoff')}
        />

        <div className="border-t border-[rgba(255,255,255,0.05)]" />

        <SliderField
          label="Challenge Window Cutoff"
          description="Trust scores at or above this threshold enter the challenge window period"
          value={config.challengeWindowCutoff}
          min={0}
          max={config.autoReleaseCutoff - 1}
          step={1}
          format={(v) => `${v}`}
          accent="text-brand-amber"
          onChange={update('challengeWindowCutoff')}
        />

        <div className="border-t border-[rgba(255,255,255,0.05)]" />

        <SliderField
          label="Challenge Window Duration"
          description="How long the seller has to raise a dispute after buyer marks paid"
          value={config.challengeWindowSeconds}
          min={300}
          max={86400}
          step={300}
          format={(v) => {
            const mins = Math.round(v / 60)
            return mins >= 60 ? `${(mins / 60).toFixed(1)}h` : `${mins}m`
          }}
          accent="text-brand-blue"
          onChange={update('challengeWindowSeconds')}
        />

        {/* Threshold summary */}
        <div className="rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-4 flex flex-col gap-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Routing Summary</p>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="text-brand-emerald">
              ≥{config.autoReleaseCutoff} → Auto-release
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-brand-amber">
              {config.challengeWindowCutoff}–{config.autoReleaseCutoff - 1} → Challenge window
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-brand-red">
              &lt;{config.challengeWindowCutoff} → Manual review
            </span>
          </div>
        </div>

        {isAuthError ? (
          <AuthPrompt message="Connect your wallet to save risk configuration." />
        ) : error ? (
          <p className="text-xs text-brand-red">{error}</p>
        ) : null}

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-brand-blue/20 border border-brand-blue/40 text-brand-blue text-sm font-semibold hover:bg-brand-blue/30 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Configuration'}
          </button>
          {saved && (
            <motion.span
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-brand-emerald"
            >
              ✓ Saved — changes take effect within 60 seconds
            </motion.span>
          )}
        </div>
      </GlassCard>
    </motion.div>
  )
}
