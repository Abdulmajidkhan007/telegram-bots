import { Sun, Moon } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppSelector';
import { toggleTheme } from '@/store/slices/ui.slice';
import { GroupSwitcher } from './GroupSwitcher';
import { NotificationsMenu } from './NotificationsMenu';

export function Header() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.ui.theme);

  return (
    // Sahifa endi butun hujjat bo'ylab aylanadi, header esa sticky — tepada qotib turadi.
    // Avval aylanish ichki <main> da edi va telefon brauzerlarida header ham ketib qolardi.
    <header className="sticky top-0 z-30 bg-white/85 dark:bg-slate-900/85 backdrop-blur border-b border-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-between gap-2 h-14 px-3 md:px-6">
        <GroupSwitcher />
        <div className="flex items-center gap-1">
          <button
            onClick={() => dispatch(toggleTheme())}
            aria-label="Mavzuni almashtirish"
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <NotificationsMenu />
        </div>
      </div>
    </header>
  );
}
