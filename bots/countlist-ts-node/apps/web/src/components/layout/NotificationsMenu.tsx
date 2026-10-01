import { useQuery } from '@tanstack/react-query';
import { Bell, BellOff, AlertTriangle, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { limitsApi } from '@/services/api';
import { useAppSelector } from '@/hooks/useAppSelector';
import { formatAmount } from '@/utils/format';
import { cn } from '@/utils/cn';
import { Dropdown } from '@/components/ui/Dropdown';

interface LimitUsage {
  id: string;
  amount: string | number;
  spentAmount: number;
  percentage: number;
  isExceeded: boolean;
  isWarning: boolean;
  category?: { name: string; icon?: string } | null;
}

// Avval qo'ng'iroqcha bosilganda hech narsa qilmasdi, nuqta esa doim yonib
// turardi. Endi u haqiqiy ma'lumotni — tanlangan guruhda shu oy oshib
// ketgan yoki 80% ga yetgan limitlarni ko'rsatadi; nuqta faqat ular bo'lsa yonadi.
export function NotificationsMenu() {
  const groupId = useAppSelector((s) => s.ui.selectedGroupId);
  const now = new Date();

  const { data } = useQuery({
    queryKey: ['limits', groupId, now.getMonth() + 1, now.getFullYear()],
    queryFn: () =>
      limitsApi.list(groupId!, now.getMonth() + 1, now.getFullYear()).then((r) => r.data?.data || r.data),
    enabled: !!groupId,
  });
  const alerts = (Array.isArray(data) ? (data as LimitUsage[]) : []).filter((l) => l.isExceeded || l.isWarning);

  return (
    <Dropdown
      trigger={(open) => (
        <button
          aria-label="Bildirishnomalar"
          className={cn(
            'relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors',
            open && 'bg-slate-100 dark:bg-slate-800',
          )}
        >
          <Bell size={18} />
          {alerts.length > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-4 text-center">
              {alerts.length}
            </span>
          )}
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Bildirishnomalar</p>
            <p className="text-xs text-slate-400">Shu oydagi limitlar</p>
          </div>
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <BellOff size={22} className="text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500">Hozircha ogohlantirish yo'q</p>
              <Link to="/limits" onClick={close} className="text-xs text-brand-500 hover:underline">
                Limit belgilash →
              </Link>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto p-1.5">
              {alerts.map((l) => (
                <li key={l.id}>
                  <Link
                    to="/limits"
                    onClick={close}
                    className="flex items-start gap-3 px-2.5 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    {l.isExceeded
                      ? <Flame size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                      : <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                        {l.category ? `${l.category.icon || ''} ${l.category.name}` : 'Umumiy limit'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {l.isExceeded ? 'Limitdan oshdi' : `${l.percentage}% sarflandi`} ·{' '}
                        {formatAmount(l.spentAmount)} / {formatAmount(Number(l.amount))}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Dropdown>
  );
}
