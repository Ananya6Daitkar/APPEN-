'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/shared/GlassCard'

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

interface ProofStatusProps {
  ocrResult: OCRResult
  riskScore?: RiskScore | null
}

const OCR_FIELD_LABELS: Record<string, string> = {
  amount: 'Amount',
  currency: 'Currency',
  timestamp: 'Timestamp',
  transactionId: 'Transaction ID',
  payerName: 'Payer Name',
  payeeName: 'Payee Name',
  paymentRail: 'Payment Rail',
  bankName: 'Bank / Provider',
}

const RECOMMENDATION_CONFIG = {
  auto_release: {
    label: 'Auto Release',
    color: 'bg-brand-emerald/20 text-brand-emerald border-brand-emerald/30',
    icon: '✓',
  },
  challenge_window: {
    label: 'Challenge Window',
    color: 'bg-brand-amber/20 text-brand-amber border-brand-amber/30',
    icon: '⏱',
  },
  manual_review: {
    label: 'Manual Review',
    color: 'bg-brand-violet/20 text-brand-violet border-brand-violet/30',
    icon: '👁',
  },
}

const VERIFICATION_CONFIG = {
  VERIFIED: { label: 'Verified', color: 'text-brand-emerald' },
  NEEDS_REVIEW: { label: 'Needs Review', color: 'text-brand-amber' },
  SUSPICIOUS: { label: 'Suspicious', color: 'text-brand-red' },
}

function ConfidenceBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100)
  const color =
    pct >= 80 ? 'bg-brand-emerald' : pct >= 50 ? 'bg-brand-amber' : 'bg-brand-red'

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400 w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-surface-700 overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', color)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className={cn('text-xs font-mono w-8 text-right shrink-0',
        pct >= 80 ? 'text-brand-emerald' : pct >= 50 ? 'text-brand-amber' : 'text-brand-red'
      )}>
        {pct}%
      </span>
    </div>
  )
}

function TrustScoreRing({ score }: { score: number }) {
  const size = 80
  const r = 32
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 80 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444'

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-slate-100">{score}</span>
        <span className="text-[9px] text-slate-500 uppercase tracking-wide">Trust</span>
      </div>
    </div>
  )
}

export function ProofStatus({ ocrResult, riskScore }: ProofStatusProps) {
  const verif = VERIFICATION_CONFIG[ocrResult.verificationStatus]
  const rec = riskScore ? RECOMMENDATION_CONFIG[riskScore.recommendation] : null

  const ocrFields = Object.entries(OCR_FIELD_LABELS).map(([key, label]) => ({
    key,
    label,
    value: ocrResult[key as keyof OCRResult] as string | number | null,
    confidence: ocrResult.fieldConfidences[key] ?? 0,
  }))

  return (
    <GlassCard className="p-5 flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-300">Proof Verification</h3>
          <p className={cn('text-xs mt-0.5 font-medium', verif.color)}>{verif.label}</p>
        </div>
        <div className="flex items-center gap-3">
          {riskScore && <TrustScoreRing score={riskScore.trustScore} />}
          {rec && (
            <span className={cn('text-xs px-2.5 py-1 rounded-full border font-semibold', rec.color)}>
              {rec.icon} {rec.label}
            </span>
          )}
        </div>
      </div>

      {/* OCR extracted fields */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Extracted Fields</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {ocrFields.map(({ key, label, value, confidence }) => (
            <div key={key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{label}</span>
                <span className="text-xs text-slate-300 font-mono truncate max-w-[120px]">
                  {value !== null && value !== undefined ? String(value) : '—'}
                </span>
              </div>
              <ConfidenceBar value={confidence} label="" />
            </div>
          ))}
        </div>
      </div>

      {/* Overall confidence */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">Overall OCR Confidence</span>
          <span className="text-xs font-mono text-slate-300">{Math.round(ocrResult.overallConfidence * 100)}%</span>
        </div>
        <div className="h-2 rounded-full bg-surface-700 overflow-hidden">
          <motion.div
            className={cn('h-full rounded-full',
              ocrResult.overallConfidence >= 0.8 ? 'bg-brand-emerald' :
              ocrResult.overallConfidence >= 0.5 ? 'bg-brand-amber' : 'bg-brand-red'
            )}
            initial={{ width: 0 }}
            animate={{ width: `${ocrResult.overallConfidence * 100}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Risk sub-scores */}
      {riskScore && Object.keys(riskScore.subScores).length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Risk Signals</p>
          <div className="flex flex-col gap-2">
            {Object.entries(riskScore.subScores).map(([key, val]) => (
              <ConfidenceBar
                key={key}
                value={val / 100}
                label={key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              />
            ))}
          </div>
        </div>
      )}

      {/* Fraud flags */}
      {riskScore && riskScore.fraudFlags.length > 0 && (
        <div className="p-3 rounded-lg bg-brand-red/10 border border-brand-red/20">
          <p className="text-xs font-semibold text-brand-red mb-2">Fraud Flags Detected</p>
          <ul className="flex flex-col gap-1">
            {riskScore.fraudFlags.map((flag, i) => (
              <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                <span className="text-brand-red mt-0.5">•</span>
                <span>{flag.type}{flag.description ? `: ${flag.description}` : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Explanation */}
      {ocrResult.explanation && (
        <p className="text-xs text-slate-400 leading-relaxed border-t border-[rgba(255,255,255,0.06)] pt-3">
          {ocrResult.explanation}
        </p>
      )}
    </GlassCard>
  )
}
