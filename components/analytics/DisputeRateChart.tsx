'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

interface DataPoint {
  week: string
  disputeRate: number
}

interface DisputeRateChartProps {
  data: DataPoint[]
}

function formatWeek(weekStr: string) {
  const d = new Date(weekStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function DisputeRateChart({ data }: DisputeRateChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        No dispute data yet
      </div>
    )
  }

  const displayed = data.slice(-20)
  const avgRate =
    displayed.reduce((s, d) => s + d.disputeRate, 0) / (displayed.length || 1)

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={displayed} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="week"
          tickFormatter={formatWeek}
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v}%`}
        />
        <Tooltip
          contentStyle={{
            background: 'rgba(15,23,42,0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#e2e8f0',
            fontSize: 12,
          }}
          labelFormatter={(label) => `Week of ${label}`}
          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Dispute Rate']}
        />
        {/* Average reference line */}
        <ReferenceLine
          y={avgRate}
          stroke="rgba(239,68,68,0.4)"
          strokeDasharray="4 4"
          label={{
            value: `avg ${avgRate.toFixed(1)}%`,
            fill: '#EF4444',
            fontSize: 10,
            position: 'insideTopRight',
          }}
        />
        <Line
          type="monotone"
          dataKey="disputeRate"
          stroke="#8B5CF6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#8B5CF6' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
