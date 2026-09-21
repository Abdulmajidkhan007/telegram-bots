from datetime import date, timedelta
from decimal import Decimal

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.types import Message, CallbackQuery
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from bot.database.models import User, Expense, Category, ExpenseStatus
from bot.keyboards.inline import main_menu_keyboard
from bot.utils.formatters import format_amount, format_expense_list, format_stats_message

router = Router()


async def _fetch_expenses_for_period(
    db: AsyncSession, user_id: int, date_from: date, date_to: date
) -> list[dict]:
    result = await db.execute(
        select(Expense, Category)
        .join(Category, Expense.category_id == Category.id, isouter=True)
        .where(
            Expense.user_id == user_id,
            Expense.status == ExpenseStatus.active,
            Expense.expense_date >= date_from,
            Expense.expense_date <= date_to,
        )
        .order_by(Expense.expense_date.desc())
        .limit(20)
    )
    rows = result.all()
    return [
        {
            "amount": e.amount,
            "description": e.description,
            "category_icon": c.icon if c else "📦",
            "category_name": c.name if c else "Boshqa",
            "date": e.expense_date,
        }
        for e, c in rows
    ]


@router.message(Command("today"))
@router.callback_query(F.data == "stats:today")
async def cmd_today(event: Message | CallbackQuery, db: AsyncSession, db_user: User):
    today = date.today()
    expenses = await _fetch_expenses_for_period(db, db_user.id, today, today)
    text = format_expense_list(expenses, f"Bugungi xarajatlar ({today.strftime('%d.%m.%Y')})")
    if isinstance(event, CallbackQuery):
        await event.message.edit_text(text, parse_mode="HTML", reply_markup=main_menu_keyboard())
        await event.answer()
    else:
        await event.answer(text, parse_mode="HTML", reply_markup=main_menu_keyboard())


@router.message(Command("week"))
@router.callback_query(F.data == "stats:week")
async def cmd_week(event: Message | CallbackQuery, db: AsyncSession, db_user: User):
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    expenses = await _fetch_expenses_for_period(db, db_user.id, week_start, today)
    text = format_expense_list(expenses, f"Haftalik xarajatlar ({week_start.strftime('%d.%m')} – {today.strftime('%d.%m')})")
    if isinstance(event, CallbackQuery):
        await event.message.edit_text(text, parse_mode="HTML", reply_markup=main_menu_keyboard())
        await event.answer()
    else:
        await event.answer(text, parse_mode="HTML", reply_markup=main_menu_keyboard())


@router.message(Command("month"))
@router.callback_query(F.data == "stats:month")
async def cmd_month(event: Message | CallbackQuery, db: AsyncSession, db_user: User):
    today = date.today()
    month_start = today.replace(day=1)
    expenses = await _fetch_expenses_for_period(db, db_user.id, month_start, today)
    month_names = ["", "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
                   "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"]
    text = format_expense_list(expenses, f"{month_names[today.month]} {today.year} xarajatlari")
    if isinstance(event, CallbackQuery):
        await event.message.edit_text(text, parse_mode="HTML", reply_markup=main_menu_keyboard())
        await event.answer()
    else:
        await event.answer(text, parse_mode="HTML", reply_markup=main_menu_keyboard())


@router.message(Command("stats"))
@router.callback_query(F.data == "stats:all")
async def cmd_stats(event: Message | CallbackQuery, db: AsyncSession, db_user: User):
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    month_start = today.replace(day=1)

    def period_q(d_from: date, d_to: date):
        return select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.user_id == db_user.id,
            Expense.status == ExpenseStatus.active,
            Expense.expense_date >= d_from,
            Expense.expense_date <= d_to,
        )

    today_sum = (await db.execute(period_q(today, today))).scalar_one()
    week_sum = (await db.execute(period_q(week_start, today))).scalar_one()
    month_sum = (await db.execute(period_q(month_start, today))).scalar_one()
    all_sum = (await db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.user_id == db_user.id, Expense.status == ExpenseStatus.active
        )
    )).scalar_one()

    summary = {
        "today": today_sum, "this_week": week_sum,
        "this_month": month_sum, "all_time": all_sum,
    }
    text = format_stats_message(summary)

    if isinstance(event, CallbackQuery):
        await event.message.edit_text(text, parse_mode="HTML", reply_markup=main_menu_keyboard())
        await event.answer()
    else:
        await event.answer(text, parse_mode="HTML", reply_markup=main_menu_keyboard())
