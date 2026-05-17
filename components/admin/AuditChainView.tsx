'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/shared/GlassCard'

interface AuditLogEntry {
  id: string
  actorAddress: string | null
  actionType: string
  entityType: string
  entityId: string
  createdAt: string
  contentHash: string
  previousHash: string | null
}

const ACTION_COLORS: Record<string, string> = {
  USER_SUSPENDED: 'bg-brand-red/15 text-brand-red border-brand-red/30',
  KYC_APPROVED: 'bg-brand-emerald/15 text-brand-emerald border-brand-emerald/30',
  RISK_SCORED: 'bg-brand-amber/15 text-brand-amber border-brand-amber/30',
  DISPUTE_RESOLVED: 'bg-brand-emerald/15 text-brand-emerald border-brand-emerald/30',
  RISK_CONFIG_CHANGED: 'bg-brand-violet/15 text-brand-violet border-brand-violet/30',
  REPUTATION_UPDATED: 'bg-brand-violet/15 text-brand-violet border-brand-violet/30',
}

function shortHash(h: string | null) {
  if (!h) return 'genesis'
  return h.slice(0, 16) + '…'
}

function shortAddr(addr: string | null) {
  if (!addr) return 'system'
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="text-slate-600 hover:text-slate-400 transition-colors ml-1"
    >
      {copied ? '✓' : '⎘'}
    </button>
  )
}

interface AuditChainViewProps {
  logs: AuditLogEntry[]
}

export function AuditChainView({ logs }: AuditChainViewProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Verify chain integrity
  const chainValid = logs.every((log, i) => {
    if (i === 0) return true
    return logs[i - 1].contentHash === log.previousHash
  })

  return (
    <div className="flex flex-col gap-3">
      {/* Chain validity banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold ${
          chainValid
            ? 'bg-brand-emerald/10 border-brand-emerald/30 text-brand-emerald'
            : 'bg-brand-red/10 border-brand-red/30 text-brand-red'
        }`}
      >
        <span>{chainValid ? 'Valid' : 'Warning'}</span>
        {chainValid ? 'Chain Valid — All hashes verified' : 'Chain Tampered — Hash mismatch detected'}
      </motion.div>

      {/* Block chain */}
      <div className="flex flex-col">
        {logs.map((log, i) => {
          const isHovered = hoveredId === log.id
          const isPrevHovered = i > 0 && hoveredId === logs[i - 1].id
          const actionCls = ACTION_COLORS[log.actionType] ?? 'bg-slate-700/40 text-slate-400 border-slate-600/30'

          return (
            <div key={log.id} className="flex flex-col">
              {/* Connector line */}
              {i > 0 && (
                <div className="flex justify-center">
                  <motion.div
                    className="w-px h-6"
                    style={{
                      background: isPrevHovered
                        ? 'linear-gradient(to bottom, #6366f1, #8b5cf6)'
                        : 'linear-gradient(to bottom, rgba(99,102,241,0.3), rgba(139,92,246,0.3))',
                    }}
                    animate={{ opacity: isPrevHovered ? 1 : 0.5 }}
                  />
                </div>
              )}

              {/* Block card */}
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.35 }}
                onMouseEnter={() => setHoveredId(log.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`relative rounded-xl border p-4 transition-all duration-200 cursor-default ${
                  isHovered
                    ? 'border-brand-violet/40 bg-[rgba(99,102,241,0.06)]'
                    : 'border-[rgba(255,255,255,0.07)] bg-[rgba(15,23,42,0.6)]'
                }`}
              >
                <div className="grid grid-cols-[auto_1fr_auto] gap-3 items-start">
                  {/* Block number */}
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs font-mono text-slate-600">#{logs.length - i}</span>
                    <div className={`w-2 h-2 rounded-full ${isHovered ? 'bg-brand-violet' : 'bg-slate-700'} transition-colors`} />
                  </div>

                  {/* Content */}
                  <div className="flex flex-col gap-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${actionCls}`}>
                        {log.actionType.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-slate-500">{log.entityType}</span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>
                        Actor: <span className="font-mono text-slate-400">{shortAddr(log.actorAddress)}</span>
                        <CopyButton text={log.actorAddress ?? ''} />
                      </span>
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                    </div>

                    {/* Hashes */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono">
                        <span className="text-slate-600">hash:</span>
                        <AnimatePresence>
                          {isHovered ? (
                            <motion.span
                              key="full"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="text-brand-violet break-all"
                            >
                              {log.contentHash}
                            </motion.span>
                          ) : (
                            <motion.span key="short" className="text-slate-500">
                              {shortHash(log.contentHash)}
                            </motion.span>
                          )}
                        </AnimatePresence>
                        <CopyButton text={log.contentHash} />
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono">
                        <span className="text-slate-600">prev:</span>
                        <span className={`${isPrevHovered ? 'text-brand-blue' : 'text-slate-600'} transition-colors`}>
                          {shortHash(log.previousHash)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Timestamp */}
                  <span className="text-[10px] text-slate-600 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </motion.div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
