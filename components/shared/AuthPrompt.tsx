'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { GlassCard } from './GlassCard'
import { setStoredToken } from '@/lib/auth/authFetch'

const DEMO_WALLETS = [
  { label: 'Buyer', address: '0xBuyer1111111111111111111111111111111111', icon: '🛒' },
  { label: 'Seller', address: '0xSeller222222222222222222222222222222222', icon: '💼' },
  { label: 'Resolver', address: '0xResolver33333333333333333333333333333', icon: '⚖️' },
  { label: 'Admin', address: '0xAdmin4444444444444444444444444444444444', icon: '🔑' },
]

interface AuthPromptProps {
  message?: string
}

export function AuthPrompt({ message = 'Sign in to access this page.' }: AuthPromptProps) {
  const [loading, setLoading] = useState<string | null>(null)

  async function loginAs(wallet: typeof DEMO_WALLETS[0]) {
    setLoading(wallet.label)
    try {
      const msg = `localhost:3000 wants you to sign in with your Ethereum account:\n${wallet.address}\n\nSign in to APPEN\n\nURI: http://localhost:3000\nVersion: 1\nChain ID: 1\nNonce: demo${Date.now()}\nIssued At: ${new Date().toISOString()}`
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, signature: '0xdemo' }),
      })
      if (res.ok) {
        const data = await res.json() as { token: string }
        setStoredToken(data.token)
        localStorage.setItem('appen_demo_role', wallet.label)
        window.location.reload()
      }
    } catch { /* ignore */ } finally {
      setLoading(null)
    }
  }

  return (
    <GlassCard className="p-8 flex flex-col items-center gap-5 text-center border-brand-amber/20">
      <div className="w-12 h-12 rounded-full bg-brand-amber/10 border border-brand-amber/20 flex items-center justify-center text-2xl">
        🔑
      </div>
      <div>
        <p className="text-slate-200 font-semibold">Sign In Required</p>
        <p className="text-slate-400 text-sm mt-1 max-w-xs">{message}</p>
      </div>

      <div className="w-full max-w-xs flex flex-col gap-2">
        <p className="text-xs text-slate-500 mb-1">Choose a demo role to continue:</p>
        {DEMO_WALLETS.map((wallet) => (
          <motion.button
            key={wallet.address}
            onClick={() => loginAs(wallet)}
            disabled={loading === wallet.label}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] hover:border-brand-amber/30 transition-all text-left disabled:opacity-50"
          >
            <span className="text-lg">{wallet.icon}</span>
            <span className="text-sm font-medium text-slate-200 flex-1">{wallet.label}</span>
            {loading === wallet.label ? (
              <svg className="w-3.5 h-3.5 animate-spin text-brand-amber" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <span className="text-slate-600 text-xs">→</span>
            )}
          </motion.button>
        ))}
      </div>
    </GlassCard>
  )
}
