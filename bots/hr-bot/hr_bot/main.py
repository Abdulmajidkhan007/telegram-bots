"""Kirish nuqtasi: python -m hr_bot.main"""
import asyncio
import html
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.exceptions import TelegramAPIError
from aiogram.fsm.storage.memory import MemoryStorage

from . import config, repo, repo_billing
from .ai import Scorer
from .db import init_db, make_engine
from .handlers import admin, candidate, hr, owner, payment, start
from .handlers.common import LangMiddleware, fmt_date
from .texts import t

log = logging.getLogger("hr_bot")

HOUSEKEEPING_EVERY = 3600  # soniya


def build_dispatcher(sessionmaker, cfg, scorer) -> Dispatcher:
    """Bir jarayonda bir marta chaqiriladi: aiogram router'ni ikki Dispatcher'ga ulamaydi."""
    dp = Dispatcher(storage=MemoryStorage(), sessionmaker=sessionmaker, cfg=cfg, scorer=scorer)
    dp.message.outer_middleware(LangMiddleware())
    dp.callback_query.outer_middleware(LangMiddleware())
    dp.pre_checkout_query.outer_middleware(LangMiddleware())
    # Tartib: buyruqlar (start/admin/owner) avval; to'lov xizmat xabari nomzod FSM'iga
    # tushmasin; nomzodning "istalgan xabar" qadami eng oxirida — buyruqni yutib yubormasin.
    for r in (start.router, admin.router, owner.router, payment.router, hr.router, candidate.router):
        dp.include_router(r)
    return dp


async def make_scorer(cfg) -> Scorer | None:
    if not cfg.gemini_api_key or cfg.ai_daily_limit == 0:
        log.warning("AI o'chiq (GEMINI_API_KEY bo'sh yoki AI_DAILY_LIMIT=0) — ball 'hisoblanmadi' bo'ladi")
        return None
    from google import genai
    from google.genai import errors

    scorer = Scorer(genai.Client(api_key=cfg.gemini_api_key), cfg.gemini_model)
    try:
        await scorer.check_model()
    except errors.ClientError as e:
        # 404/400 — model nomi yoki kalit xato: bu sozlama xatosi, jim davom etmaymiz.
        raise SystemExit(f"❌ Gemini tekshiruvdan o'tmadi (GEMINI_API_KEY yoki GEMINI_MODEL={cfg.gemini_model!r}): {e}")
    except Exception as e:  # tarmoq — bot AI'siz ham ishlashi kerak
        log.warning("Gemini modelini tekshirib bo'lmadi (%s: %s) — AI chaqiruvlarida qayta uriniladi",
                    type(e).__name__, e)
    log.info("AI: %s, kunlik limit %d", cfg.gemini_model, cfg.ai_daily_limit)
    return scorer


async def housekeeping_once(bot: Bot, sessionmaker, cfg) -> None:
    async with sessionmaker() as s:
        ochirildi = await repo.purge_expired_cvs(s, cfg.cv_retention_days)
        muddati_otgan = await repo.overdue_vacancies(s)
        await s.commit()
    if ochirildi:
        log.info("Saqlash muddati: %d ta CV o'chirildi", ochirildi)
    async with sessionmaker() as s:
        tugayotganlar = await repo_billing.expiry_notices(s, cfg.expiry_remind_days)
        await s.commit()
    for company, bosqich, egalar in tugayotganlar:
        for uid in egalar:
            async with sessionmaker() as s:
                u = await s.get(repo.User, uid)
            try:
                await bot.send_message(uid, t(u.lang if u else "uz", f"expiry_{bosqich}", name=html.escape(company.name),
                                              date=fmt_date(company.active_until)))
            except TelegramAPIError as e:
                log.warning("Obuna eslatmasi ketmadi (user %s): %s", uid, e)
    for vacancy, azolar, n in muddati_otgan:
        if n == 0:
            continue
        for uid in azolar:
            async with sessionmaker() as s:
                u = await s.get(repo.User, uid)
            try:
                await bot.send_message(uid, t(u.lang if u else "uz", "deadline_passed", title=html.escape(vacancy.title), n=n))
            except TelegramAPIError as e:
                log.warning("Muddat eslatmasi ketmadi (user %s): %s", uid, e)


async def housekeeping_loop(bot: Bot, sessionmaker, cfg) -> None:
    while True:
        try:
            await housekeeping_once(bot, sessionmaker, cfg)
        except Exception:
            # Bitta yiqilish keyingi soatdagi CV o'chirishni to'xtatmasin — lekin jim emas.
            log.exception("Rejalashtirilgan vazifa yiqildi")
        await asyncio.sleep(HOUSEKEEPING_EVERY)


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(name)s | %(message)s")
    cfg = config.load()
    engine = make_engine(cfg.database_url)
    sessionmaker = await init_db(engine)
    scorer = await make_scorer(cfg)
    bot = Bot(cfg.bot_token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = build_dispatcher(sessionmaker, cfg, scorer)
    vazifa = None
    try:
        me = await bot.get_me()
        log.info("@%s ishga tushdi; adminlar: %d ta", me.username, len(cfg.admin_ids))
        vazifa = asyncio.create_task(housekeeping_loop(bot, sessionmaker, cfg))
        await dp.start_polling(bot)
    finally:
        if vazifa:
            vazifa.cancel()
        await bot.session.close()
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
