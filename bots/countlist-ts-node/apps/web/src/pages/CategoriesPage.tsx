import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { categoriesApi } from '@/services/api';
import { useAppSelector } from '@/hooks/useAppSelector';
import { queryClient } from '@/services/query-client';
import toast from 'react-hot-toast';
import { EmojiPicker } from '@/components/ui/EmojiPicker';
import { ColorSwatches } from '@/components/ui/ColorSwatches';

// Server sababini ko'rsatamiz (masalan "Siz bu guruh a'zosi emassiz"), "Xatolik" emas.
function errorText(err: any): string {
  return err?.response?.data?.message || err?.message || "Noma'lum xato";
}

type EditState = { id: string; name: string; icon: string; color: string } | null;

export function CategoriesPage() {
  const selectedGroupId = useAppSelector((s) => s.ui.selectedGroupId);
  const [showForm, setShowForm] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', icon: '📦', color: '#6366f1' });
  const [editState, setEditState] = useState<EditState>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories', selectedGroupId],
    queryFn: () => categoriesApi.list(selectedGroupId || undefined).then((r) => r.data?.data || r.data),
  });

  const createMutation = useMutation({
    mutationFn: () => categoriesApi.create({ ...newCat, groupId: selectedGroupId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setShowForm(false);
      setNewCat({ name: '', icon: '📦', color: '#6366f1' });
      toast.success("Kategoriya qo'shildi");
    },
    onError: (err) => toast.error(errorText(err)),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      categoriesApi.update(editState!.id, {
        name: editState!.name,
        icon: editState!.icon,
        color: editState!.color,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setEditState(null);
      toast.success('Kategoriya yangilandi');
    },
    onError: (err) => toast.error(errorText(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success("Kategoriya o'chirildi");
    },
    onError: (err) => toast.error(errorText(err)),
  });

  if (isLoading) return <PageLoader />;

  const cats = Array.isArray(categories) ? categories : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Kategoriyalar</h1>
          <p className="text-sm text-slate-500 mt-0.5">{cats.length} ta kategoriya</p>
        </div>
        <Button onClick={() => { setShowForm(!showForm); setEditState(null); }}>
          <Plus size={16} /> Qo'shish
        </Button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Yangi kategoriya</h2>
            <div className="flex gap-3">
              <div className="w-16 flex-shrink-0">
                <label className="label">Icon</label>
                <EmojiPicker value={newCat.icon} onChange={(icon) => setNewCat((p) => ({ ...p, icon }))} />
              </div>
              <div className="flex-1 min-w-0">
                <label className="label">Nom *</label>
                <input
                  type="text"
                  value={newCat.name}
                  onChange={(e) => setNewCat((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Transport"
                  className="input-field h-11"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="label">Rang <span className="font-normal text-slate-400">— grafiklarda shu rang bilan ko'rinadi</span></label>
              <ColorSwatches value={newCat.color} onChange={(color) => setNewCat((p) => ({ ...p, color }))} />
            </div>
            <div className="flex gap-2 mt-4">
              <Button loading={createMutation.isPending} onClick={() => createMutation.mutate()}
                disabled={!newCat.name.trim()}>
                Saqlash
              </Button>
              <Button variant="secondary" onClick={() => setShowForm(false)}>Bekor</Button>
            </div>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cats.map((cat: any, i: number) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
          >
            {editState?.id === cat.id ? (
              <Card className="ring-2 ring-brand-400">
                <div className="flex gap-2 mb-3">
                  <div className="w-14 flex-shrink-0">
                    <EmojiPicker size="sm" value={editState.icon} onChange={(icon) => setEditState((p) => p && { ...p, icon })} />
                  </div>
                  <input
                    type="text"
                    value={editState.name}
                    onChange={(e) => setEditState((p) => p && { ...p, name: e.target.value })}
                    className="input-field h-10 px-2 flex-1 min-w-0"
                    autoFocus
                  />
                </div>
                <div className="mb-3">
                  <ColorSwatches value={editState.color} onChange={(color) => setEditState((p) => p && { ...p, color })} />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateMutation.mutate()}
                    disabled={updateMutation.isPending || !editState.name.trim()}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Check size={13} /> Saqlash
                  </button>
                  <button
                    onClick={() => setEditState(null)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-medium rounded-lg transition-colors"
                  >
                    <X size={13} /> Bekor
                  </button>
                </div>
              </Card>
            ) : (
              <Card hover className="flex items-center gap-3 group">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ backgroundColor: cat.color + '20' }}
                >
                  {cat.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{cat.name}</p>
                  {cat.isDefault && (
                    <span className="text-xs text-slate-400">Standart</span>
                  )}
                </div>
                {/* Telefonda "hover" yo'q — tugmalar doim ko'rinsin, kompyuterda esa hover'da. */}
                {cat.groupId && (
                <div className="flex items-center gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditState({ id: cat.id, name: cat.name, icon: cat.icon, color: cat.color });
                      setShowForm(false);
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-brand-500 transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                  {!cat.isDefault && (
                    <button
                      onClick={() => { if (confirm(`"${cat.name}" kategoriyasini o'chirasizmi?`)) deleteMutation.mutate(cat.id); }}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                )}
              </Card>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
