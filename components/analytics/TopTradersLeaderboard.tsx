'use client'

interface Trader {
  walletAddress: string
  totalVolume: number
  totalTrades: number
}

interface TopTradersLeaderboardProps {
  data: Trader[]
}

function shortAddress(addr: string) {
  if (addr.length < 12) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

const RANK_STYLES: Record<number, string> = {
  0: 'text-brand-amber font-bold',
  1: 'text-slate-300 font-semibold',
  2: 'text-brand-amber/60 font-semibold',
}

const RANK_ICONS: Record<number, string> = {
  0: '🥇',
  1: '🥈',
  2: '🥉',
}

export function TopTradersLeaderboard({ data }: TopTradersLeaderboardProps) {
  if (data.length === 0) {
    return (
      <div className="px-5 py-10 text-center text-slate-500 text-sm">
        No traders yet — load demo data to populate
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[rgba(255,255,255,0.05)]">
            {['Rank', 'Address', 'Volume', 'Trades'].map((col) => (
              <th
                key={col}
                className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((trader, i) => (
            <tr
              key={trader.walletAddress}
              className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] transition-colors"
            >
              <td className="px-5 py-3">
                <span className={`font-mono text-xs ${RANK_STYLES[i] ?? 'text-slate-500'}`}>
                  {RANK_ICONS[i] ?? `#${i + 1}`}
                </span>
              </td>
              <td className="px-5 py-3 font-mono text-xs text-slate-300">
                {shortAddress(trader.walletAddress)}
              </td>
              <td className="px-5 py-3 text-brand-emerald font-semibold">
                {trader.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </td>
              <td className="px-5 py-3 text-slate-400">{trader.totalTrades}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
