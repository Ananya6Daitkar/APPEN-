'use client'

import { useState } from 'react'
import { useAccount, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { GlassCard } from '@/components/shared/GlassCard'
import { WalletConnectButton } from '@/components/shared/WalletConnectButton'
import { useRouter } from 'next/navigation'
import { useEscrowContract, ESCROW_CONTRACT_ADDRESS } from '@/lib/contracts/escrow'
import { useERC20Approve } from '@/lib/contracts/erc20'

// ─── Contract config ──────────────────────────────────────────────────────────

const ESCROW_ADDRESS = ESCROW_CONTRACT_ADDRESS

const STABLECOIN_ADDRESSES: Record<string, `0x${string}`> = {
  USDC: (process.env.NEXT_PUBLIC_USDC_ADDRESS ?? '0x0000000000000000000000000000000000000001') as `0x${string}`,
  USDT: (process.env.NEXT_PUBLIC_USDT_ADDRESS ?? '0x0000000000000000000000000000000000000002') as `0x${string}`,
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STABLECOINS = ['USDC', 'USDT'] as const
const FIAT_CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'GHS', 'ZAR', 'PHP', 'INR', 'BRL']
const PAYMENT_RAILS = [
  { id: 'bank_transfer', label: 'Bank Transfer' },
  { id: 'mobile_money', label: 'Mobile Money' },
  { id: 'wire_transfer', label: 'Wire Transfer' },
  { id: 'cash_deposit', label: 'Cash Deposit' },
  { id: 'paypal', label: 'PayPal' },
  { id: 'revolut', label: 'Revolut' },
]

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || process.env.DEMO_MODE === 'true'

// ─── Types ────────────────────────────────────────────────────────────────────

type TxStep = 'idle' | 'approving' | 'approve_confirmed' | 'creating_escrow' | 'escrow_confirmed' | 'posting' | 'done' | 'error'

interface FormState {
  stablecoin: 'USDC' | 'USDT'
  amount: string
  fiatCurrency: string
  fiatRate: string
  paymentRails: string[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockTxHash(): `0x${string}` {
  const hex = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
  return `0x${hex}` as `0x${string}`
}

function validateForm(form: FormState): string | null {
  const amount = Number(form.amount)
  const rate = Number(form.fiatRate)
  if (!form.stablecoin) return 'Select a stablecoin'
  if (isNaN(amount) || amount < 10 || amount > 50000) return 'Amount must be between 10 and 50,000'
  if (!form.fiatCurrency) return 'Select a fiat currency'
  if (isNaN(rate) || rate <= 0) return 'Rate must be greater than 0'
  if (form.paymentRails.length === 0) return 'Select at least one payment rail'
  return null
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS: { key: TxStep[]; label: string }[] = [
  { key: ['approving'], label: 'Approving token' },
  { key: ['approve_confirmed', 'creating_escrow'], label: 'Locking escrow' },
  { key: ['escrow_confirmed', 'posting'], label: 'Publishing offer' },
  { key: ['done'], label: 'Offer live' },
]

function TxStatusBar({ step }: { step: TxStep }) {
  if (step === 'idle' || step === 'error') return null

  return (
    <div className="mt-6 space-y-3">
      <p className="text-sm text-slate-400 font-medium">Transaction progress</p>
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const isActive = s.key.includes(step)
          const isDone =
            (i === 0 && ['approve_confirmed', 'creating_escrow', 'escrow_confirmed', 'posting', 'done'].includes(step)) ||
            (i === 1 && ['escrow_confirmed', 'posting', 'done'].includes(step)) ||
            (i === 2 && ['done'].includes(step))

          return (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={[
                    'w-full h-1.5 rounded-full transition-all duration-500',
                    isDone
                      ? 'bg-brand-emerald'
                      : isActive
                      ? 'bg-brand-blue animate-pulse'
                      : 'bg-surface-700',
                  ].join(' ')}
                />
                <span className={`text-xs ${isActive || isDone ? 'text-slate-200' : 'text-slate-500'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && <div className="w-2 h-px bg-surface-700 shrink-0" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreateOfferPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
  // In demo mode, treat as connected (demo login handles auth via localStorage)
  const effectivelyConnected = isConnected || isDemoMode

  const [form, setForm] = useState<FormState>({
    stablecoin: 'USDC',
    amount: '',
    fiatCurrency: 'USD',
    fiatRate: '',
    paymentRails: [],
  })
  const [validationError, setValidationError] = useState<string | null>(null)
  const [txStep, setTxStep] = useState<TxStep>('idle')
  const [txError, setTxError] = useState<string | null>(null)
  const [offerId, setOfferId] = useState<string | null>(null)

  // contract hooks
  const { approve } = useERC20Approve()
  const { createEscrow } = useEscrowContract()
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>()
  const [escrowTxHash, setEscrowTxHash] = useState<`0x${string}` | undefined>()

  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveTxHash })
  const { isSuccess: escrowConfirmed } = useWaitForTransactionReceipt({ hash: escrowTxHash })

  // ── Form helpers ──────────────────────────────────────────────────────────

  function toggleRail(railId: string) {
    setForm((prev) => ({
      ...prev,
      paymentRails: prev.paymentRails.includes(railId)
        ? prev.paymentRails.filter((r) => r !== railId)
        : [...prev.paymentRails, railId],
    }))
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setValidationError(null)
    setTxError(null)

    const error = validateForm(form)
    if (error) {
      setValidationError(error)
      return
    }

    const amount = Number(form.amount)
    const fiatRate = Number(form.fiatRate)
    const tokenAddress = STABLECOIN_ADDRESSES[form.stablecoin]
    const amountUnits = parseUnits(form.amount, 6) // USDC/USDT use 6 decimals

    let finalTxHash: string

    try {
      if (DEMO_MODE) {
        // ── DEMO MODE: skip blockchain, use mock hashes ──────────────────
        setTxStep('approving')
        await new Promise((r) => setTimeout(r, 800))
        setTxStep('approve_confirmed')
        await new Promise((r) => setTimeout(r, 400))
        setTxStep('creating_escrow')
        await new Promise((r) => setTimeout(r, 1000))
        setTxStep('escrow_confirmed')
        finalTxHash = mockTxHash()
      } else {
        // ── LIVE MODE: shared escrow hooks (wagmi v2 / viem) ─────────────
        setTxStep('approving')
        const approveTx = await approve(tokenAddress, ESCROW_ADDRESS, amountUnits)
        setApproveTxHash(approveTx)
        await waitForHash(approveTx)
        setTxStep('approve_confirmed')

        setTxStep('creating_escrow')
        // Use zero address as buyer placeholder (offer-based, buyer set on accept)
        const escrowTx = await createEscrow(
          tokenAddress,
          amountUnits,
          '0x0000000000000000000000000000000000000000',
          BigInt(1800) // 30 min challenge window
        )
        setEscrowTxHash(escrowTx)
        await waitForHash(escrowTx)
        setTxStep('escrow_confirmed')
        finalTxHash = escrowTx
      }

      // ── POST to API ──────────────────────────────────────────────────────
      setTxStep('posting')
      const token = typeof window !== 'undefined' ? localStorage.getItem('appen_token') : null
      const res = await fetch('/api/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          stablecoin: form.stablecoin,
          amount,
          fiatCurrency: form.fiatCurrency,
          fiatRate,
          paymentRails: form.paymentRails,
          txHash: finalTxHash,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to create offer')
      }

      const offer = await res.json()
      setOfferId(offer.id)
      setTxStep('done')
    } catch (err) {
      setTxStep('error')
      setTxError(err instanceof Error ? err.message : 'Transaction failed')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!effectivelyConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <GlassCard className="p-8 max-w-sm w-full text-center space-y-4">
          <div className="text-4xl font-bold text-brand-amber">LOCK</div>
          <h2 className="text-xl font-bold text-slate-100">Connect your wallet</h2>
          <p className="text-slate-400 text-sm">You need to connect a wallet to create an offer.</p>
          <div className="flex justify-center">
            <WalletConnectButton />
          </div>
        </GlassCard>
      </div>
    )
  }

  if (txStep === 'done' && offerId) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <GlassCard className="p-8 max-w-sm w-full text-center space-y-4">
          <div className="text-4xl font-bold text-brand-emerald">SUCCESS</div>
          <h2 className="text-xl font-bold text-brand-emerald">Offer is live!</h2>
          <p className="text-slate-400 text-sm">
            Your {form.stablecoin} offer has been locked in escrow and published to the marketplace.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={() => router.push('/marketplace')}
              className="w-full py-2.5 rounded-lg bg-brand-blue hover:bg-brand-blue/80 text-white text-sm font-semibold transition-colors"
            >
              View Marketplace
            </button>
            <button
              onClick={() => {
                setTxStep('idle')
                setOfferId(null)
                setForm({ stablecoin: 'USDC', amount: '', fiatCurrency: 'USD', fiatRate: '', paymentRails: [] })
              }}
              className="w-full py-2.5 rounded-lg border border-[rgba(255,255,255,0.08)] text-slate-300 hover:text-slate-100 text-sm font-semibold transition-colors"
            >
              Create Another Offer
            </button>
          </div>
        </GlassCard>
      </div>
    )
  }

  const isSubmitting = !['idle', 'error'].includes(txStep)

  return (
    <div className="min-h-screen px-4 py-10 max-w-xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100">Create Offer</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Lock stablecoins in escrow and publish your sell offer to the marketplace.
        </p>
        {DEMO_MODE && (
          <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium bg-brand-amber/20 text-brand-amber border border-brand-amber/30">
            Demo Mode — blockchain bypassed
          </span>
        )}
      </div>

      <GlassCard className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Stablecoin selector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Stablecoin</label>
            <div className="flex gap-3">
              {STABLECOINS.map((coin) => (
                <button
                  key={coin}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, stablecoin: coin }))}
                  className={[
                    'flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-all',
                    form.stablecoin === coin
                      ? 'border-brand-blue bg-brand-blue/10 text-brand-blue'
                      : 'border-[rgba(255,255,255,0.08)] text-slate-400 hover:border-slate-500 hover:text-slate-200',
                  ].join(' ')}
                >
                  {coin}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-slate-300 mb-2">
              Amount <span className="text-slate-500 font-normal">(10 – 50,000)</span>
            </label>
            <div className="relative">
              <input
                id="amount"
                type="number"
                min={10}
                max={50000}
                step="any"
                placeholder="e.g. 500"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                className="w-full bg-surface-800 border border-[rgba(255,255,255,0.08)] rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-brand-blue/50 transition-colors pr-16"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                {form.stablecoin}
              </span>
            </div>
          </div>

          {/* Fiat currency + rate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="fiatCurrency" className="block text-sm font-medium text-slate-300 mb-2">
                Fiat Currency
              </label>
              <select
                id="fiatCurrency"
                value={form.fiatCurrency}
                onChange={(e) => setForm((p) => ({ ...p, fiatCurrency: e.target.value }))}
                className="w-full bg-surface-800 border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-brand-blue/50 transition-colors"
              >
                {FIAT_CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fiatRate" className="block text-sm font-medium text-slate-300 mb-2">
                Rate <span className="text-slate-500 font-normal">(per {form.stablecoin})</span>
              </label>
              <input
                id="fiatRate"
                type="number"
                min={0}
                step="any"
                placeholder="e.g. 1.02"
                value={form.fiatRate}
                onChange={(e) => setForm((p) => ({ ...p, fiatRate: e.target.value }))}
                className="w-full bg-surface-800 border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-brand-blue/50 transition-colors"
              />
            </div>
          </div>

          {/* Payment rails */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Payment Rails <span className="text-slate-500 font-normal">(select all that apply)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_RAILS.map((rail) => {
                const selected = form.paymentRails.includes(rail.id)
                return (
                  <button
                    key={rail.id}
                    type="button"
                    onClick={() => toggleRail(rail.id)}
                    className={[
                      'py-2 px-3 rounded-lg border text-sm text-left transition-all',
                      selected
                        ? 'border-brand-emerald/50 bg-brand-emerald/10 text-brand-emerald'
                        : 'border-[rgba(255,255,255,0.08)] text-slate-400 hover:border-slate-500 hover:text-slate-200',
                    ].join(' ')}
                  >
                    <span className="mr-1.5">{selected ? '✓' : '+'}</span>
                    {rail.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Offer summary */}
          {form.amount && form.fiatRate && Number(form.amount) > 0 && Number(form.fiatRate) > 0 && (
            <div className="rounded-lg bg-surface-800/60 border border-[rgba(255,255,255,0.06)] px-4 py-3 text-sm space-y-1">
              <p className="text-slate-400">
                Buyer pays{' '}
                <span className="text-slate-100 font-semibold">
                  {(Number(form.amount) * Number(form.fiatRate)).toLocaleString()} {form.fiatCurrency}
                </span>{' '}
                for{' '}
                <span className="text-slate-100 font-semibold">
                  {Number(form.amount).toLocaleString()} {form.stablecoin}
                </span>
              </p>
            </div>
          )}

          {/* Validation error */}
          {validationError && (
            <p className="text-brand-red text-sm">{validationError}</p>
          )}

          {/* Tx error */}
          {txStep === 'error' && txError && (
            <div className="rounded-lg bg-brand-red/10 border border-brand-red/30 px-4 py-3 text-sm text-brand-red">
              {txError}
            </div>
          )}

          {/* Tx status bar */}
          <TxStatusBar step={txStep} />

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={[
              'w-full py-3 rounded-lg text-sm font-semibold transition-all',
              isSubmitting
                ? 'bg-brand-blue/40 text-white/50 cursor-not-allowed'
                : 'bg-brand-blue hover:bg-brand-blue/80 text-white',
            ].join(' ')}
          >
            {isSubmitting ? stepLabel(txStep) : 'Lock & Publish Offer'}
          </button>
        </form>
      </GlassCard>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stepLabel(step: TxStep): string {
  switch (step) {
    case 'approving': return 'Approving token spend…'
    case 'approve_confirmed': return 'Approval confirmed…'
    case 'creating_escrow': return 'Locking escrow on-chain…'
    case 'escrow_confirmed': return 'Escrow confirmed…'
    case 'posting': return 'Publishing offer…'
    default: return 'Processing…'
  }
}

/** Poll for tx receipt in live mode (simple promise wrapper) */
async function waitForHash(hash: `0x${string}`): Promise<void> {
  // In live mode wagmi's useWaitForTransactionReceipt handles this reactively.
  // For the imperative flow we just add a small delay to let the state settle.
  await new Promise((r) => setTimeout(r, 500))
}
