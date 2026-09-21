import axios, { AxiosInstance, AxiosError } from 'axios'
import type {
  User, Expense, ExpenseListResponse, Category, Group,
  AnalyticsSummary, LimitStatus, TokenPair, ExpenseFilter,
  ExpenseCreateInput, ExpenseUpdateInput,
} from '@/types'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const http: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { telegram_id: number; first_name: string; password?: string }) =>
    http.post<TokenPair>('/auth/register', data).then((r) => r.data),

  getMe: () => http.get<User>('/auth/me').then((r) => r.data),
}

// ── Expenses ──────────────────────────────────────────────────────────────────
export const expensesApi = {
  list: (filters: ExpenseFilter = {}) =>
    http.get<ExpenseListResponse>('/expenses', { params: filters }).then((r) => r.data),

  create: (data: ExpenseCreateInput) =>
    http.post<Expense>('/expenses', data).then((r) => r.data),

  update: (id: number, data: ExpenseUpdateInput) =>
    http.patch<Expense>(`/expenses/${id}`, data).then((r) => r.data),

  delete: (id: number) => http.delete(`/expenses/${id}`),
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsApi = {
  summary: (group_id?: number) =>
    http.get<AnalyticsSummary>('/analytics/summary', { params: { group_id } }).then((r) => r.data),

  limits: (group_id: number, month?: number, year?: number) =>
    http.get<LimitStatus[]>('/analytics/limits', { params: { group_id, month, year } }).then((r) => r.data),
}

// ── Categories ────────────────────────────────────────────────────────────────
export const categoriesApi = {
  list: () => http.get<Category[]>('/categories').then((r) => r.data),
  create: (data: { name: string; icon: string; color: string }) =>
    http.post<Category>('/categories', data).then((r) => r.data),
  delete: (id: number) => http.delete(`/categories/${id}`),
}

// ── Groups ────────────────────────────────────────────────────────────────────
export const groupsApi = {
  list: () => http.get<Group[]>('/groups').then((r) => r.data),
  create: (data: Partial<Group>) => http.post<Group>('/groups', data).then((r) => r.data),
  update: (id: number, data: Partial<Group>) =>
    http.patch<Group>(`/groups/${id}`, data).then((r) => r.data),
}

// ── Exports ───────────────────────────────────────────────────────────────────
export const exportsApi = {
  downloadCsv: (month?: number, year?: number) => {
    const params = new URLSearchParams()
    if (month) params.set('month', String(month))
    if (year) params.set('year', String(year))
    window.open(`${BASE_URL}/exports/csv?${params}&token=${localStorage.getItem('access_token')}`)
  },
  downloadExcel: (month?: number, year?: number) => {
    const params = new URLSearchParams()
    if (month) params.set('month', String(month))
    if (year) params.set('year', String(year))
    window.open(`${BASE_URL}/exports/excel?${params}&token=${localStorage.getItem('access_token')}`)
  },
}
