import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'

export default function RecurringPage() {
  return (
    <div>
      <Header title="Takroriy xarajatlar" subtitle="Avtomatik xarajatlar" />
      <div className="p-6">
        <Card>
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🔄</p>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Takroriy xarajatlar</h3>
            <p className="text-slate-500 text-sm">Oylik ijara, internet va boshqa doimiy xarajatlarni bu yerda boshqaring</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
