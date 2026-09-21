from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class CategoryOut(BaseModel):
    id: int
    name: str
    icon: str
    color: str

    model_config = {"from_attributes": True}


class ExpenseCreate(BaseModel):
    amount: Decimal = Field(gt=0)
    currency: str = "UZS"
    description: str = Field(min_length=1, max_length=512)
    category_id: Optional[int] = None
    group_id: Optional[int] = None
    expense_date: Optional[date] = None
    raw_text: Optional[str] = None

    @field_validator("currency")
    @classmethod
    def uppercase_currency(cls, v: str) -> str:
        return v.upper()


class ExpenseUpdate(BaseModel):
    amount: Optional[Decimal] = Field(default=None, gt=0)
    description: Optional[str] = None
    category_id: Optional[int] = None
    expense_date: Optional[date] = None


class ExpenseOut(BaseModel):
    id: int
    amount: Decimal
    currency: str
    description: str
    expense_date: date
    month: int
    year: int
    category: Optional[CategoryOut] = None
    group_id: Optional[int] = None
    is_recurring: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ExpenseListResponse(BaseModel):
    items: list[ExpenseOut]
    total: int
    page: int
    size: int
    pages: int


class ExpenseFilter(BaseModel):
    user_id: Optional[int] = None
    group_id: Optional[int] = None
    category_id: Optional[int] = None
    month: Optional[int] = None
    year: Optional[int] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    search: Optional[str] = None
    page: int = Field(default=1, ge=1)
    size: int = Field(default=20, ge=1, le=100)
