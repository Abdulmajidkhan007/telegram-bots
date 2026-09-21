from typing import Any, Awaitable, Callable, Optional

from aiogram import BaseMiddleware
from aiogram.types import TelegramObject, Update
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from bot.database.models import User


class UserMiddleware(BaseMiddleware):
    """Register/fetch user from DB on every update."""

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        db: Optional[AsyncSession] = data.get("db")
        tg_user = None

        if isinstance(event, Update):
            if event.message and event.message.from_user:
                tg_user = event.message.from_user
            elif event.callback_query and event.callback_query.from_user:
                tg_user = event.callback_query.from_user

        if tg_user and db:
            result = await db.execute(select(User).where(User.telegram_id == tg_user.id))
            user = result.scalar_one_or_none()
            if not user:
                user = User(
                    telegram_id=tg_user.id,
                    first_name=tg_user.first_name or "",
                    last_name=tg_user.last_name,
                    username=tg_user.username,
                    language_code=tg_user.language_code or "uz",
                )
                db.add(user)
                await db.flush()
            data["db_user"] = user

        return await handler(event, data)
