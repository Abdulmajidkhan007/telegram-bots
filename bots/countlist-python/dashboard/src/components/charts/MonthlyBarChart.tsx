import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from 'recharts'
import type { MonthlyOverview } from '@/types'

const MONTHS = ['', 'Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek']

interface MonthlyBarChartProps {
  data: MonthlyOverview[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 shadow-lg">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-bold text-slate-900 dark:text-white">
        {Number(payload[0]?.value || 0).toLocaleString()} so'm
      </p>
    </div>
  )
}

export function MonthlyBarChart({ data }: MonthlyBarChartProps) {
  const chartData = data.map((d) => ({
    label: `${MONTHS[d.month]} ${d.year}`,
    total: Number(d.total),
    month: d.month,
  }))

  const currentMonth = new Date().getMonth() + 1

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-700/50" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis
          tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${(v / 1_000).toFixed(0)}K`}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
        <Bar dataKey="total" radius={[6, 6, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.month === currentMonth ? '#6366f1' : '#c7d2fe'}
              className="dark:fill-indigo-900"
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
