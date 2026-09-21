import { Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { clsx } from 'clsx'
import { Sidebar } from './Sidebar'
import { useAppSelector } from '@/store'

export function AppLayout() {
  const { sidebarOpen } = useAppSelector((s) => s.ui)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      <Sidebar />

      <div className={clsx(
        'flex-1 flex flex-col min-w-0 transition-all duration-300',
        sidebarOpen ? 'lg:pl-64' : 'pl-0'
      )}>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          className: 'dark:bg-slate-800 dark:text-white',
          duration: 3000,
          style: { borderRadius: '12px', fontSize: '14px' },
        }}
      />
    </div>
  )
}
