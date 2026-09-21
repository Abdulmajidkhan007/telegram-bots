import asyncio
import logging
import os
import ssl

import certifi
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.client.session.aiohttp import AiohttpSession
from aiogram.enums import ParseMode

from bot.config import settings
from bot.database.connection import engine
from bot.database.models import Base
from bot.handlers import start, expenses, stats, callbacks
from bot.middlewares.db import DbMiddleware
from bot.middlewares.user import UserMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def build_session() -> AiohttpSession | None:
    """
    Build aiohttp session.
    Normal foydalanishda - None qaytariladi (aiogram default'ni ishlatadi).
    BOT_DISABLE_SSL_VERIFY=1 bo'lsa - SSL tekshirish o'chiriladi (faqat dev uchun).
    """
    if os.getenv("BOT_DISABLE_SSL_VERIFY") != "1":
        return None

    logger.warning("⚠️  SSL verification DISABLED (development only)")
    ssl_context = ssl.create_default_context(cafile=certifi.where())
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    session = AiohttpSession()
    session._connector_init["ssl"] = ssl_context  # type: ignore[index]
    return session


async def setup_database() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ Database jadvallari tayyor")


async def main() -> None:
    await setup_database()

    session = build_session()
    bot_kwargs: dict = {
        "token": settings.bot_token,
        "default": DefaultBotProperties(parse_mode=ParseMode.HTML),
    }
    if session is not None:
        bot_kwargs["session"] = session

    bot = Bot(**bot_kwargs)
    dp = Dispatcher()

    dp.update.middleware(DbMiddleware())
    dp.update.middleware(UserMiddleware())

    dp.include_router(start.router)
    dp.include_router(expenses.router)
    dp.include_router(stats.router)
    dp.include_router(callbacks.router)

    me = await bot.get_me()
    logger.info("🤖 Bot ishga tushdi: @%s (%s)", me.username, me.full_name)

    try:
        await dp.start_polling(bot, allowed_updates=dp.resolve_used_update_types())
    finally:
        await bot.session.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Bot to'xtatildi")
