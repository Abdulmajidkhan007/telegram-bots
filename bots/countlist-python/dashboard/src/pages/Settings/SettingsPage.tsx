import { useAppDispatch, useAppSelector } from '@/store'
import { toggleTheme } from '@/store/slices/uiSlice'
import { logout } from '@/store/slices/authSlice'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useNavigate } from 'react-router-dom'

export default function SettingsPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { user } = useAppSelector((s) => s.auth)
  const { theme } = useAppSelector((s) => s.ui)

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  return (
    <div>
      <Header title="Sozlamalar" />

      <div className="p-6 space-y-4 max-w-xl">
        <Card>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Profil</h3>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-300 font-bold text-xl">
              {user?.first_name?.[0] || '?'}
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">{user?.first_name} {user?.last_name}</p>
              {user?.username && <p className="text-sm text-slate-500">@{user.username}</p>}
              <p className="text-xs text-slate-400">Telegram ID: {user?.telegram_id}</p>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Ko'rinish</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Mavzu</p>
              <p className="text-xs text-slate-400">Hozir: {theme === 'dark' ? 'Qorong\'u' : 'Yorug\''} rejim</p>
            </div>
            <Button variant="secondary" onClick={() => dispatch(toggleTheme())} icon={<span>{theme === 'dark' ? '☀️' : '🌙'}</span>}>
              {theme === 'dark' ? 'Yorug\'' : 'Qorong\'u'}
            </Button>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Hisob</h3>
          <Button variant="danger" onClick={handleLogout} icon={<span>🚪</span>}>
            Chiqish
          </Button>
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Versiya</h3>
          <p className="text-sm text-slate-500">XarajatBot Dashboard v1.0.0</p>
          <p className="text-xs text-slate-400 mt-1">React + TypeScript + FastAPI + aiogram 3</p>
        </Card>
      </div>
    </div>
  )
}
