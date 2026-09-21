import { motion } from 'framer-motion'
import { useAnalyticsSummary } from '@/hooks/useAnalytics'
import { StatCard } from '@/components/ui/StatCard'
import { Card } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { SpendingChart } from '@/components/charts/SpendingChart'
import { CategoryPieChart } from '@/components/charts/CategoryPieChart'
import { MonthlyBarChart } from '@/components/charts/MonthlyBarChart'
import { Header } from '@/components/layout/Header'
import { useAppSelector } from '@/store'

function formatMoney(value: string | number) {
  const n = Math.round(Number(value))
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M so'm`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K so'm`
  return `${n.toLocaleString()} so'm`
}

export default function OverviewPage() {
  const { data, isLoading } = useAnalyticsSummary()
  const { user } = useAppSelector((s) => s.auth)
  const today = new Date().toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  if (isLoading) return <PageLoader />

  const stats = data || {
    today: '0', this_week: '0', this_month: '0', all_time: '0',
    today_count: 0, week_count: 0, month_count: 0,
    daily_trend: [], category_breakdown: [], monthly_trend: [],
  }

  return (
    <div>
      <Header
        title={`Assalomu alaykum, ${user?.first_name || 'Foydalanuvchi'}! 👋`}
        subtitle={today}
      />

      <div className="p-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Bugungi xarajat"
            value={formatMoney(stats.today)}
            subtitle={`${stats.today_count} ta`}
            icon={<span>🌅</span>}
            color="indigo"
            delay={0}
          />
          <StatCard
            title="Haftalik"
            value={formatMoney(stats.this_week)}
            subtitle={`${stats.week_count} ta`}
            icon={<span>📅</span>}
            color="violet"
            delay={0.05}
          />
          <StatCard
            title="Oylik"
            value={formatMoney(stats.this_month)}
            subtitle={`${stats.month_count} ta`}
            icon={<span>📆</span>}
            color="emerald"
            delay={0.1}
          />
          <StatCard
            title="Jami"
            value={formatMoney(stats.all_time)}
            icon={<span>🗄</span>}
            color="amber"
            delay={0.15}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Kunlik sarflanish</h3>
                <p className="text-xs text-slate-400 mt-0.5">So'nggi 30 kun</p>
              </div>
            </div>
            <SpendingChart data={stats.daily_trend} />
          </Card>

          <Card>
            <div className="mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">Kategoriyalar</h3>
              <p className="text-xs text-slate-400 mt-0.5">Bu oy</p>
            </div>
            <CategoryPieChart data={stats.category_breakdown} />

            {/* Legend */}
            <div className="mt-4 space-y-2">
              {stats.category_breakdown.slice(0, 5).map((cat) => (
                <div key={cat.category_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.category_color }} />
                    <span className="text-xs text-slate-600 dark:text-slate-300">{cat.category_icon} {cat.category_name}</span>
                  </div>
                  <span className="text-xs font-medium text-slate-900 dark:text-white">{cat.percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Monthly Trend */}
        <Card>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Oylik tendensiya</h3>
              <p className="text-xs text-slate-400 mt-0.5">So'nggi 12 oy</p>
            </div>
          </div>
          <MonthlyBarChart data={stats.monthly_trend} />
        </Card>

        {/* Top Categories Table */}
        {stats.category_breakdown.length > 0 && (
          <Card>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Kategoriyalar tahlili</h3>
            <div className="space-y-3">
              {stats.category_breakdown.map((cat) => (
                <div key={cat.category_id} className="flex items-center gap-4">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ backgroundColor: `${cat.category_color}20` }}
                  >
                    {cat.category_icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{cat.category_name}</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {Number(cat.total).toLocaleString()} so'm
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                      <motion.div
                        className="h-1.5 rounded-full"
                        style={{ backgroundColor: cat.category_color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${cat.percentage}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                  <Badge color={cat.category_color}>{cat.percentage.toFixed(1)}%</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
