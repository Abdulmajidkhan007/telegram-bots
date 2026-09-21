export interface User {
  id: number
  telegram_id: number
  username: string | null
  first_name: string
  last_name: string | null
  language_code: string
  is_active: boolean
  is_superuser: boolean
  created_at: string
}

export interface Category {
  id: number
  name: string
  icon: string
  color: string
  is_system: boolean
}

export interface Expense {
  id: number
  amount: string
  currency: string
  description: string
  expense_date: string
  month: number
  year: number
  category: Category | null
  group_id: number | null
  is_recurring: boolean
  created_at: string
}

export interface ExpenseCreateInput {
  amount: number
  description: string
  currency?: string
  category_id?: number
  group_id?: number
  expense_date?: string
  raw_text?: string
}

export interface ExpenseUpdateInput {
  amount?: number
  description?: string
  category_id?: number
  expense_date?: string
}

export interface ExpenseListResponse {
  items: Expense[]
  total: number
  page: number
  size: number
  pages: number
}

export interface Group {
  id: number
  telegram_id: number
  title: string
  description: string | null
  currency: string
  timezone: string
  is_active: boolean
  member_count: number
  created_at: string
}

export interface DailyStat {
  date: string
  total: string
  count: number
}

export interface CategoryStat {
  category_id: number | null
  category_name: string
  category_icon: string
  category_color: string
  total: string
  count: number
  percentage: number
}

export interface MonthlyOverview {
  year: number
  month: number
  total: string
  count: number
  avg_daily: string
  top_category: string | null
  vs_last_month: number
}

export interface AnalyticsSummary {
  today: string
  this_week: string
  this_month: string
  all_time: string
  today_count: number
  week_count: number
  month_count: number
  daily_trend: DailyStat[]
  category_breakdown: CategoryStat[]
  monthly_trend: MonthlyOverview[]
}

export interface LimitStatus {
  category_id: number | null
  category_name: string
  limit_amount: string
  spent_amount: string
  remaining: string
  percentage_used: number
  is_exceeded: boolean
}

export interface TokenPair {
  access_token: string
  token_type: string
  user: User
}

export interface ApiError {
  detail: string
}

export interface ExpenseFilter {
  group_id?: number
  category_id?: number
  month?: number
  year?: number
  date_from?: string
  date_to?: string
  search?: string
  page?: number
  size?: number
}
