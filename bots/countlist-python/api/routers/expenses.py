from datetime import date
from math import ceil
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.database.connection import get_db
from api.database.models import Expense, User, Category, ExpenseStatus
from api.middleware.auth import get_current_user
from api.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseOut, ExpenseListResponse

router = APIRouter(prefix="/expenses", tags=["expenses"])


def _expense_query_filters(
    q,
    user_id: Optional[int],
    group_id: Optional[int],
    category_id: Optional[int],
    month: Optional[int],
    year: Optional[int],
    date_from: Optional[date],
    date_to: Optional[date],
    search: Optional[str],
):
    conditions = [Expense.status == ExpenseStatus.active]
    if user_id:
        conditions.append(Expense.user_id == user_id)
    if group_id:
        conditions.append(Expense.group_id == group_id)
    if category_id:
        conditions.append(Expense.category_id == category_id)
    if month:
        conditions.append(Expense.month == month)
    if year:
        conditions.append(Expense.year == year)
    if date_from:
        conditions.append(Expense.expense_date >= date_from)
    if date_to:
        conditions.append(Expense.expense_date <= date_to)
    if search:
        conditions.append(Expense.description.ilike(f"%{search}%"))
    return q.where(and_(*conditions))


@router.get("", response_model=ExpenseListResponse)
async def list_expenses(
    group_id: Optional[int] = None,
    category_id: Optional[int] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    base_q = select(Expense).options(
        selectinload(Expense.category)
    ).order_by(Expense.expense_date.desc(), Expense.created_at.desc())

    base_q = _expense_query_filters(
        base_q, current_user.id, group_id, category_id,
        month, year, date_from, date_to, search
    )

    count_q = select(func.count()).select_from(
        _expense_query_filters(
            select(Expense),
            current_user.id, group_id, category_id,
            month, year, date_from, date_to, search
        ).subquery()
    )

    total_result = await db.execute(count_q)
    total = total_result.scalar_one()

    result = await db.execute(base_q.offset((page - 1) * size).limit(size))
    items = result.scalars().all()

    return ExpenseListResponse(
        items=[ExpenseOut.model_validate(e) for e in items],
        total=total,
        page=page,
        size=size,
        pages=ceil(total / size) if total else 1,
    )


@router.post("", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
async def create_expense(
    payload: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    exp_date = payload.expense_date or date.today()
    expense = Expense(
        user_id=current_user.id,
        group_id=payload.group_id,
        category_id=payload.category_id,
        amount=payload.amount,
        currency=payload.currency,
        description=payload.description,
        raw_text=payload.raw_text,
        expense_date=exp_date,
        month=exp_date.month,
        year=exp_date.year,
    )
    db.add(expense)
    await db.flush()
    await db.refresh(expense, ["category"])
    return ExpenseOut.model_validate(expense)


@router.get("/{expense_id}", response_model=ExpenseOut)
async def get_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Expense)
        .options(selectinload(Expense.category))
        .where(Expense.id == expense_id, Expense.user_id == current_user.id)
    )
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return ExpenseOut.model_validate(expense)


@router.patch("/{expense_id}", response_model=ExpenseOut)
async def update_expense(
    expense_id: int,
    payload: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Expense).where(Expense.id == expense_id, Expense.user_id == current_user.id)
    )
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(expense, field, value)

    if payload.expense_date:
        expense.month = payload.expense_date.month
        expense.year = payload.expense_date.year

    await db.flush()
    await db.refresh(expense, ["category"])
    return ExpenseOut.model_validate(expense)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Expense).where(Expense.id == expense_id, Expense.user_id == current_user.id)
    )
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    expense.status = ExpenseStatus.deleted
