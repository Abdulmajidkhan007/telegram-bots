"""Ommaviy xabar (vakansiya yopilganda rad xatlari).

Telegram limiti ~30 xabar/soniya; xavfsiz tomonda 20/s. Botni bloklagan
nomzod (403) — log + `undeliverable`, qolganlarga yuborish to'xtamaydi.
"""
import asyncio
import html
import logging
from collections.abc import Awaitable, Callable

from aiogram.exceptions import TelegramBadRequest, TelegramForbiddenError, TelegramRetryAfter

log = logging.getLogger(__name__)

PER_SECOND = 20


async def send_safe(bot, chat_id: int, text: str) -> bool:
    """True — yetkazildi. Faqat ID log'ga yoziladi (matn va ism — shaxsiy ma'lumot)."""
    for urinish in range(2):
        try:
            await bot.send_message(chat_id, text)
            return True
        except TelegramRetryAfter as e:
            log.warning("Telegram flood limit: %s s kutamiz (chat %s)", e.retry_after, chat_id)
            if urinish == 0:
                await asyncio.sleep(e.retry_after)
        except TelegramForbiddenError:
            log.info("Nomzod botni bloklagan: chat %s", chat_id)
            return False
        except TelegramBadRequest as e:
            log.warning("Yuborilmadi (chat %s): %s", chat_id, e.message)
            return False
    return False


async def broadcast(
    bot, items: list[tuple[int, int, str]], on_result: Callable[[int, bool], Awaitable[None]],
    per_second: int = PER_SECOND, sleep=asyncio.sleep,
) -> tuple[int, int]:
    """items: (ariza_id, chat_id, matn). Har natija on_result(ariza_id, ok) bilan yoziladi."""
    ok = fail = 0
    for i, (app_id, chat_id, text) in enumerate(items):
        if i and i % per_second == 0:
            await sleep(1)
        yetdi = await send_safe(bot, chat_id, text)
        await on_result(app_id, yetdi)
        ok += yetdi
        fail += not yetdi
    return ok, fail


def rejection_text(template: str, default: str, company: str, title: str) -> str:
    """HR shabloni bo'lsa — o'sha (HTML sifatida emas, oddiy matn), aks holda standart."""
    if template.strip():
        return html.escape(template.strip())
    return default.format(company=html.escape(company), title=html.escape(title))
