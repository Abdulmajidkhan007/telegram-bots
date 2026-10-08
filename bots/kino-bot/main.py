# ============================================================
#  MAIN.PY — Kirish nuqtasi: python main.py
# ============================================================

import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage

import common
import database as db
import handlers_admin
import handlers_backup
import handlers_channels
import handlers_user
import bot_profile

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
    # Kanallar paneli eng oldin: kanal kutish holatida menyu tugmasi bosilsa ham
    # o'sha holat handleri ushlaydi, holat "osilib" qolmaydi.
    dp.include_router(handlers_channels.router)
    dp.include_router(handlers_admin.router)
    dp.include_router(handlers_backup.router)
    dp.include_router(handlers_user.router)
    return dp


async def main():
    # config shu yerda: u import paytida .env ni talab qiladi, testlar esa
    # build_dispatcher() ni tokensiz chaqiradi.
    import config

    db.configure(config.DB_FILE, config.SUPER_ADMIN_ID)
    common.PROTECT_CONTENT = config.PROTECT_CONTENT
    # Bazani darhol o'qib ko'ramiz: buzilgan bo'lsa bot birinchi foydalanuvchida
    # emas, shu yerda aniq xabar bilan to'xtaydi.
    data = db.load_db()
    logger.info("Baza: %s — %d kino, %d foydalanuvchi", config.DB_FILE, len(data["movies"]), len(data["users"]))
    logger.info("Kontent himoyasi (forward/saqlash taqiqi): %s", "yoqilgan" if config.PROTECT_CONTENT else "o'chirilgan")

    bot = Bot(token=config.BOT_TOKEN)
    dp = build_dispatcher()
    await bot.delete_webhook(drop_pending_updates=True)
    await bot_profile.apply(bot, config.SUPER_ADMIN_ID)
    logger.info("✅ Bot ishga tushdi!")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
