import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx } from 'clsx'
import { useAppDispatch, useAppSelector } from '@/store'
import { logout } from '@/store/slices/authSlice'
import { toggleTheme } from '@/store/slices/uiSlice'

const navItems = [
  { to: '/', label: 'Umumiy ko\'rinish', icon: '📊', end: true },
  { to: '/expenses', label: 'Xarajatlar', icon: '💰' },
  { to: '/analytics', label: 'Tahlil', icon: '📈' },
  { to: '/categories', label: 'Kategoriyalar', icon: '🏷' },
  { to: '/groups', label: 'Guruhlar', icon: '👥' },
  { to: '/limits', label: 'Limitlar', icon: '🎯' },
  { to: '/recurring', label: 'Takroriy', icon: '🔄' },
  { to: '/exports', label: 'Export', icon: '📤' },
  { to: '/settings', label: 'Sozlamalar', icon: '⚙️' },
]

export function Sidebar() {
  const dispatch = useAppDispatch()
  const { theme, sidebarOpen } = useAppSelector((s) => s.ui)
  const { user } = useAppSelector((s) => s.auth)

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <motion.aside
          initial={{ x: -280 }}
          animate={{ x: 0 }}
          exit={{ x: -280 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed left-0 top-0 h-full w-64 z-40 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800"
        >
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 dark:border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white text-lg shadow-glow">
              💸
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white leading-none">XarajatBot</p>
              <p className="text-xs text-slate-400 mt-0.5">Dashboard</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                  )
                }
              >
                <span className="text-base leading-none">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className="px-3 py-4 border-t border-slate-100 dark:border-slate-800 space-y-1">
            <button
              onClick={() => dispatch(toggleTheme())}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
              <span>{theme === 'dark' ? 'Yorug\' rejim' : 'Qorong\'u rejim'}</span>
            </button>

            {user && (
              <div className="flex items-center gap-3 px-3 py-2.5">
                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-300 font-semibold text-sm">
                  {user.first_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.first_name}</p>
                  {user.username && <p className="text-xs text-slate-400 truncate">@{user.username}</p>}
                </div>
                <button
                  onClick={() => dispatch(logout())}
                  className="text-slate-400 hover:text-rose-500 transition-colors"
                  title="Chiqish"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
