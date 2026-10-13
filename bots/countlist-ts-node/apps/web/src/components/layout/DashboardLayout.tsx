import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { isMiniApp } from '@/utils/telegram';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useActiveGroup } from '@/hooks/useActiveGroup';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { cn } from '@/utils/cn';

export function DashboardLayout() {
  const theme = useAppSelector((s) => s.ui.theme);
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  // Guruh shu yerda tanlanadi — har bir sahifa tayyor selectedGroupId bilan ochiladi.
  const { groups, activeGroup, isLoading } = useActiveGroup();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Mini App (allaqachon kirilgan) bosh sahifadan ochilsa — bir marta «Tarix»ga:
  // telefonda eng ko'p kerak bo'ladigani yozuvni topib to'g'rilash.
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const redirected = useRef(false);
  useEffect(() => {
    if (redirected.current) return;
    redirected.current = true;
    if (isMiniApp() && pathname === '/') navigate('/history', { replace: true });
  }, [navigate, pathname]);

  let content = <Outlet />;
  if (isLoading || (groups.length > 0 && !activeGroup)) {
    content = <PageLoader />;
  } else if (groups.length === 0) {
    content = (
      <EmptyState
        icon="👥"
        title="Hali guruh yo'q"
        description="Botni Telegram guruhingizga qo'shing va admin qiling. Guruhda birinchi xabar yozilgach, u shu yerda paydo bo'ladi."
      />
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className={cn('transition-[padding] duration-300', collapsed ? 'lg:pl-[76px]' : 'lg:pl-64')}>
        <Header />
        {/* pb-24: telefonda pastki panel kontentni yopmasin */}
        <main className="p-4 md:p-6 pb-24 lg:pb-6">{content}</main>
      </div>
      <BottomNav />
    </div>
  );
}
