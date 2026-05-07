'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface TxLinkProps {
  txHash: string
  chainId?: number
  label?: string
  autoConfetti?: boolean
}

type TxStatus = 'pending' | 'confirmed' | 'failed'

function getExplorerUrl(txHash: string, chainId: number) {
  if (chainId === 84532) return `https://sepolia.basescan.org/tx/${txHash}`
  if (chainId === 80001) return `https://mumbai.polygonscan.com/tx/${txHash}`
  return `https://sepolia.basescan.org/tx/${txHash}`
}

function shortHash(hash: string) {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`
}

export function TxLink({ txHash, chainId = 84532, label, autoConfetti = false }: TxLinkProps) {
  const [status, setStatus] = useState<TxStatus>('pending')
  const [confirmations, setConfirmations] = useState(0)
  const [copied, setCopied] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const attemptsRef = useRef(0)

  // Poll for confirmation (mock in DEMO_MODE — confirms after 3s)
  useEffect(() => {
    if (!txHash || txHash.startsWith('0x000000')) {
      // Mock tx — simulate confirmation
      const t = setTimeout(() => {
        setStatus('confirmed')
        setConfirmations(3)
        if (autoConfetti) triggerConfetti()
      }, 3000)
      return () => clearTimeout(t)
    }

    pollRef.current = setInterval(async () => {
      attemptsRef.current++
      if (attemptsRef.current > 10) {
        clearInterval(pollRef.current!)
        return
      }
      try {
        const res = await fetch(`/api/tx-status?hash=${txHash}&chainId=${chainId}`)
        if (res.ok) {
          const data = await res.json() as { status: TxStatus; confirmations: number }
          setStatus(data.status)
          setConfirmations(data.confirmations)
          if (data.status === 'confirmed') {
            clearInterval(pollRef.current!)
            if (autoConfetti) triggerConfetti()
          }
        }
      } catch { /* ignore */ }
    }, 3000)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [txHash, chainId, autoConfetti])

  async function handleCopy() {
    await navigator.clipboard.writeText(txHash)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const statusConfig = {
    pending: { dot: 'bg-brand-amber animate-pulse', text: 'Confirming…', color: 'text-brand-amber' },
    confirmed: { dot: 'bg-brand-emerald', text: `Confirmed ✓${confirmations > 0 ? ` (${confirmations}x)` : ''}`, color: 'text-brand-emerald' },
    failed: { dot: 'bg-brand-red', text: 'Failed', color: 'text-brand-red' },
  }[status]

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(99,102,241,0.3)] bg-[rgba(99,102,241,0.08)] backdrop-blur-sm"
    >
      {/* Status dot */}
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusConfig.dot}`} />

      {/* Label */}
      {label && <span className="text-xs text-slate-400">{label}</span>}

      {/* Hash */}
      <a
        href={getExplorerUrl(txHash, chainId)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-mono text-brand-blue hover:text-brand-blue/80 transition-colors"
        style={{ fontFamily: 'JetBrains Mono, monospace' }}
      >
        {shortHash(txHash)}
      </a>

      {/* External link icon */}
      <a
        href={getExplorerUrl(txHash, chainId)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-slate-500 hover:text-slate-300 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>

      {/* Copy button */}
      <div className="relative">
        <button
          onClick={handleCopy}
          className="text-slate-500 hover:text-slate-300 transition-colors"
          title="Copy full hash"
        >
          {copied ? (
            <svg className="w-3 h-3 text-brand-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
        <AnimatePresence>
          {copied && (
            <motion.span
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] bg-surface-800 border border-[rgba(255,255,255,0.08)] text-slate-300 px-2 py-0.5 rounded whitespace-nowrap"
            >
              Copied!
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Status text */}
      <span className={`text-xs font-medium ${statusConfig.color}`}>{statusConfig.text}</span>
    </motion.div>
  )
}

// Canvas confetti burst (lazy-loaded)
async function triggerConfetti() {
  try {
    const confetti = (await import('canvas-confetti')).default
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'],
    })
  } catch { /* canvas-confetti not installed — skip */ }
}
