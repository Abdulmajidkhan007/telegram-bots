import { Link, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAppDispatch } from '@/hooks/useAppSelector';
import { toggleSidebar } from '@/store/slices/ui.slice';
import { navItems, bottomNavPaths } from './nav-items';

// Telefonda sidebar o'rniga pastki panel: asosiy bo'limlar bir bosishda,
// qolganlari "Menyu" orqali. Kompyuterda ko'rinmaydi.
export function BottomNav() {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const items = navItems.filter((i) => bottomNavPaths.includes(i.to));
  const inMenu = !bottomNavPaths.includes(location.pathname);

  const cls = (active: boolean) =>
    cn(
      'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
      active ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400',
    );

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-100 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {items.map((item) => (
          <Link key={item.to} to={item.to} className={cls(location.pathname === item.to)}>
            <item.icon size={20} />
            {item.short}
          </Link>
        ))}
        <button onClick={() => dispatch(toggleSidebar())} className={cls(inMenu)}>
          <Menu size={20} />
          Menyu
        </button>
      </div>
    </nav>
  );
}
