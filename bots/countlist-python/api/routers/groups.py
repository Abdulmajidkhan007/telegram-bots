from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.database.connection import get_db
from api.database.models import Group, GroupMember, MemberRole, MonthlyLimit, User
from api.middleware.auth import get_current_user
from api.schemas.group import GroupCreate, GroupOut, GroupUpdate, LimitCreate, LimitOut

router = APIRouter(prefix="/groups", tags=["groups"])


async def _get_group_or_404(group_id: int, db: AsyncSession) -> Group:
    result = await db.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group


@router.get("", response_model=list[GroupOut])
async def list_groups(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Group)
        .join(GroupMember, GroupMember.group_id == Group.id)
        .where(GroupMember.user_id == current_user.id, Group.is_active == True)
    )
    groups = result.scalars().all()
    out = []
    for g in groups:
        count_res = await db.execute(
            select(func.count()).where(GroupMember.group_id == g.id)
        )
        out.append(GroupOut(
            id=g.id, telegram_id=g.telegram_id, title=g.title,
            description=g.description, currency=g.currency,
            timezone=g.timezone, is_active=g.is_active,
            member_count=count_res.scalar_one(),
            created_at=g.created_at,
        ))
    return out


@router.post("", response_model=GroupOut, status_code=status.HTTP_201_CREATED)
async def create_group(
    payload: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    group = Group(**payload.model_dump())
    db.add(group)
    await db.flush()

    member = GroupMember(group_id=group.id, user_id=current_user.id, role=MemberRole.owner)
    db.add(member)
    await db.flush()

    return GroupOut(
        id=group.id, telegram_id=group.telegram_id, title=group.title,
        description=group.description, currency=group.currency,
        timezone=group.timezone, is_active=group.is_active,
        member_count=1, created_at=group.created_at,
    )


@router.patch("/{group_id}", response_model=GroupOut)
async def update_group(
    group_id: int,
    payload: GroupUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    group = await _get_group_or_404(group_id, db)
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(group, k, v)
    await db.flush()
    count = (await db.execute(select(func.count()).where(GroupMember.group_id == group_id))).scalar_one()
    return GroupOut(
        id=group.id, telegram_id=group.telegram_id, title=group.title,
        description=group.description, currency=group.currency,
        timezone=group.timezone, is_active=group.is_active,
        member_count=count, created_at=group.created_at,
    )


@router.post("/{group_id}/limits", response_model=LimitOut, status_code=status.HTTP_201_CREATED)
async def set_limit(
    group_id: int,
    payload: LimitCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_group_or_404(group_id, db)

    result = await db.execute(
        select(MonthlyLimit).where(
            MonthlyLimit.group_id == group_id,
            MonthlyLimit.category_id == payload.category_id,
            MonthlyLimit.month == payload.month,
            MonthlyLimit.year == payload.year,
        )
    )
    limit = result.scalar_one_or_none()
    if limit:
        limit.amount = payload.amount
    else:
        limit = MonthlyLimit(group_id=group_id, **payload.model_dump())
        db.add(limit)
    await db.flush()
    return LimitOut.model_validate(limit)


@router.get("/{group_id}/limits", response_model=list[LimitOut])
async def list_limits(
    group_id: int,
    month: int,
    year: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MonthlyLimit).where(
            MonthlyLimit.group_id == group_id,
            MonthlyLimit.month == month,
            MonthlyLimit.year == year,
        )
    )
    return [LimitOut.model_validate(l) for l in result.scalars().all()]
