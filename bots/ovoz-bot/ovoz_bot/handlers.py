"""Telegram handler'lari: ovoz → matn, matn → ovoz, /voice, /limit."""
import html
import io
import logging

from aiogram import Bot, F, Router
from aiogram.enums import ChatAction
from aiogram.exceptions import TelegramBadRequest
from aiogram.filters import Command, CommandStart
from aiogram.filters.callback_data import CallbackData
from aiogram.types import BufferedInputFile, CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message

from . import audio, voices
from .gemini import Busy, GeminiError
from .text import check_tts_text, split_text
from .texts import t

log = logging.getLogger(__name__)
router = Router(name="ovoz")

# Rasmiy Bot API (getFile): "bots can download files of up to 20MB in size".
MAX_DOWNLOAD = 20 * 1024 * 1024


class VoiceCb(CallbackData, prefix="vc"):
    name: str


def media_of(message: Message) -> tuple[object, str] | None:
    """Xabardagi audio: (fayl obyekti, mime). Audio bo'lmasa None."""
    if message.voice:
        return message.voice, message.voice.mime_type or "audio/ogg"
    if message.video_note:
        return message.video_note, "video/mp4"
    if message.audio:
        return message.audio, message.audio.mime_type or "audio/mpeg"
    if message.video:
        return message.video, message.video.mime_type or "video/mp4"
    doc = message.document
    if doc and (doc.mime_type or "").split("/")[0] in ("audio", "video"):
        return doc, doc.mime_type
    return None


def _reason(e: Exception) -> str:
    return html.escape(str(e)[:200])


@router.message(CommandStart())
@router.message(Command("help"))
async def start(message: Message, cfg):
    await message.answer(t("start", max_chars=cfg.tts_max_chars, limit=cfg.daily_limit))


@router.message(Command("limit"))
async def limit(message: Message, cfg, store):
    if message.from_user.id in cfg.admin_ids:
        await message.answer(t("limit_admin"))
    else:
        await message.answer(t("limit_info", used=store.used(message.from_user.id), limit=cfg.daily_limit))


@router.message(Command("voice"))
async def choose_voice(message: Message, cfg, store):
    joriy = store.get_voice(message.from_user.id) or cfg.default_voice
    kb = [[InlineKeyboardButton(text=("✅ " if v == joriy else "") + v, callback_data=VoiceCb(name=v).pack())]
          for v in voices.VOICES]
    await message.answer(t("voice_choose", voice=joriy), reply_markup=InlineKeyboardMarkup(inline_keyboard=kb))


@router.callback_query(VoiceCb.filter())
async def set_voice(call: CallbackQuery, callback_data: VoiceCb, store):
    # callback_data foydalanuvchi qo'lida — ro'yxatda bo'lmagan nom qabul qilinmaydi.
    if not voices.is_known(callback_data.name):
        await call.answer(t("voice_unknown"), show_alert=True)
        return
    store.set_voice(call.from_user.id, callback_data.name)
    await call.answer(t("voice_set", voice=callback_data.name))


def _allowed(user_id: int, cfg, store) -> bool:
    return store.consume(user_id, cfg.daily_limit, unlimited=user_id in cfg.admin_ids)


@router.message(F.voice | F.video_note | F.audio | F.video | F.document)
async def speech_to_text(message: Message, bot: Bot, cfg, store, gemini):
    topildi = media_of(message)
    if topildi is None:
        await message.answer(t("not_audio"))
        return
    fayl, mime = topildi
    hajm = getattr(fayl, "file_size", None) or 0
    if hajm > MAX_DOWNLOAD:
        await message.answer(t("too_big", mb=round(hajm / 1024 / 1024, 1)))
        return
    uid = message.from_user.id
    if not _allowed(uid, cfg, store):
        await message.answer(t("limit_reached", limit=cfg.daily_limit))
        return
    await bot.send_chat_action(message.chat.id, ChatAction.TYPING)
    buf = io.BytesIO()
    try:
        await bot.download(fayl, destination=buf)
    except TelegramBadRequest as e:
        store.refund(uid)
        log.warning("Yuklab bo'lmadi (user %s): %s", uid, e.message)
        await message.answer(t("download_failed"))
        return
    try:
        matn = await gemini.transcribe(buf.getvalue(), mime)
    except Busy:
        store.refund(uid)
        await message.answer(t("busy"))
        return
    except GeminiError as e:
        store.refund(uid)
        log.warning("STT xatosi (user %s): %s", uid, e)
        await message.answer(t("stt_failed", reason=_reason(e)))
        return
    if not matn:
        await message.answer(t("no_speech"))
        return
    for bolak in split_text(matn):
        # Transkripsiya — foydalanuvchi aytgan gap; HTML sifatida talqin qilinmasin.
        await message.reply(html.escape(bolak))


@router.message(F.text & ~F.text.startswith("/"))
async def text_to_speech(message: Message, bot: Bot, cfg, store, gemini):
    sabab = check_tts_text(message.text, cfg.tts_max_chars)
    if sabab:
        await message.answer(t(sabab, n=len(message.text or ""), max_chars=cfg.tts_max_chars))
        return
    uid = message.from_user.id
    if not _allowed(uid, cfg, store):
        await message.answer(t("limit_reached", limit=cfg.daily_limit))
        return
    await bot.send_chat_action(message.chat.id, ChatAction.RECORD_VOICE)
    ovoz = store.get_voice(uid) or cfg.default_voice
    try:
        wav = await gemini.synthesize(message.text, ovoz)
        ogg = await audio.to_ogg_opus(cfg.ffmpeg, wav)
    except Busy:
        store.refund(uid)
        await message.answer(t("busy"))
        return
    except (GeminiError, audio.AudioError) as e:
        store.refund(uid)
        log.warning("TTS xatosi (user %s): %s", uid, e)
        await message.answer(t("tts_failed", reason=_reason(e)))
        return
    await message.answer_voice(BufferedInputFile(ogg, filename="ovoz.ogg"), caption=t("ai_caption"))
