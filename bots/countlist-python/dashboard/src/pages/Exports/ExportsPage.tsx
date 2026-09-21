import { useState } from 'react'
import { motion } from 'framer-motion'
import { exportsApi } from '@/services/api'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

const MONTHS = ['', 'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr']

export default function ExportsPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const formats = [
    { id: 'csv', label: 'CSV', icon: '📄', desc: 'Excel yoki boshqa dasturlar uchun', color: '#22c55e' },
    { id: 'excel', label: 'Excel', icon: '📊', desc: 'Microsoft Excel (.xlsx) fayl', color: '#3b82f6' },
  ]

  const handleExport = (format: string) => {
    try {
      if (format === 'csv') exportsApi.downloadCsv(month, year)
      else if (format === 'excel') exportsApi.downloadExcel(month, year)
      toast.success('Yuklab olish boshlandi!')
    } catch {
      toast.error('Xatolik yuz berdi')
    }
  }

  return (
    <div>
      <Header title="Export" subtitle="Ma'lumotlarni yuklab olish" />

      <div className="p-6 space-y-6 max-w-2xl">
        <Card>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Davr tanlash</h3>
          <div className="flex gap-3">
            <select
              className="flex-1 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              <option value={0}>Barcha oylar</option>
            </select>
            <select
              className="flex-1 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {[2023, 2024, 2025, 2026].map((y) => <option key={y}>{y}</option>)}
            </select>
          </div>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {formats.map((fmt, i) => (
            <motion.div
              key={fmt.id}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4"
                style={{ backgroundColor: `${fmt.color}20` }}
              >
                {fmt.icon}
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{fmt.label}</h3>
              <p className="text-xs text-slate-500 mb-4">{fmt.desc}</p>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => handleExport(fmt.id)}
                icon={<span>⬇️</span>}
              >
                Yuklab olish
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
