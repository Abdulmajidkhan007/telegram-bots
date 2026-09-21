import { useAnalyticsSummary } from '@/hooks/useAnalytics'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import { SpendingChart } from '@/components/charts/SpendingChart'
import { CategoryPieChart } from '@/components/charts/CategoryPieChart'
import { MonthlyBarChart } from '@/components/charts/MonthlyBarChart'

export default function AnalyticsPage() {
  const { data, isLoading } = useAnalyticsSummary()

  if (isLoading) return <PageLoader />

  return (
    <div>
      <Header title="Tahlil" subtitle="Kengaytirilgan statistika" />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Kunlik sarflanish (30 kun)</h3>
            <SpendingChart data={data?.daily_trend || []} />
          </Card>

          <Card>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Kategoriyalar bo'yicha</h3>
            <CategoryPieChart data={data?.category_breakdown || []} />
          </Card>
        </div>

        <Card>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Oylik tendensiya</h3>
          <MonthlyBarChart data={data?.monthly_trend || []} />
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Kategoriyalar jadvali</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                {['Kategoriya', 'Miqdor', 'Soni', 'Ulush'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {data?.category_breakdown.map((cat) => (
                <tr key={cat.category_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cat.category_icon}</span>
                      <span className="text-slate-700 dark:text-slate-200 font-medium">{cat.category_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                    {Number(cat.total).toLocaleString()} so'm
                  </td>
                  <td className="px-4 py-3 text-slate-500">{cat.count} ta</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full"
                          style={{ width: `${cat.percentage}%`, backgroundColor: cat.category_color }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">{cat.percentage.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}
