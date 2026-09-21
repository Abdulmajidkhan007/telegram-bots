from datetime import date, timedelta
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, and_, extract, case
from sqlalchemy.ext.asyncio import AsyncSession

from api.database.connection import get_db
from api.database.models import Expense, Category, MonthlyLimit, User, ExpenseStatus
from api.middleware.auth import get_current_user
from api.schemas.analytics import (
    AnalyticsSummary, DailyStat, CategoryStat, MonthlyOverview, LimitStatus
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


async def _sum_for_period(db: AsyncSession, user_id: int, date_from: date, date_to: date) -> tuple[Decimal, int]:
    result = await db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0), func.count(Expense.id))
        .where(
            Expense.user_id == user_id,
            Expense.status == ExpenseStatus.active,
            Expense.expense_date >= date_from,
            Expense.expense_date <= date_to,
        )
    )
    total, count = result.one()
    return Decimal(str(total)), int(count)


@router.get("/summary", response_model=AnalyticsSummary)
async def get_summary(
    group_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    month_start = today.replace(day=1)

    base_filter = [Expense.user_id == current_user.id, Expense.status == ExpenseStatus.active]
    if group_id:
        base_filter.append(Expense.group_id == group_id)

    def period_q(d_from: date, d_to: date):
        return select(
            func.coalesce(func.sum(Expense.amount), 0),
            func.count(Expense.id),
        ).where(*base_filter, Expense.expense_date >= d_from, Expense.expense_date <= d_to)

    today_total, today_count = (await db.execute(period_q(today, today))).one()
    week_total, week_count = (await db.execute(period_q(week_start, today))).one()
    month_total, month_count = (await db.execute(period_q(month_start, today))).one()
    all_total, _ = (await db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0), func.count()).where(*base_filter)
    )).one()

    daily_result = await db.execute(
        select(
            Expense.expense_date,
            func.sum(Expense.amount),
            func.count(Expense.id),
        )
        .where(*base_filter, Expense.expense_date >= today - timedelta(days=29))
        .group_by(Expense.expense_date)
        .order_by(Expense.expense_date)
    )
    daily_trend = [
        DailyStat(date=str(row[0]), total=Decimal(str(row[1])), count=row[2])
        for row in daily_result
    ]

    cat_result = await db.execute(
        select(
            Category.id,
            Category.name,
            Category.icon,
            Category.color,
            func.sum(Expense.amount).label("total"),
            func.count(Expense.id).label("cnt"),
        )
        .join(Expense, Expense.category_id == Category.id, isouter=True)
        .where(*base_filter, Expense.month == today.month, Expense.year == today.year)
        .group_by(Category.id, Category.name, Category.icon, Category.color)
        .order_by(func.sum(Expense.amount).desc())
    )
    cat_rows = cat_result.all()
    cat_total = sum(r[4] or 0 for r in cat_rows) or Decimal("1")
    category_breakdown = [
        CategoryStat(
            category_id=r[0],
            category_name=r[1] or "Boshqa",
            category_icon=r[2] or "📦",
            category_color=r[3] or "#6366f1",
            total=Decimal(str(r[4] or 0)),
            count=r[5] or 0,
            percentage=round(float(r[4] or 0) / float(cat_total) * 100, 2),
        )
        for r in cat_rows
    ]

    monthly_result = await db.execute(
        select(
            Expense.year,
            Expense.month,
            func.sum(Expense.amount),
            func.count(Expense.id),
        )
        .where(*base_filter)
        .group_by(Expense.year, Expense.month)
        .order_by(Expense.year, Expense.month)
        .limit(12)
    )
    monthly_trend = [
        MonthlyOverview(
            year=r[0], month=r[1],
            total=Decimal(str(r[2])), count=r[3],
            avg_daily=Decimal(str(r[2])) / 30,
            top_category=None, vs_last_month=0.0,
        )
        for r in monthly_result
    ]

    return AnalyticsSummary(
        today=Decimal(str(today_total)),
        this_week=Decimal(str(week_total)),
        this_month=Decimal(str(month_total)),
        all_time=Decimal(str(all_total)),
        today_count=int(today_count),
        week_count=int(week_count),
        month_count=int(month_count),
        daily_trend=daily_trend,
        category_breakdown=category_breakdown,
        monthly_trend=monthly_trend,
    )


@router.get("/limits", response_model=list[LimitStatus])
async def get_limit_status(
    group_id: int,
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    today = date.today()
    month = month or today.month
    year = year or today.year

    limits_result = await db.execute(
        select(MonthlyLimit, Category)
        .join(Category, MonthlyLimit.category_id == Category.id, isouter=True)
        .where(MonthlyLimit.group_id == group_id, MonthlyLimit.month == month, MonthlyLimit.year == year)
    )
    limits = limits_result.all()

    statuses = []
    for limit, category in limits:
        spent_result = await db.execute(
            select(func.coalesce(func.sum(Expense.amount), 0))
            .where(
                Expense.group_id == group_id,
                Expense.month == month,
                Expense.year == year,
                Expense.status == ExpenseStatus.active,
                Expense.category_id == limit.category_id if limit.category_id else True,
            )
        )
        spent = Decimal(str(spent_result.scalar_one()))
        remaining = limit.amount - spent
        pct = float(spent) / float(limit.amount) * 100 if limit.amount else 0

        statuses.append(LimitStatus(
            category_id=limit.category_id,
            category_name=category.name if category else "Umumiy",
            limit_amount=limit.amount,
            spent_amount=spent,
            remaining=remaining,
            percentage_used=round(pct, 2),
            is_exceeded=spent > limit.amount,
        ))
    return statuses
