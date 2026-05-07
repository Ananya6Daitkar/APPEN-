import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true,
    remotePatterns: [],
  },
  // Expose DEMO_MODE to client components via NEXT_PUBLIC_DEMO_MODE (Req 11.2)
  env: {
    NEXT_PUBLIC_DEMO_MODE: process.env.DEMO_MODE ?? 'false',
  },
  experimental: {},
  // Silence the "multiple lockfiles" workspace root warning
  outputFileTracingRoot: path.join(__dirname),
  // Treat these as server-only packages — prevents webpack from bundling them
  serverExternalPackages: ['resend', 'pino-pretty'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Suppress optional native modules that don't exist in browser builds
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@react-native-async-storage/async-storage': false,
        'pino-pretty': false,
        'resend': false,
        'fs': false,
        'net': false,
        'tls': false,
      }
    }
    // Suppress known upstream warnings from MetaMask SDK and pino
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      /Module not found: Can't resolve '@react-native-async-storage\/async-storage'/,
      /Module not found: Can't resolve 'pino-pretty'/,
      /Module not found: Can't resolve 'resend'/,
    ]
    
    // Speed up webpack compilation
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
    }
    
    return config
  },
  // Reduce compilation time
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
