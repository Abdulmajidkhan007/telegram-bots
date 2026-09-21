from decimal import Decimal
from typing import Optional
from pydantic import BaseModel


class DailyStat(BaseModel):
    date: str
    total: Decimal
    count: int


class CategoryStat(BaseModel):
    category_id: Optional[int]
    category_name: str
    category_icon: str
    category_color: str
    total: Decimal
    count: int
    percentage: float


class MonthlyOverview(BaseModel):
    year: int
    month: int
    total: Decimal
    count: int
    avg_daily: Decimal
    top_category: Optional[str]
    vs_last_month: float


class WeeklyStat(BaseModel):
    week_start: str
    week_end: str
    total: Decimal
    count: int


class AnalyticsSummary(BaseModel):
    today: Decimal
    this_week: Decimal
    this_month: Decimal
    all_time: Decimal
    today_count: int
    week_count: int
    month_count: int
    daily_trend: list[DailyStat]
    category_breakdown: list[CategoryStat]
    monthly_trend: list[MonthlyOverview]


class LimitStatus(BaseModel):
    category_id: Optional[int]
    category_name: str
    limit_amount: Decimal
    spent_amount: Decimal
    remaining: Decimal
    percentage_used: float
    is_exceeded: bool
