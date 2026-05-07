'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { useState, useMemo, useEffect } from 'react'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

// Suppress Reown/WalletConnect console errors in demo mode
if (typeof window !== 'undefined') {
  const originalError = console.error
  console.error = (...args) => {
    // Suppress Reown allowlist errors
    if (
      args[0]?.includes?.('Allowlist') ||
      args[0]?.includes?.('cloud.reown.com') ||
      args[0]?.includes?.(403) ||
      args[0]?.message?.includes?.('Allowlist')
    ) {
      return
    }
    originalError.apply(console, args)
  }

  const originalWarn = console.warn
  console.warn = (...args) => {
    // Suppress WalletConnect initialization warnings
    if (
      args[0]?.includes?.('WalletConnect Core is already initialized') ||
      args[0]?.includes?.('Reown Config')
    ) {
      return
    }
    originalWarn.apply(console, args)
  }
}

// Create wagmi config once outside component to prevent re-initialization
const wagmiConfig = getDefaultConfig({
  appName: 'APPEN P2P Escrow',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-local-dev-only-not-for-prod',
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(),
  },
  ssr: true,
})

// Create query client once outside component
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false, // Disable refetch on window focus for demo
      refetchOnReconnect: false, // Disable refetch on reconnect for demo
    },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            {children}
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  )
}
