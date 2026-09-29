import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Search, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { expensesApi, categoriesApi } from '@/services/api';
import { useAppSelector } from '@/hooks/useAppSelector';
import { formatAmount, formatDate } from '@/utils/format';
import { queryClient } from '@/services/query-client';
import toast from 'react-hot-toast';

const today = new Date().toISOString().split('T')[0];

export function ExpensesPage() {
  const selectedGroupId = useAppSelector((s) => s.ui.selectedGroupId);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [month, setMonth] = useState<number | undefined>(new Date().getMonth() + 1);
  const [year] = useState(new Date().getFullYear());
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ amount: '', description: '', categoryId: '', date: today, currency: 'UZS' });

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', selectedGroupId, page, month, year, search],
    queryFn: () =>
      expensesApi
        .list({ groupId: selectedGroupId, page, limit: 20, month, year })
        .then((r) => r.data?.data || r.data),
    enabled: !!selectedGroupId,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories', selectedGroupId],
    queryFn: () => categoriesApi.list(selectedGroupId || undefined).then((r) => r.data?.data || r.data),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      expensesApi.create({
        amount: parseFloat(form.amount),
        description: form.description,
        groupId: selectedGroupId!,
        categoryId: form.categoryId || undefined,
        date: form.date,
        currency: form.currency,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setShowAddForm(false);
      setForm({ amount: '', description: '', categoryId: '', date: today, currency: 'UZS' });
      toast.success("Xarajat qo'shildi");
    },
    onError: () => toast.error('Xatolik yuz berdi'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expensesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success("Xarajat o'chirildi");
    },
  });

  const expenses = Array.isArray(data) ? data : data?.data || [];
  const meta = data?.meta;

  if (isLoading) return <PageLoader />;

  const cats = Array.isArray(categories) ? categories : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Xarajatlar</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {meta?.total || expenses.length} ta xarajat
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowAddForm((v) => !v)}>
          <Plus size={16} />
          Qo'shish
        </Button>
      </div>

      {showAddForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Yangi xarajat</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="label">Miqdor *</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                  placeholder="50000"
                  className="input-field"
                  min="0"
                />
              </div>
              <div>
                <label className="label">Tavsif *</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Non sotib olindi"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Kategoriya</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
                  className="input-field"
                >
                  <option value="">Tanlanmagan</option>
                  {cats.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Sana</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                  className="input-field"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                loading={createMutation.isPending}
                onClick={() => createMutation.mutate()}
                disabled={!form.amount || !form.description.trim() || !selectedGroupId}
              >
                Saqlash
              </Button>
              <Button variant="secondary" onClick={() => setShowAddForm(false)}>Bekor</Button>
            </div>
          </Card>
        </motion.div>
      )}

      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Xarajat qidirish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9"
            />
          </div>
          <select
            value={month}
            onChange={(e) => { setMonth(Number(e.target.value)); setPage(1); }}
            className="input-field w-full sm:w-36"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2024, i).toLocaleDateString('uz-UZ', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {expenses.length === 0 ? (
        <EmptyState
          icon="💸"
          title="Xarajatlar yo'q"
          description="Telegram botga xarajat yuboring yoki qo'lda qo'shing"
        />
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {['Kategoriya', 'Tavsif', 'Miqdor', 'Foydalanuvchi', 'Sana', ''].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp: any, i: number) => (
                  <motion.tr
                    key={exp.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{exp.category?.icon || '📦'}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {exp.category?.name || 'Boshqa'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 max-w-xs truncate">
                        {exp.description}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {formatAmount(Number(exp.amount))}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 text-xs font-semibold">
                          {exp.user?.firstName?.[0] || 'U'}
                        </div>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {exp.user?.firstName || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {formatDate(exp.date)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => deleteMutation.mutate(exp.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500">
                {(page - 1) * meta.limit + 1} – {Math.min(page * meta.limit, meta.total)} / {meta.total}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  ←
                </Button>
                <Button variant="secondary" size="sm" disabled={page === meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                  →
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
