'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAccount } from 'wagmi'
import { GlassCard } from '@/components/shared/GlassCard'
import { KYCTierBadge } from '@/components/shared/KYCTierBadge'

interface Trader {
  id: string
  walletAddress: string
  kycTier: 0 | 1 | 2 | 3
  score: number
  totalTrades: number
  totalVolume: number
  winRate: number
  memberSince: string
}

// Generate a deterministic color from an address
function addressColor(addr: string): string {
  const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4']
  const idx = parseInt(addr.slice(2, 4), 16) % colors.length
  return colors[idx]
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

// Mini score ring
function ScoreRing({ score, size = 36 }: { score: number; size?: number }) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 1000) * circ
  const color = score >= 700 ? '#10B981' : score >= 400 ? '#3B82F6' : '#F59E0B'
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={3} strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </svg>
  )
}

// Podium card for top 3
function PodiumCard({ trader, rank, delay }: { trader: Trader; rank: 1 | 2 | 3; delay: number }) {
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' }
  const sizes = { 1: 'scale-110', 2: 'scale-100', 3: 'scale-95' }
  const color = addressColor(trader.walletAddress)

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 200, damping: 20 }}
      className={`flex flex-col items-center gap-3 ${sizes[rank]}`}
    >
      <span className="text-3xl">{medals[rank]}</span>
      {/* Avatar ring */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold text-white border-2"
        style={{
          background: `linear-gradient(135deg, ${color}33, ${color}11)`,
          borderColor: color,
          boxShadow: `0 0 20px ${color}44`,
        }}
      >
        {trader.walletAddress.slice(2, 4).toUpperCase()}
      </div>
      <div className="text-center">
        <p className="text-xs font-mono text-slate-300">{shortAddr(trader.walletAddress)}</p>
        <p className="text-xl font-bold text-slate-100 mt-1">{trader.score}</p>
        <p className="text-xs text-slate-500">reputation</p>
      </div>
    </motion.div>
  )
}

export default function LeaderboardPage() {
  const [traders, setTraders] = useState<Trader[]>([])
  const [loading, setLoading] = useState(true)
  const { address } = useAccount()

  useEffect(() => {
    fetch('/api/leaderboard')
      .then((r) => r.json())
      .then((d) => { setTraders(d as Trader[]); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const top3 = traders.slice(0, 3)
  const rest = traders.slice(3)

  return (
    <div className="min-h-screen px-4 py-10 max-w-5xl mx-auto">
      {/* Hero title */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-center mb-12"
      >
        <p className="text-xs font-semibold text-brand-violet uppercase tracking-widest mb-3">Trust Rankings</p>
        <h1
          className="text-4xl lg:text-5xl font-bold"
          style={{
            background: 'linear-gradient(135deg, #3B82F6, #8B5CF6, #10B981)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'gradientShift 4s ease infinite',
            backgroundSize: '200% 200%',
          }}
        >
          Top Merchants by Trust Score
        </h1>
        <p className="text-slate-400 mt-3">Ranked by on-chain reputation across all completed trades</p>
      </motion.div>

      {/* Podium */}
      {!loading && top3.length >= 3 && (
        <div className="flex items-end justify-center gap-8 mb-12">
          <PodiumCard trader={top3[1]} rank={2} delay={0.1} />
          <PodiumCard trader={top3[0]} rank={1} delay={0} />
          <PodiumCard trader={top3[2]} rank={3} delay={0.2} />
        </div>
      )}

      {/* Rank table */}
      <GlassCard className="overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[40px_1fr_80px_80px_80px_80px_80px] gap-3 px-4 py-3 border-b border-[rgba(255,255,255,0.06)] text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <span>#</span>
          <span>Trader</span>
          <span className="text-right">Score</span>
          <span className="text-right">Trades</span>
          <span className="text-right">Volume</span>
          <span className="text-right">Win Rate</span>
          <span className="text-right">KYC</span>
        </div>

        {loading ? (
          <div className="flex flex-col">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 mx-4 my-1 rounded-lg bg-[rgba(255,255,255,0.03)] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-[rgba(255,255,255,0.04)]">
            {traders.map((trader, i) => {
              const isMe = address?.toLowerCase() === trader.walletAddress.toLowerCase()
              const color = addressColor(trader.walletAddress)
              return (
                <motion.div
                  key={trader.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.35 }}
                  whileHover={{ x: 2 }}
                  className={`grid grid-cols-[40px_1fr_80px_80px_80px_80px_80px] gap-3 px-4 py-3.5 items-center transition-all duration-200 relative ${
                    isMe ? 'bg-brand-blue/5' : 'hover:bg-[rgba(255,255,255,0.02)]'
                  }`}
                >
                  {/* Indigo left border on hover */}
                  <motion.div
                    className="absolute left-0 top-0 bottom-0 w-0.5 bg-brand-violet rounded-r"
                    initial={{ scaleY: 0 }}
                    whileHover={{ scaleY: 1 }}
                    transition={{ duration: 0.15 }}
                  />

                  <span className="text-sm font-bold text-slate-500">{i + 1}</span>

                  {/* Avatar + address */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${color}44, ${color}22)`, border: `1px solid ${color}44` }}
                    >
                      {trader.walletAddress.slice(2, 4).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-slate-300 truncate">{shortAddr(trader.walletAddress)}</p>
                      {isMe && <p className="text-[10px] text-brand-blue">You</p>}
                    </div>
                  </div>

                  {/* Score ring */}
                  <div className="flex items-center justify-end gap-1.5">
                    <ScoreRing score={trader.score} size={28} />
                    <span className="text-sm font-bold text-slate-200">{trader.score}</span>
                  </div>

                  <span className="text-sm text-slate-400 text-right">{trader.totalTrades}</span>
                  <span className="text-sm text-slate-400 text-right">{trader.totalVolume.toLocaleString()}</span>
                  <span className={`text-sm font-medium text-right ${trader.winRate >= 80 ? 'text-brand-emerald' : 'text-brand-amber'}`}>
                    {trader.winRate}%
                  </span>
                  <div className="flex justify-end">
                    <KYCTierBadge tier={trader.kycTier} size="sm" />
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </GlassCard>
    </div>
  )
}
