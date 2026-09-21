import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAppSelector } from '@/store'
import { AppLayout } from '@/components/layout/AppLayout'
import LoginPage from '@/pages/Login/LoginPage'
import OverviewPage from '@/pages/Overview/OverviewPage'
import ExpensesPage from '@/pages/Expenses/ExpensesPage'
import AnalyticsPage from '@/pages/Analytics/AnalyticsPage'
import CategoriesPage from '@/pages/Categories/CategoriesPage'
import GroupsPage from '@/pages/Groups/GroupsPage'
import LimitsPage from '@/pages/Limits/LimitsPage'
import RecurringPage from '@/pages/Recurring/RecurringPage'
import ExportsPage from '@/pages/Exports/ExportsPage'
import SettingsPage from '@/pages/Settings/SettingsPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  const { theme } = useAppSelector((s) => s.ui)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<OverviewPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="groups" element={<GroupsPage />} />
        <Route path="limits" element={<LimitsPage />} />
        <Route path="recurring" element={<RecurringPage />} />
        <Route path="exports" element={<ExportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
