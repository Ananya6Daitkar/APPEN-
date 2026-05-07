'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

const STABLECOINS = ['', 'USDC', 'USDT']
const PAYMENT_RAILS = ['', 'bank_transfer', 'mobile_money', 'wire_transfer', 'cash_deposit']
const FIAT_CURRENCIES = ['', 'USD', 'EUR', 'GBP', 'NGN', 'KES', 'GHS', 'ZAR', 'PHP', 'INR']

const RAIL_LABELS: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  mobile_money: 'Mobile Money',
  wire_transfer: 'Wire Transfer',
  cash_deposit: 'Cash Deposit',
}

export function OfferFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const stablecoin = searchParams.get('stablecoin') ?? ''
  const rail = searchParams.get('rail') ?? ''
  const fiatCurrency = searchParams.get('fiatCurrency') ?? ''

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('page')
      router.push(`/marketplace?${params.toString()}`)
    },
    [router, searchParams]
  )

  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={stablecoin}
        onChange={(e) => updateParam('stablecoin', e.target.value)}
        className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(15,23,42,0.7)] px-3 py-2 text-sm text-slate-200 backdrop-blur-md focus:border-brand-blue/50 focus:outline-none"
      >
        <option value="">All Stablecoins</option>
        {STABLECOINS.filter(Boolean).map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <select
        value={rail}
        onChange={(e) => updateParam('rail', e.target.value)}
        className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(15,23,42,0.7)] px-3 py-2 text-sm text-slate-200 backdrop-blur-md focus:border-brand-blue/50 focus:outline-none"
      >
        <option value="">All Payment Rails</option>
        {PAYMENT_RAILS.filter(Boolean).map((r) => (
          <option key={r} value={r}>{RAIL_LABELS[r] ?? r}</option>
        ))}
      </select>

      <select
        value={fiatCurrency}
        onChange={(e) => updateParam('fiatCurrency', e.target.value)}
        className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(15,23,42,0.7)] px-3 py-2 text-sm text-slate-200 backdrop-blur-md focus:border-brand-blue/50 focus:outline-none"
      >
        <option value="">All Currencies</option>
        {FIAT_CURRENCIES.filter(Boolean).map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </div>
  )
}
