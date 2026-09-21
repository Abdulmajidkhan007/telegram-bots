from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from api.database.models import MemberRole


class GroupCreate(BaseModel):
    telegram_id: int
    title: str
    description: Optional[str] = None
    currency: str = "UZS"
    timezone: str = "Asia/Tashkent"


class GroupUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    currency: Optional[str] = None
    timezone: Optional[str] = None
    is_active: Optional[bool] = None


class GroupMemberOut(BaseModel):
    id: int
    user_id: int
    username: Optional[str]
    first_name: str
    role: MemberRole
    joined_at: datetime

    model_config = {"from_attributes": True}


class GroupOut(BaseModel):
    id: int
    telegram_id: int
    title: str
    description: Optional[str]
    currency: str
    timezone: str
    is_active: bool
    member_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class LimitCreate(BaseModel):
    category_id: Optional[int] = None
    amount: float
    month: int
    year: int


class LimitOut(BaseModel):
    id: int
    group_id: int
    category_id: Optional[int]
    amount: float
    month: int
    year: int

    model_config = {"from_attributes": True}


class RecurringCreate(BaseModel):
    amount: float
    description: str
    category_id: Optional[int] = None
    group_id: Optional[int] = None
    period: str


class RecurringOut(BaseModel):
    id: int
    amount: float
    description: str
    period: str
    next_run: str
    is_active: bool
    category_id: Optional[int]

    model_config = {"from_attributes": True}


class CategoryCreate(BaseModel):
    name: str
    icon: str = "📦"
    color: str = "#6366f1"


class CategoryOut(BaseModel):
    id: int
    name: str
    icon: str
    color: str
    is_system: bool

    model_config = {"from_attributes": True}
