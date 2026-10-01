import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, X, Wallet, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppSelector';
import { closeSidebar, toggleSidebarCollapsed } from '@/store/slices/ui.slice';
import { logout } from '@/store/slices/auth.slice';
import { navItems } from './nav-items';

// Kompyuterda: doim ko'rinadi; yig'ilganda faqat iconlar (sichqoncha olib
// borilganda nomi chiqadi). Telefonda: "Menyu" bosilganda chiqadigan panel.
export function Sidebar() {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const sidebarOpen = useAppSelector((s) => s.ui.sidebarOpen);
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const user = useAppSelector((s) => s.auth.user);

  // Yig'ilgan holat faqat kompyuter uchun: telefondagi panel doim to'liq.
  const hideOnDesktop = collapsed ? 'lg:hidden' : '';

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => dispatch(closeSidebar())}
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          'fixed top-0 left-0 h-[100dvh] z-50 flex flex-col w-64',
          'bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800',
          'transition-[transform,width] duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
          collapsed && 'lg:w-[76px]',
        )}
      >
        <div className={cn('flex items-center justify-between h-14 px-4 border-b border-slate-100 dark:border-slate-800', collapsed && 'lg:justify-center lg:px-0')}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Wallet size={16} className="text-white" />
            </div>
            <span className={cn('font-bold text-slate-900 dark:text-slate-100 truncate', hideOnDesktop)}>ExpenseTracker</span>
          </div>
          <button
            onClick={() => dispatch(closeSidebar())}
            aria-label="Menyuni yopish"
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 scrollbar-thin">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    title={collapsed ? item.label : undefined}
                    onClick={() => dispatch(closeSidebar())}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                      collapsed && 'lg:justify-center lg:px-0',
                      isActive
                        ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100',
                    )}
                  >
                    <item.icon size={18} className="flex-shrink-0" />
                    <span className={cn('truncate', hideOnDesktop)}>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-0.5">
          <div className={cn('flex items-center gap-3 px-3 py-2', collapsed && 'lg:justify-center lg:px-0')} title={collapsed ? user?.firstName : undefined}>
            <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-600 dark:text-brand-400 font-semibold text-sm flex-shrink-0">
              {user?.firstName?.[0] || 'U'}
            </div>
            <div className={cn('flex-1 min-w-0', hideOnDesktop)}>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{user?.firstName || 'Foydalanuvchi'}</p>
              {user?.username && <p className="text-xs text-slate-400 truncate">@{user.username}</p>}
            </div>
          </div>
          <button
            onClick={() => dispatch(toggleSidebarCollapsed())}
            title={collapsed ? 'Menyuni kengaytirish' : 'Menyuni yig\'ish'}
            className={cn(
              'hidden lg:flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors',
              collapsed && 'lg:justify-center lg:px-0',
            )}
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            <span className={hideOnDesktop}>Yig'ish</span>
          </button>
          <button
            onClick={handleLogout}
            title={collapsed ? 'Chiqish' : undefined}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors',
              collapsed && 'lg:justify-center lg:px-0',
            )}
          >
            <LogOut size={17} />
            <span className={hideOnDesktop}>Chiqish</span>
          </button>
        </div>
      </aside>
    </>
  );
}
