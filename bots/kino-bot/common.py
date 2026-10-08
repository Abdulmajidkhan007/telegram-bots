# ============================================================
#  COMMON.PY — Holatlar, filtr va umumiy yordamchilar
# ============================================================

import logging
from html import escape

from aiogram import Bot
from aiogram.exceptions import TelegramBadRequest, TelegramForbiddenError
from aiogram.filters import BaseFilter
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, Message

import database as db

logger = logging.getLogger(__name__)


class MovieSearch(StatesGroup):
    waiting_code = State()

class AddMovie(StatesGroup):
    code        = State()
    name        = State()
    genre       = State()
    year        = State()
    quality     = State()
    description = State()
    video       = State()

class DeleteMovie(StatesGroup):
    waiting_code = State()

class Broadcast(StatesGroup):
    waiting_message = State()

class AddAdmin(StatesGroup):
    waiting_id   = State()
    waiting_name = State()

class AddChannel(StatesGroup):
    waiting_username = State()

class RestoreDb(StatesGroup):
    waiting_file = State()


class IsAdmin(BaseFilter):
    """Admin router'iga butunlay qo'yiladi.

    Avval tekshiruv faqat reply-tugma handlerlarida edi, inline tugmalarda
    (kino/admin/kanal o'chirish, reklama tasdiqlash) yo'q edi. callback_data ni
    mijoz o'zi yuboradi — o'zgartirilgan klient bilan oddiy foydalanuvchi
    "del_movie_yes_12" yuborib kinoni o'chira olardi.
    """

    async def __call__(self, event: Message | CallbackQuery) -> bool:
        user = event.from_user
        return bool(user) and db.is_admin(user.id)


def h(value) -> str:
    """HTML parse_mode uchun xavfsiz matn.

    Ism, kino nomi yoki foydalanuvchi yozgan kod ichida "<" bo'lsa, Telegram
    "can't parse entities" deb xabarni rad etardi va foydalanuvchi javobsiz qolardi.
    """
    return escape(str(value), quote=False)


def callback_int(data: str, prefix: str) -> int | None:
    """"del_channel_yes_-100123" → -100123; buzuq bo'lsa None (ValueError emas)."""
    raw = data.removeprefix(prefix)
    try:
        return int(raw)
    except ValueError:
        logger.warning("Noto'g'ri callback_data: %r", data)
        return None


def movie_caption(movie: dict, count: int) -> str:
    return (
        f"🎬 <b>{h(movie.get('name', ''))}</b>\n\n"
        f"🎭 Janr: <b>{h(movie.get('genre', ''))}</b>\n"
        f"📅 Yil: <b>{h(movie.get('year', ''))}</b>\n"
        f"📺 Sifat: <b>{h(movie.get('quality', ''))}</b>\n\n"
        f"📝 {h(movie.get('description', ''))}\n\n"
        f"⬇️ Yuklab olishlar: <b>{count}</b>"
    )


async def check_subscription(bot: Bot, user_id: int) -> tuple[bool, list]:
    channels = db.get_channels()
    not_subbed = []
    for ch in channels:
        try:
            member = await bot.get_chat_member(ch["chat_id"], user_id)
            if member.status in ("left", "kicked", "banned"):
                not_subbed.append(ch)
        except Exception as e:
            # Odatda: bot kanaldan chiqarilgan yoki admin emas. Avval bu jim
            # yutilardi — hamma foydalanuvchi "obuna bo'ling" da qolib ketar,
            # sababi esa hech qayerda ko'rinmasdi.
            logger.error("Obunani tekshirib bo'lmadi [%s]: %s — bot kanalda adminmi?", ch.get("username"), e)
            not_subbed.append(ch)
    return len(not_subbed) == 0, not_subbed


async def send_movie(bot: Bot, chat_id: int, code: str) -> bool:
    movie = db.get_movie(code)
    if not movie:
        return False
    downloads = db.get_download_stats()["by_movie"].get(code, 0)
    try:
        await bot.send_video(
            chat_id=chat_id,
            video=movie["video_file_id"],
            caption=movie_caption(movie, downloads + 1),
            parse_mode="HTML",
        )
    except Exception as e:
        logger.error("Kino yuborishda xatolik [%s]: %s", code, e)
        return False
    # Faqat yetib borgani sanaladi — avval xato bo'lsa ham sanalardi.
    db.increment_download(code)
    return True


def is_unreachable(err: Exception) -> bool:
    """Reklama paytida: bu chatga endi umuman yetib bo'lmaydimi (bloklagan / o'chgan)."""
    if isinstance(err, TelegramForbiddenError):
        return True
    return isinstance(err, TelegramBadRequest) and "chat not found" in str(err).lower()
