"""Handler'lar uchun umumiy: callback ma'lumotlari, til middleware, sana formati.

callback_data — aiogram CallbackData (pydantic): format va tur avtomatik
tekshiriladi, ichida faqat ID'lar (maxfiy ma'lumot yo'q). ID kelgani — huquq
degani emas: huquq har safar repo.* da qayta tekshiriladi.
"""
import html
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from aiogram import BaseMiddleware, F
from aiogram.filters.callback_data import CallbackData
from aiogram.types import TelegramObject

from .. import repo
from ..db import aware
from ..texts import lang_of

log = logging.getLogger(__name__)

# O'zbekistonda yozgi vaqt yo'q — doimiy UTC+5 (tzdata'siz Termux'da ham ishlaydi).
TASHKENT = timezone(timedelta(hours=5))


def fmt_date(dt: datetime) -> str:
    return aware(dt).astimezone(TASHKENT).strftime("%d.%m.%Y %H:%M")


def esc(s: str | None) -> str:
    return html.escape(s or "")


# FSM matn qadamlari buyruqlarni yutib yubormasin: "/panel" vakansiya nomi bo'lib qolmasin.
TEXT = F.text & ~F.text.startswith("/")


class RoleCb(CallbackData, prefix="r"):
    role: str  # owner/hr/candidate/lang


class CompanyCb(CallbackData, prefix="c"):
    action: str  # vac/new/invite/pay/stars/card/biz
    company_id: int


class VacancyCb(CallbackData, prefix="v"):
    action: str  # apps/close/closeyes
    vacancy_id: int


class AppCb(CallbackData, prefix="a"):
    action: str  # open/invite/reject/later
    app_id: int


class ApplyCb(CallbackData, prefix="ap"):
    action: str  # agree/nolinks
    vacancy_id: int


class AdminCb(CallbackData, prefix="ad"):
    action: str  # activate/block
    company_id: int


class PayCb(CallbackData, prefix="p"):
    action: str  # approve/reject/refund
    payment_id: int


class BizCb(CallbackData, prefix="b"):
    company_id: int
    # connection_id (Telegram bergan, uzunligi noma'lum) callback'ga sig'masligi mumkin —
    # shuning uchun bu yerda yo'q: ulanish foydalanuvchi ID'si bo'yicha bazadan topiladi.


class LangMiddleware(BaseMiddleware):
    """Har update'da foydalanuvchini bazaga yozadi va `lang` ni handler'ga beradi."""

    async def __call__(self, handler, event: TelegramObject, data: dict[str, Any]):
        user = data.get("event_from_user")
        if user is None:
            return await handler(event, data)
        async with data["sessionmaker"]() as s:
            mavjud = await s.get(repo.User, user.id)
            lang = mavjud.lang if mavjud else lang_of(user.language_code)
            await repo.ensure_user(s, user.id, user.full_name, lang)
            await s.commit()
        data["lang"] = lang
        return await handler(event, data)
