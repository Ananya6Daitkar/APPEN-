'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { OfferCard } from './OfferCard'

interface Offer {
  id: string
  stablecoin: string
  amount: string
  fiatCurrency: string
  fiatRate: string
  paymentRails: string[]
  seller: {
    walletAddress: string
    kycTier: number
    reputation: { score: number } | null
  }
}

interface OffersResponse {
  offers: Offer[]
  total: number
  page: number
  limit: number
}

const PAGE_SIZE = 12

export function OfferBook() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const stablecoin = searchParams.get('stablecoin') ?? ''
  const rail = searchParams.get('rail') ?? ''
  const fiatCurrency = searchParams.get('fiatCurrency') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))

  const [data, setData] = useState<OffersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const fetchOffers = useCallback(async () => {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(PAGE_SIZE))
    if (stablecoin) params.set('stablecoin', stablecoin)
    if (rail) params.set('rail', rail)
    if (fiatCurrency) params.set('fiatCurrency', fiatCurrency)

    try {
      const res = await fetch(`/api/offers?${params.toString()}`)
      const json = await res.json()

      if (!res.ok) {
        // API returned an error — show it gracefully instead of crashing
        throw new Error(json.error ?? `Server error ${res.status}`)
      }

      // Guard: ensure the response has the expected shape
      if (!json || !Array.isArray(json.offers)) {
        throw new Error('Unexpected response from server')
      }

      setData(json as OffersResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load offers')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [stablecoin, rail, fiatCurrency, page, retryCount]) // retryCount triggers re-fetch on retry

  useEffect(() => {
    fetchOffers()
  }, [fetchOffers])

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1

  const setPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(p))
    router.push(`/marketplace?${params.toString()}`)
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-52 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(15,23,42,0.5)] animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <svg className="w-12 h-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <p className="text-base font-medium text-slate-300">Could not load offers</p>
        <p className="text-sm mt-1 text-slate-500 max-w-xs text-center">{error}</p>
        <button
          onClick={() => setRetryCount((c) => c + 1)}
          className="mt-4 px-4 py-2 rounded-lg bg-brand-blue/20 border border-brand-blue/30 text-sm text-brand-blue hover:bg-brand-blue/30 transition-colors"
        >
          ↻ Retry
        </button>
      </div>
    )
  }

  if (!data || data.offers.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-24 text-slate-400"
      >
        <svg className="w-16 h-16 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-lg font-medium">No offers found</p>
        <p className="text-sm mt-1">Try adjusting your filters or load demo data from the Analytics page</p>
      </motion.div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.offers.map((offer, i) => (
          <OfferCard key={offer.id} offer={offer} index={i} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1.5 rounded-lg text-sm border border-[rgba(255,255,255,0.08)] bg-[rgba(15,23,42,0.5)] text-slate-300 disabled:opacity-40 hover:border-brand-blue/30 transition-colors"
          >
            ← Prev
          </button>
          <span className="text-sm text-slate-400">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1.5 rounded-lg text-sm border border-[rgba(255,255,255,0.08)] bg-[rgba(15,23,42,0.5)] text-slate-300 disabled:opacity-40 hover:border-brand-blue/30 transition-colors"
          >
            Next →
          </button>
        </div>
      )}

      <p className="text-center text-xs text-slate-500">
        {data.total} offer{data.total !== 1 ? 's' : ''} available
      </p>
    </div>
  )
}
