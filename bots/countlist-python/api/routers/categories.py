from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.database.connection import get_db
from api.database.models import Category, User
from api.middleware.auth import get_current_user
from api.schemas.group import CategoryCreate, CategoryOut

router = APIRouter(prefix="/categories", tags=["categories"])

SYSTEM_CATEGORIES = [
    {"name": "Oziq-ovqat", "icon": "🛒", "color": "#22c55e"},
    {"name": "Transport", "icon": "🚗", "color": "#3b82f6"},
    {"name": "Uy-ro'zg'or", "icon": "🏠", "color": "#f59e0b"},
    {"name": "Sog'liq", "icon": "💊", "color": "#ef4444"},
    {"name": "Ta'lim", "icon": "📚", "color": "#8b5cf6"},
    {"name": "Ko'ngilochar", "icon": "🎬", "color": "#ec4899"},
    {"name": "Kiyim-kechak", "icon": "👗", "color": "#06b6d4"},
    {"name": "Kommunal", "icon": "💡", "color": "#f97316"},
    {"name": "Aloqa", "icon": "📱", "color": "#6366f1"},
    {"name": "Boshqa", "icon": "📦", "color": "#94a3b8"},
]


@router.get("", response_model=list[CategoryOut])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Category).where(
            (Category.is_system == True) | (Category.created_by_id == current_user.id)
        ).order_by(Category.is_system.desc(), Category.name)
    )
    return [CategoryOut.model_validate(c) for c in result.scalars().all()]


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cat = Category(**payload.model_dump(), created_by_id=current_user.id)
    db.add(cat)
    await db.flush()
    return CategoryOut.model_validate(cat)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Category).where(
            Category.id == category_id,
            Category.created_by_id == current_user.id,
            Category.is_system == False,
        )
    )
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    await db.delete(cat)


async def seed_system_categories(db: AsyncSession):
    for cat_data in SYSTEM_CATEGORIES:
        result = await db.execute(select(Category).where(Category.name == cat_data["name"], Category.is_system == True))
        if not result.scalar_one_or_none():
            db.add(Category(**cat_data, is_system=True))
    await db.commit()
