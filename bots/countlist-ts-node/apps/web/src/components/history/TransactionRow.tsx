import { ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { signedAmount } from '@/utils/history';
import type { Transaction } from '@/types/transaction';

interface Props {
  tx: Transaction;
  onOpen: (tx: Transaction) => void;
}

export function TransactionRow({ tx, onOpen }: Props) {
  const income = tx.type === 'INCOME';
  const icon = income ? '💰' : tx.category?.icon ?? '📦';
  const meta = [income ? 'Daromad' : tx.category?.name ?? 'Kategoriyasiz', tx.account?.name, tx.user?.firstName]
    .filter(Boolean)
    .join(' · ');

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(tx)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-100 dark:active:bg-slate-800 transition-colors"
      >
        <span className="w-10 h-10 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl">
          {icon}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{tx.description}</span>
          <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">{meta}</span>
        </span>
        <span
          className={cn(
            'text-sm font-semibold whitespace-nowrap',
            income ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100',
          )}
        >
          {signedAmount(tx.type, Number(tx.amount), tx.currency)}
        </span>
        <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 shrink-0" />
      </button>
    </li>
  );
}
