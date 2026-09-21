import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { categoriesApi } from '@/services/api'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageLoader } from '@/components/ui/Spinner'
import toast from 'react-hot-toast'

const PRESET_COLORS = ['#6366f1', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']
const PRESET_ICONS = ['📦', '🛒', '🚗', '🏠', '💊', '📚', '🎬', '👗', '💡', '📱', '✈️', '🎮', '💼', '🐾']

export default function CategoriesPage() {
  const qc = useQueryClient()
  const { data: categories, isLoading } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })
  const [form, setForm] = useState({ name: '', icon: '📦', color: '#6366f1' })
  const [showForm, setShowForm] = useState(false)

  const createMutation = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setShowForm(false); toast.success('Kategoriya qo\'shildi!') },
  })

  const deleteMutation = useMutation({
    mutationFn: categoriesApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast.success('O\'chirildi') },
  })

  if (isLoading) return <PageLoader />

  return (
    <div>
      <Header
        title="Kategoriyalar"
        actions={<Button onClick={() => setShowForm(!showForm)} icon={<span>+</span>}>Qo'shish</Button>}
      />

      <div className="p-6 space-y-4">
        {showForm && (
          <Card>
            <h3 className="font-semibold mb-4 text-slate-900 dark:text-white">Yangi kategoriya</h3>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form) }} className="space-y-4">
              <Input label="Nomi" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Ikonka</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setForm({ ...form, icon })}
                      className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                        form.icon === icon ? 'bg-primary-100 ring-2 ring-primary-500' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Rang</label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm({ ...form, color })}
                      className={`w-8 h-8 rounded-full transition-transform ${form.color === color ? 'scale-125 ring-2 ring-offset-2 ring-slate-400' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Bekor</Button>
                <Button type="submit" loading={createMutation.isPending}>Saqlash</Button>
              </div>
            </form>
          </Card>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {categories?.map((cat) => (
            <motion.div
              key={cat.id}
              className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-card flex flex-col items-center gap-3 group relative"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${cat.color}20` }}
              >
                {cat.icon}
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 text-center">{cat.name}</p>
              {cat.is_system ? (
                <span className="text-xs text-slate-400">Tizim</span>
              ) : (
                <button
                  onClick={() => deleteMutation.mutate(cat.id)}
                  className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 text-slate-300 hover:text-rose-500 transition-all"
                >
                  ✕
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
