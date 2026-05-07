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
  bucket: string
  count: number
}

interface TrustScoreHistogramProps {
  data: DataPoint[]
}

// Color buckets: red for low scores, amber for mid, emerald for high
function getBucketColor(bucket: string): string {
  if (bucket === '0-19') return '#EF4444'
  if (bucket === '20-39') return '#F59E0B'
  if (bucket === '40-59') return '#F59E0B'
  if (bucket === '60-79') return '#10B981'
  return '#10B981' // 80-100
}

export function TrustScoreHistogram({ data }: TrustScoreHistogramProps) {
  if (data.length === 0 || data.every((d) => d.count === 0)) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        No trust score data yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="bucket"
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: 'rgba(15,23,42,0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#e2e8f0',
            fontSize: 12,
          }}
          formatter={(value: number) => [value, 'Users']}
          labelFormatter={(label) => `Score range: ${label}`}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.bucket} fill={getBucketColor(entry.bucket)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
