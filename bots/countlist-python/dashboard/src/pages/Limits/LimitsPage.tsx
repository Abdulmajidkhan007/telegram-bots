import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'

export default function LimitsPage() {
  return (
    <div>
      <Header title="Limitlar" subtitle="Oylik xarajat limitleri" />
      <div className="p-6">
        <Card>
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🎯</p>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Limitlar</h3>
            <p className="text-slate-500 text-sm">Guruh tanlang va limitlarni ko'rish/belgilash uchun guruhlar bo'limiga o'ting</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
