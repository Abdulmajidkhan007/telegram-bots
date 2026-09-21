import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { useExpenses, useCreateExpense, useDeleteExpense } from '@/hooks/useExpenses'
import { useQuery } from '@tanstack/react-query'
import { categoriesApi } from '@/services/api'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import type { ExpenseFilter } from '@/types'

const MONTHS = ['', 'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr']

export default function ExpensesPage() {
  const now = new Date()
  const [filters, setFilters] = useState<ExpenseFilter>({ month: now.getMonth() + 1, year: now.getFullYear(), page: 1, size: 20 })
  const [showForm, setShowForm] = useState(false)
  const [newExpense, setNewExpense] = useState({ amount: '', description: '', category_id: '' })

  const { data, isLoading } = useExpenses(filters)
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })
  const createMutation = useCreateExpense()
  const deleteMutation = useDeleteExpense()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await createMutation.mutateAsync({
      amount: Number(newExpense.amount),
      description: newExpense.description,
      category_id: newExpense.category_id ? Number(newExpense.category_id) : undefined,
    })
    setNewExpense({ amount: '', description: '', category_id: '' })
    setShowForm(false)
  }

  return (
    <div>
      <Header
        title="Xarajatlar"
        subtitle={`${MONTHS[filters.month || now.getMonth() + 1]} ${filters.year}`}
        actions={
          <Button onClick={() => setShowForm(!showForm)} icon={<span>+</span>}>
            Qo'shish
          </Button>
        }
      />

      <div className="p-6 space-y-4">
        {/* Filters */}
        <Card padding="sm">
          <div className="flex flex-wrap gap-3 items-center">
            <select
              className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={filters.month}
              onChange={(e) => setFilters({ ...filters, month: Number(e.target.value), page: 1 })}
            >
              {MONTHS.slice(1).map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: Number(e.target.value), page: 1 })}
            >
              {[2023, 2024, 2025, 2026].map((y) => <option key={y}>{y}</option>)}
            </select>
            <select
              className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={filters.category_id || ''}
              onChange={(e) => setFilters({ ...filters, category_id: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
            >
              <option value="">Barcha kategoriyalar</option>
              {categories?.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            <Input
              placeholder="Qidirish..."
              className="w-48"
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined, page: 1 })}
            />
          </div>
        </Card>

        {/* Create Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Yangi xarajat</h3>
                <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="Miqdor (so'm)"
                    type="number"
                    placeholder="500000"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    required
                  />
                  <Input
                    label="Tavsif"
                    placeholder="Ovqat, taksi..."
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    required
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Kategoriya</label>
                    <select
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      value={newExpense.category_id}
                      onChange={(e) => setNewExpense({ ...newExpense, category_id: e.target.value })}
                    >
                      <option value="">Kategoriya tanlang</option>
                      {categories?.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-3 flex gap-2 justify-end">
                    <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Bekor</Button>
                    <Button type="submit" loading={createMutation.isPending}>Saqlash</Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* List */}
        {isLoading ? <PageLoader /> : (
          <Card padding="sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    {['Sana', 'Tavsif', 'Kategoriya', 'Miqdor', ''].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  <AnimatePresence>
                    {data?.items.map((e) => (
                      <motion.tr
                        key={e.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {format(parseISO(e.expense_date), 'dd.MM.yyyy')}
                        </td>
                        <td className="px-4 py-3 text-slate-900 dark:text-white font-medium max-w-[200px] truncate">
                          {e.description}
                        </td>
                        <td className="px-4 py-3">
                          {e.category ? (
                            <Badge color={e.category.color}>
                              {e.category.icon} {e.category.name}
                            </Badge>
                          ) : (
                            <Badge>📦 Boshqa</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          {Number(e.amount).toLocaleString()} so'm
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => deleteMutation.mutate(e.id)}
                            className="text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 transition-colors"
                          >
                            🗑
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>

              {data?.items.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-2xl mb-2">📭</p>
                  <p>Bu davr uchun xarajatlar topilmadi</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {data && data.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-500">{data.total} ta xarajat</p>
                <div className="flex gap-1">
                  {Array.from({ length: data.pages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setFilters({ ...filters, page: p })}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                        p === filters.page
                          ? 'bg-primary-600 text-white'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
