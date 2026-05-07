import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/lib/providers'
import { Navbar } from '@/components/shared/Navbar'
import { DemoControlPanel } from '@/components/DemoControlPanel'

export const metadata: Metadata = {
  title: 'APPEN — Adaptive Proof-of-Payment Escrow Network',
  description:
    'Secure P2P fiat-to-stablecoin trading with non-custodial smart-contract escrow, AI-assisted proof verification, and on-chain reputation.',
  keywords: ['P2P', 'escrow', 'stablecoin', 'USDC', 'USDT', 'crypto', 'DeFi'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-surface-900 text-slate-100 antialiased">
        <Providers>
          <Navbar />
          <main className="pt-16">{children}</main>
          {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && <DemoControlPanel />}
        </Providers>
      </body>
    </html>
  )
}
