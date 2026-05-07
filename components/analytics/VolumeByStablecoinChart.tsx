'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface DataPoint {
  stablecoin: string
  volume: number
}

interface VolumeByStablecoinChartProps {
  data: DataPoint[]
}

const COLORS: Record<string, string> = {
  USDC: '#3B82F6',
  USDT: '#10B981',
}

function getColor(stablecoin: string, index: number) {
  if (COLORS[stablecoin]) return COLORS[stablecoin]
  const fallbacks = ['#8B5CF6', '#F59E0B', '#EF4444']
  return fallbacks[index % fallbacks.length]
}

export function VolumeByStablecoinChart({ data }: VolumeByStablecoinChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        No volume data yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="stablecoin"
          tick={{ fill: '#64748b', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) =>
            v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
          }
        />
        <Tooltip
          contentStyle={{
            background: 'rgba(15,23,42,0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#e2e8f0',
            fontSize: 12,
          }}
          formatter={(value: number) => [
            value.toLocaleString(undefined, { maximumFractionDigits: 0 }),
            'Volume',
          ]}
        />
        <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={entry.stablecoin} fill={getColor(entry.stablecoin, index)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
