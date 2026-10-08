# ============================================================
#  MAIN.PY — Kirish nuqtasi: python main.py
# ============================================================

import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage

import database as db
import handlers_admin
import handlers_backup
import handlers_user

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


def build_dispatcher() -> Dispatcher:
    dp = Dispatcher(storage=MemoryStorage())
    # Tartib muhim: admin router avval. U IsAdmin bilan o'ralgan, shuning uchun
    # oddiy foydalanuvchi xabari undan o'tib, user router'ga (oxirida — "istalgan
    # matn = kino kodi") tushadi.
    dp.include_router(handlers_admin.router)
    dp.include_router(handlers_backup.router)
    dp.include_router(handlers_user.router)
    return dp


async def main():
    # config shu yerda: u import paytida .env ni talab qiladi, testlar esa
    # build_dispatcher() ni tokensiz chaqiradi.
    import config

    db.configure(config.DB_FILE, config.SUPER_ADMIN_ID)
    # Bazani darhol o'qib ko'ramiz: buzilgan bo'lsa bot birinchi foydalanuvchida
    # emas, shu yerda aniq xabar bilan to'xtaydi.
    data = db.load_db()
    logger.info("Baza: %s — %d kino, %d foydalanuvchi", config.DB_FILE, len(data["movies"]), len(data["users"]))

    bot = Bot(token=config.BOT_TOKEN)
    dp = build_dispatcher()
    await bot.delete_webhook(drop_pending_updates=True)
    logger.info("✅ Bot ishga tushdi!")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
