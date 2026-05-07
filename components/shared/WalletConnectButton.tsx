'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useSignMessage } from 'wagmi'
import { useEffect, useRef, useState } from 'react'
import { SiweMessage } from 'siwe'
import { motion, AnimatePresence } from 'framer-motion'
import { setStoredToken, clearStoredToken } from '@/lib/auth/authFetch'

const DEMO_WALLETS = [
  { label: 'Buyer', address: '0xBuyer1111111111111111111111111111111111', icon: '🛒', desc: 'Accept offers, upload proofs' },
  { label: 'Seller', address: '0xSeller222222222222222222222222222222222', icon: '💼', desc: 'Create offers, raise disputes' },
  { label: 'Resolver', address: '0xResolver33333333333333333333333333333', icon: '⚖️', desc: 'Adjudicate disputes' },
  { label: 'Admin', address: '0xAdmin4444444444444444444444444444444444', icon: '🔑', desc: 'Full platform access' },
]

function DemoLoginButton() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [loggedIn, setLoggedIn] = useState<{ label: string; icon: string } | null>(null)

  // Check localStorage for existing session
  useEffect(() => {
    const token = localStorage.getItem('appen_token')
    const role = localStorage.getItem('appen_demo_role')
    if (token && role) {
      const wallet = DEMO_WALLETS.find((w) => w.label === role)
      if (wallet) setLoggedIn({ label: wallet.label, icon: wallet.icon })
    }
  }, [])

  async function loginAs(wallet: typeof DEMO_WALLETS[0]) {
    setLoading(wallet.label)
    try {
      const message = `localhost:3000 wants you to sign in with your Ethereum account:\n${wallet.address}\n\nSign in to APPEN\n\nURI: http://localhost:3000\nVersion: 1\nChain ID: 1\nNonce: demo${Date.now()}\nIssued At: ${new Date().toISOString()}`
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature: '0xdemo' }),
      })
      if (res.ok) {
        const data = await res.json() as { token: string; user: { walletAddress: string } }
        // Store token and address in localStorage so authFetch sends it on every request
        setStoredToken(data.token)
        localStorage.setItem('appen_demo_role', wallet.label)
        localStorage.setItem('appen_demo_address', wallet.address)
        setLoggedIn({ label: wallet.label, icon: wallet.icon })
        setOpen(false)
        window.location.reload()
      }
    } catch { /* ignore */ } finally {
      setLoading(null)
    }
  }

  function logout() {
    clearStoredToken()
    localStorage.removeItem('appen_demo_role')
    localStorage.removeItem('appen_demo_address')
    setLoggedIn(null)
    window.location.reload()
  }

  if (loggedIn) {
    return (
      <div className="flex items-center gap-2">
        <span className="px-3 py-1.5 rounded-lg border border-brand-emerald/30 bg-brand-emerald/10 text-brand-emerald text-xs font-semibold flex items-center gap-1.5">
          <span>{loggedIn.icon}</span>
          {loggedIn.label}
        </span>
        <button onClick={logout} className="text-xs text-slate-500 hover:text-slate-300 transition-colors" title="Sign out">
          ✕
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-4 py-2 rounded-lg bg-brand-amber/20 border border-brand-amber/40 text-brand-amber text-sm font-semibold hover:bg-brand-amber/30 transition-colors flex items-center gap-1.5"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-brand-amber animate-pulse" />
        Demo Login
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-60 z-50 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(15,23,42,0.97)] backdrop-blur-xl shadow-2xl overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
                <p className="text-xs font-semibold text-slate-300">Sign in as demo user</p>
                <p className="text-[10px] text-slate-500 mt-0.5">No wallet or MetaMask needed</p>
              </div>
              {DEMO_WALLETS.map((wallet) => (
                <button
                  key={wallet.address}
                  onClick={() => loginAs(wallet)}
                  disabled={loading === wallet.label}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[rgba(255,255,255,0.05)] transition-colors text-left disabled:opacity-50 border-b border-[rgba(255,255,255,0.04)] last:border-0"
                >
                  <span className="text-xl flex-shrink-0">{wallet.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200">{wallet.label}</p>
                    <p className="text-[10px] text-slate-500">{wallet.desc}</p>
                  </div>
                  {loading === wallet.label ? (
                    <svg className="w-3.5 h-3.5 animate-spin text-brand-blue flex-shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : (
                    <span className="text-slate-600 text-xs">→</span>
                  )}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main button ──────────────────────────────────────────────────────────────
export function WalletConnectButton() {
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

  // In demo mode — show demo login dropdown, no MetaMask needed
  if (isDemoMode) {
    return <DemoLoginButton />
  }

  // Production — full RainbowKit + SIWE flow
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const connected = mounted && account && chain
        return (
          <div
            {...(!mounted && {
              'aria-hidden': true,
              style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' },
            })}
          >
            {!connected ? (
              <button
                onClick={openConnectModal}
                className="px-4 py-2 rounded-lg bg-brand-blue hover:bg-brand-blue/80 text-white text-sm font-semibold transition-colors"
              >
                Connect Wallet
              </button>
            ) : chain.unsupported ? (
              <button
                onClick={openChainModal}
                className="px-4 py-2 rounded-lg bg-brand-red hover:bg-brand-red/80 text-white text-sm font-semibold transition-colors"
              >
                Wrong Network
              </button>
            ) : (
              <SiweSignInButton
                address={account.address}
                chainId={chain.id}
                displayName={account.displayName}
                chainIconUrl={chain.hasIcon ? chain.iconUrl : undefined}
                chainName={chain.name}
                onOpenAccount={openAccountModal}
              />
            )}
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}

// ─── SIWE sign-in (production only) ──────────────────────────────────────────
function SiweSignInButton({
  address, chainId, displayName, chainIconUrl, chainName, onOpenAccount,
}: {
  address: string; chainId: number; displayName: string
  chainIconUrl?: string; chainName?: string; onOpenAccount: () => void
}) {
  const [signedIn, setSignedIn] = useState(false)
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasAttempted = useRef(false)
  const { signMessageAsync } = useSignMessage()

  useEffect(() => {
    if (!hasAttempted.current && !signedIn) {
      hasAttempted.current = true
      handleSignIn()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address])

  async function handleSignIn() {
    setSigning(true)
    setError(null)
    try {
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in to APPEN — Adaptive Proof-of-Payment Escrow Network',
        uri: window.location.origin,
        version: '1',
        chainId,
        nonce: Math.random().toString(36).slice(2),
        issuedAt: new Date().toISOString(),
      })
      const messageStr = message.prepareMessage()
      const signature = await signMessageAsync({ message: messageStr })
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageStr, signature }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Sign-in failed')
      }
      setSignedIn(true)
      window.location.reload()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed'
      if (msg.toLowerCase().includes('rejected') || msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('user rejected')) {
        setError(null)
      } else {
        setError(msg)
      }
      hasAttempted.current = false
    } finally {
      setSigning(false)
    }
  }

  if (signedIn) {
    return (
      <button onClick={onOpenAccount} className="px-4 py-2 rounded-lg border border-[rgba(255,255,255,0.08)] bg-surface-800 hover:bg-surface-700 text-slate-100 text-sm font-semibold transition-colors flex items-center gap-2">
        {chainIconUrl && <img src={chainIconUrl} alt={chainName} className="w-4 h-4 rounded-full" />}
        {displayName}
      </button>
    )
  }

  if (signing) {
    return (
      <button disabled className="px-4 py-2 rounded-lg bg-brand-blue/50 text-white text-sm font-semibold flex items-center gap-2 cursor-wait">
        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Signing in…
      </button>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={handleSignIn} className="px-4 py-2 rounded-lg bg-brand-violet hover:bg-brand-violet/80 text-white text-sm font-semibold transition-colors">
        Sign In
      </button>
      {error && <p className="text-xs text-brand-red max-w-[180px] text-right">{error}</p>}
    </div>
  )
}
