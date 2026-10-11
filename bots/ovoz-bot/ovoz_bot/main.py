"""Kirish nuqtasi: python -m ovoz_bot.main"""
import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode

from . import config, voices
from .gemini import Gemini
from .handlers import router
from .store import Store

log = logging.getLogger("ovoz_bot")


def build_dispatcher(cfg, store, gemini) -> Dispatcher:
    """Bir jarayonda bir marta: aiogram router'ni ikki Dispatcher'ga ulamaydi."""
    dp = Dispatcher(cfg=cfg, store=store, gemini=gemini)
    dp.include_router(router)
    return dp


async def check_gemini(gemini: Gemini, cfg) -> None:
    from google.genai import errors

    try:
        await gemini.check_models()
    except errors.ClientError as e:
        # Model nomi yoki kalit xato — sozlama xatosi, jim davom etmaymiz.
        raise SystemExit(
            f"❌ Gemini tekshiruvdan o'tmadi (GEMINI_API_KEY yoki modellar: {cfg.stt_model}, "
            f"{cfg.stt_fallback}, {cfg.tts_model}): {e}")
    except Exception as e:  # tarmoq — so'rovlarda qayta uriniladi
        log.warning("Gemini modellarini tekshirib bo'lmadi (%s: %s)", type(e).__name__, e)


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(name)s | %(message)s")
    cfg = config.load()
    if not voices.is_known(cfg.default_voice):
        raise SystemExit(f"❌ TTS_DEFAULT_VOICE={cfg.default_voice!r} noma'lum. Mavjud: {', '.join(voices.VOICES)}")
    from google import genai

    gemini = Gemini(genai.Client(api_key=cfg.gemini_api_key), cfg.stt_model, cfg.stt_fallback, cfg.tts_model)
    await check_gemini(gemini, cfg)
    store = Store(cfg.db_path)
    bot = Bot(cfg.bot_token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = build_dispatcher(cfg, store, gemini)
    try:
        me = await bot.get_me()
        log.info("@%s ishga tushdi: STT %s (zaxira %s), TTS %s, limit %d/kun",
                 me.username, cfg.stt_model, cfg.stt_fallback, cfg.tts_model, cfg.daily_limit)
        await dp.start_polling(bot)
    finally:
        await bot.session.close()
        store.close()


if __name__ == "__main__":
    asyncio.run(main())
