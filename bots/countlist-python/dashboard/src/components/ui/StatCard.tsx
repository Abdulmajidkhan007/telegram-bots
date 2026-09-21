import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import type { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  icon: ReactNode
  trend?: number
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet'
  delay?: number
}

const colorMap = {
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950/40', icon: 'text-indigo-600 dark:text-indigo-400', accent: 'bg-indigo-500' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', icon: 'text-emerald-600 dark:text-emerald-400', accent: 'bg-emerald-500' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/40', icon: 'text-amber-600 dark:text-amber-400', accent: 'bg-amber-500' },
  rose: { bg: 'bg-rose-50 dark:bg-rose-950/40', icon: 'text-rose-600 dark:text-rose-400', accent: 'bg-rose-500' },
  violet: { bg: 'bg-violet-50 dark:bg-violet-950/40', icon: 'text-violet-600 dark:text-violet-400', accent: 'bg-violet-500' },
}

export function StatCard({ title, value, subtitle, icon, trend, color = 'indigo', delay = 0 }: StatCardProps) {
  const colors = colorMap[color]
  const isPositive = trend !== undefined && trend > 0

  return (
    <motion.div
      className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 shadow-card p-6 flex flex-col gap-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
        </div>
        <div className={clsx('p-3 rounded-xl', colors.bg)}>
          <div className={clsx('w-5 h-5', colors.icon)}>{icon}</div>
        </div>
      </div>

      {trend !== undefined && (
        <div className={clsx(
          'inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full w-fit',
          isPositive
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
        )}>
          <span>{isPositive ? '↑' : '↓'}</span>
          <span>{Math.abs(trend).toFixed(1)}% o'tgan oyga nisbatan</span>
        </div>
      )}
    </motion.div>
  )
}
