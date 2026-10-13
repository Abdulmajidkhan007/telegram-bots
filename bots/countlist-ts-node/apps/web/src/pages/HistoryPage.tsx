import { useCallback, useMemo, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
// Chuqur import: shared indeksi login-link.ts (node crypto) ni ham tortadi — brauzerda build yiqiladi.
import { groupByDay, historyDayLabel } from '@expense-tracker/shared/utils/history';
import { localDateInTz } from '@expense-tracker/shared/utils/date-token';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { TransactionRow } from '@/components/history/TransactionRow';
import { TransactionSheet } from '@/components/history/TransactionSheet';
import { accountsApi, categoriesApi, expensesApi } from '@/services/api';
import { queryClient } from '@/services/query-client';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/utils/cn';
import { formatAmount } from '@/utils/format';
import { GROUP_TZ } from '@/utils/history';
import { haptic } from '@/utils/telegram';
import type {
  AccountWithBalance,
  CategoryRef,
  Paginated,
  Transaction,
  TransactionPatch,
  TypeFilter,
} from '@/types/transaction';

const PAGE_SIZE = 50;

const FILTERS: Array<{ value: TypeFilter; label: string }> = [
  { value: 'ALL', label: 'Hammasi' },
  { value: 'EXPENSE', label: 'Xarajat' },
  { value: 'INCOME', label: 'Daromad' },
];

// API javobi interceptor bilan { data: ... } ga o'raladi; ba'zi endpointlar o'ramsiz.
function unwrap<T>(res: { data: unknown }): T {
  const body = res.data as { data?: T } | T;
  return (body && typeof body === 'object' && 'data' in body ? (body as { data: T }).data : body) as T;
}

function apiError(err: unknown): string {
  const e = err as { response?: { data?: { message?: string | string[] } }; message?: string };
  const msg = e.response?.data?.message;
  return Array.isArray(msg) ? msg.join(', ') : msg ?? e.message ?? "Noma'lum xato";
}

/**
 * «Tarix» — Mini App'ning asosiy ekrani: kunlar bo'yicha yozuvlar, kunlik
 * jami, tezkor qidiruv va bosilganda tahrirlash/o'chirish.
 */
export function HistoryPage() {
  const groupId = useAppSelector((s) => s.ui.selectedGroupId);
  const userId = useAppSelector((s) => s.auth.user?.id);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<TypeFilter>('ALL');
  const [openTx, setOpenTx] = useState<Transaction | null>(null);
  const q = useDebounce(search.trim(), 300);

  const list = useInfiniteQuery({
    queryKey: ['history', groupId, type, q],
    enabled: !!groupId,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      expensesApi
        .list({ groupId, page: pageParam, limit: PAGE_SIZE, type, search: q || undefined })
        .then((r) => unwrap<Paginated<Transaction>>(r)),
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', groupId],
    enabled: !!groupId,
    queryFn: () => categoriesApi.list(groupId ?? undefined).then((r) => unwrap<CategoryRef[]>(r)),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', groupId],
    enabled: !!groupId,
    queryFn: () => accountsApi.list(groupId!).then((r) => unwrap<AccountWithBalance[]>(r)),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['history'] });
    void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    void queryClient.invalidateQueries({ queryKey: ['expenses'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const save = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TransactionPatch }) => expensesApi.update(id, { ...patch }),
    onSuccess: () => {
      haptic('success');
      toast.success('Saqlandi');
      setOpenTx(null);
      refresh();
    },
    onError: (err) => {
      haptic('error');
      toast.error(`Saqlanmadi: ${apiError(err)}`);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => expensesApi.delete(id),
    onSuccess: () => {
      haptic('success');
      toast.success("O'chirildi");
      setOpenTx(null);
      refresh();
    },
    onError: (err) => {
      haptic('error');
      toast.error(`O'chirilmadi: ${apiError(err)}`);
    },
  });

  const items = useMemo(() => list.data?.pages.flatMap((p) => p.data) ?? [], [list.data]);
  const days = useMemo(() => groupByDay(items, GROUP_TZ), [items]);
  const today = localDateInTz(new Date(), GROUP_TZ);
  const total = list.data?.pages[0]?.meta.total ?? 0;
  const close = useCallback(() => setOpenTx(null), []);

  if (list.isLoading) return <PageLoader />;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Tarix</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {total} ta yozuv · bosib tahrirlang
        </p>
      </div>

      <div className="sticky top-14 z-10 -mx-4 px-4 md:mx-0 md:px-0 py-2 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur space-y-2">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            inputMode="search"
            placeholder="Qidirish: taksi, Humo, Oziq-ovqat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 pr-9"
            aria-label="Qidirish"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Tozalash"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
            >
              <X size={15} />
            </button>
          )}
        </div>
        <div className="flex gap-2" role="tablist" aria-label="Turi">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={type === f.value}
              onClick={() => setType(f.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                type === f.value
                  ? 'bg-brand-500 text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {list.isError && (
        <Card padding="sm" className="text-sm text-red-600 dark:text-red-400">
          Yuklanmadi: {apiError(list.error)}
        </Card>
      )}

      {days.length === 0 && !list.isError ? (
        <EmptyState
          icon={q ? '🔎' : '🧾'}
          title={q ? 'Hech narsa topilmadi' : "Hali yozuv yo'q"}
          description={q ? `«${q}» bo'yicha natija yo'q` : 'Guruhda yozing: «- 10 ming taksiga» yoki «+2 mln oylik»'}
        />
      ) : (
        days.map((d) => (
          <section key={d.key} aria-label={historyDayLabel(d.day, today)}>
            <div className="flex items-baseline justify-between px-1 mb-1.5">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {historyDayLabel(d.day, today)}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-right">
                {Object.entries(d.totals).map(([cur, t]) => (
                  <span key={cur} className="ml-2">
                    {t.expense > 0 && <span>−{formatAmount(t.expense, cur)}</span>}
                    {t.income > 0 && (
                      <span className="ml-1.5 text-emerald-600 dark:text-emerald-400">+{formatAmount(t.income, cur)}</span>
                    )}
                  </span>
                ))}
              </p>
            </div>
            <Card padding="none" className="overflow-hidden">
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {d.items.map((tx) => <TransactionRow key={tx.id} tx={tx} onOpen={setOpenTx} />)}
              </ul>
            </Card>
          </section>
        ))
      )}

      {list.hasNextPage && (
        <div className="flex justify-center pt-1">
          <Button variant="secondary" loading={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
            Ko'proq ko'rsatish
          </Button>
        </div>
      )}

      <TransactionSheet
        tx={openTx}
        canEdit={!!openTx && openTx.userId === userId}
        categories={categories}
        accounts={accounts}
        saving={save.isPending}
        deleting={remove.isPending}
        onClose={close}
        onSave={(id, patch) => save.mutate({ id, patch })}
        onDelete={(id) => remove.mutate(id)}
      />
    </div>
  );
}
