from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.database.connection import get_db
from api.database.models import User
from api.middleware.auth import (
    create_access_token, hash_password, verify_password,
    verify_telegram_auth, get_current_user
)
from api.schemas.user import TokenPair, LoginRequest, BotAuthRequest, UserOut, UserCreate

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/telegram", response_model=TokenPair)
async def telegram_login(data: BotAuthRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate via Telegram Login Widget."""
    auth_data = data.model_dump(exclude_none=True)
    if not verify_telegram_auth(auth_data):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Telegram auth data")

    result = await db.execute(select(User).where(User.telegram_id == data.telegram_id))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            telegram_id=data.telegram_id,
            first_name=data.first_name,
            last_name=data.last_name,
            username=data.username,
        )
        db.add(user)
        await db.flush()

    token = create_access_token({"sub": str(user.id)})
    return TokenPair(access_token=token, user=UserOut.model_validate(user))


@router.post("/bot-login", response_model=TokenPair)
async def bot_login(data: dict, db: AsyncSession = Depends(get_db)):
    """Internal bot endpoint to issue tokens. Protected by bot secret."""
    telegram_id = data.get("telegram_id")
    if not telegram_id:
        raise HTTPException(status_code=400, detail="telegram_id required")

    result = await db.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    token = create_access_token({"sub": str(user.id)})
    return TokenPair(access_token=token, user=UserOut.model_validate(user))


@router.post("/register", response_model=TokenPair)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.telegram_id == payload.telegram_id))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="User already exists")

    user = User(
        telegram_id=payload.telegram_id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        username=payload.username,
        language_code=payload.language_code,
        hashed_password=hash_password(payload.password) if payload.password else None,
    )
    db.add(user)
    await db.flush()

    token = create_access_token({"sub": str(user.id)})
    return TokenPair(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
