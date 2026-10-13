import { FormEvent, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trash2, X } from 'lucide-react';
import { formatIsoDate, localDateInTz } from '@expense-tracker/shared/utils/date-token';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { GROUP_TZ } from '@/utils/history';
import type {
  AccountWithBalance,
  CategoryRef,
  Transaction,
  TransactionPatch,
  TransactionType,
} from '@/types/transaction';

interface Props {
  tx: Transaction | null;
  canEdit: boolean;
  categories: CategoryRef[];
  accounts: AccountWithBalance[];
  saving: boolean;
  deleting: boolean;
  onClose: () => void;
  onSave: (id: string, patch: TransactionPatch) => void;
  onDelete: (id: string) => void;
}

interface FormState {
  type: TransactionType;
  amount: string;
  description: string;
  categoryId: string;
  accountId: string;
  date: string;
}

function toForm(tx: Transaction): FormState {
  return {
    type: tx.type,
    amount: String(Number(tx.amount)),
    description: tx.description,
    categoryId: tx.categoryId ?? '',
    accountId: tx.accountId ?? '',
    date: formatIsoDate(localDateInTz(new Date(tx.date), GROUP_TZ)),
  };
}

/** Faqat o'zgargan maydonlar yuboriladi — boshqa birov parallel tahrirlasa, tegmagan maydon ustiga yozilmasin. */
function diff(before: FormState, after: FormState): TransactionPatch {
  const patch: TransactionPatch = {};
  if (after.type !== before.type) patch.type = after.type;
  if (after.amount !== before.amount) patch.amount = Number(after.amount);
  if (after.description.trim() !== before.description) patch.description = after.description.trim();
  if (after.categoryId !== before.categoryId && after.type === 'EXPENSE') patch.categoryId = after.categoryId || null;
  if (after.accountId !== before.accountId) patch.accountId = after.accountId || null;
  if (after.date !== before.date) patch.date = after.date;
  return patch;
}

/**
 * Tranzaksiyani tahrirlash: telefonda pastdan chiquvchi panel, kompyuterda
 * markazdagi oyna. Faqat muallif tahrirlay oladi (server ham tekshiradi).
 */
export function TransactionSheet({
  tx, canEdit, categories, accounts, saving, deleting, onClose, onSave, onDelete,
}: Props) {
  const [form, setForm] = useState<FormState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setForm(tx ? toForm(tx) : null);
    setConfirmDelete(false);
  }, [tx]);

  useEffect(() => {
    if (!tx) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tx, onClose]);

  const today = formatIsoDate(localDateInTz(new Date(), GROUP_TZ));
  const amountValid = !!form && Number(form.amount) > 0;
  const descValid = !!form && form.description.trim().length > 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!tx || !form || !amountValid || !descValid) return;
    const patch = diff(toForm(tx), form);
    if (Object.keys(patch).length === 0) return onClose();
    onSave(tx.id, patch);
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  // Yopilgan hisob ro'yxatda ko'rinmaydi, lekin shu yozuvga ulangan bo'lsa — ko'rsatamiz.
  const accountOptions = accounts.filter((a) => !a.isHidden || a.id === tx?.accountId);

  return (
    <AnimatePresence>
      {tx && form && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.form
            role="dialog"
            aria-modal="true"
            aria-label="Yozuvni tahrirlash"
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="w-full sm:max-w-md max-h-[92dvh] overflow-y-auto bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-100 dark:border-slate-800 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {canEdit ? 'Tahrirlash' : 'Yozuv'}
              </h2>
              <button type="button" onClick={onClose} aria-label="Yopish" className="btn-ghost p-1.5">
                <X size={18} />
              </button>
            </div>

            {!canEdit && (
              <p className="text-xs rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-3 py-2">
                Bu yozuvni {tx.user?.firstName ?? 'boshqa a\'zo'} kiritgan — faqat u o'zgartira oladi.
              </p>
            )}

            <fieldset disabled={!canEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                {(['EXPENSE', 'INCOME'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set('type', t)}
                    className={cn(
                      'py-2 rounded-lg text-sm font-medium transition-colors',
                      form.type === t
                        ? t === 'EXPENSE'
                          ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400',
                    )}
                  >
                    {t === 'EXPENSE' ? '− Xarajat' : '+ Daromad'}
                  </button>
                ))}
              </div>

              <div>
                <label className="label" htmlFor="tx-amount">Summa ({tx.currency})</label>
                <input
                  id="tx-amount"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={form.amount}
                  onChange={(e) => set('amount', e.target.value)}
                  className={cn('input-field text-lg font-semibold', !amountValid && 'border-red-400')}
                />
              </div>

              <div>
                <label className="label" htmlFor="tx-desc">Izoh</label>
                <input
                  id="tx-desc"
                  type="text"
                  maxLength={200}
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  className={cn('input-field', !descValid && 'border-red-400')}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {form.type === 'EXPENSE' && (
                  <div>
                    <label className="label" htmlFor="tx-cat">Kategoriya</label>
                    <select
                      id="tx-cat"
                      value={form.categoryId}
                      onChange={(e) => set('categoryId', e.target.value)}
                      className="input-field"
                    >
                      <option value="">📦 Kategoriyasiz</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="label" htmlFor="tx-acc">Hisob</label>
                  <select
                    id="tx-acc"
                    value={form.accountId}
                    onChange={(e) => set('accountId', e.target.value)}
                    className="input-field"
                  >
                    <option value="">— Hisobsiz</option>
                    {accountOptions.map((a) => (
                      <option key={a.id} value={a.id}>{a.icon} {a.name}{a.isHidden ? ' (yopilgan)' : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="tx-date">Sana</label>
                  <input
                    id="tx-date"
                    type="date"
                    max={today}
                    value={form.date}
                    onChange={(e) => e.target.value && set('date', e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
            </fieldset>

            {canEdit && (
              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
                {confirmDelete ? (
                  <Button type="button" variant="danger" loading={deleting} onClick={() => onDelete(tx.id)} className="sm:flex-1">
                    <Trash2 size={15} /> Ha, o'chirilsin
                  </Button>
                ) : (
                  <Button type="button" variant="secondary" onClick={() => setConfirmDelete(true)} className="sm:flex-1 text-red-600 dark:text-red-400">
                    <Trash2 size={15} /> O'chirish
                  </Button>
                )}
                <Button type="submit" loading={saving} disabled={!amountValid || !descValid} className="sm:flex-1">
                  Saqlash
                </Button>
              </div>
            )}
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
