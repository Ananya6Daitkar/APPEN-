import { Suspense } from 'react'
import { OfferFilters } from '@/components/marketplace/OfferFilters'
import { OfferBook } from '@/components/marketplace/OfferBook'
import { PageTransition } from '@/components/shared/PageTransition'

export const metadata = {
  title: 'Marketplace — APPEN',
  description: 'Browse and accept P2P stablecoin sell offers',
}

function OfferBookSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-52 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(15,23,42,0.5)] shimmer"
        />
      ))}
    </div>
  )
}

export default function MarketplacePage() {
  return (
    <PageTransition>
      <div className="min-h-screen px-4 py-10 max-w-6xl mx-auto">
        <div className="mb-8">
          <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">P2P Trading</p>
          <h1 className="text-3xl font-bold text-slate-100">Offers Marketplace</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Browse active USDC/USDT sell offers from verified traders
          </p>
        </div>

        <div className="mb-6">
          <Suspense fallback={
            <div className="flex gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 w-36 rounded-lg bg-surface-800 shimmer" />
              ))}
            </div>
          }>
            <OfferFilters />
          </Suspense>
        </div>

        <Suspense fallback={<OfferBookSkeleton />}>
          <OfferBook />
        </Suspense>
      </div>
    </PageTransition>
  )
}
