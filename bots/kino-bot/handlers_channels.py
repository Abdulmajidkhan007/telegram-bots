# ============================================================
#  HANDLERS_CHANNELS.PY — Majburiy obuna kanallari paneli (adminlar)
# ============================================================
# Boshqa botlardagi (anonim-bot) kabi: bitta panelda ro'yxat, har birining
# yonida 🗑, pastda "➕ Yangi kanal". Qo'shimcha: har kanal yonida bot o'sha
# yerda adminmi — admin bo'lmasa obunani tekshirib bo'lmaydi va bu darhol ko'rinadi.

import logging
import re

from aiogram import Bot, F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

import buttons as kb
import database as db
from common import AddChannel, IsAdmin, callback_int, h

logger = logging.getLogger(__name__)

router = Router(name="channels")
router.message.filter(IsAdmin())
router.callback_query.filter(IsAdmin())

_USERNAME_RE = re.compile(r"[A-Za-z][A-Za-z0-9_]{3,31}")
_ID_RE = re.compile(r"-100\d{5,15}")


def parse_channel_ref(text: str) -> str | int | None:
    """Admin yozgan matndan kanal manzilini oladi: @kanal, t.me/kanal yoki -100… ID.

    Taklif havolasi (t.me/+…) qabul qilinmaydi — undan kanalni aniqlab bo'lmaydi;
    bunday kanal uchun undan xabar forward qilinadi.
    """
    t = (text or "").strip()
    if _ID_RE.fullmatch(t):
        return int(t)
    t = re.sub(r"^(https?://)?(t\.me|telegram\.me)/", "", t).lstrip("@").split("?")[0].strip("/")
    return f"@{t}" if _USERNAME_RE.fullmatch(t) else None


async def _bot_holati(bot: Bot, chat_id: int) -> str:
    try:
        me = await bot.get_chat_member(chat_id, bot.id)
    except Exception as e:
        logger.warning("Kanal holatini olib bo'lmadi [%s]: %s", chat_id, e)
        return "❌ bot kanalda yo'q — obuna tekshirilmaydi"
    if me.status in ("administrator", "creator"):
        return "✅ bot admin"
    return "⚠️ bot admin emas — obuna tekshirilmaydi"


async def _panel(bot: Bot) -> tuple[str, object]:
    channels = db.get_channels()
    text = f"📡 <b>Majburiy obuna kanallari</b> ({len(channels)})\n\n"
    if not channels:
        text += "<i>Kanal yo'q — majburiy obuna o'chiq.</i>\n"
    for i, ch in enumerate(channels, 1):
        nom = h(ch.get("title") or "—")
        uname = h(ch.get("username") or "")
        text += f"{i}. <b>{nom}</b> {uname} <code>{ch['chat_id']}</code>\n    {await _bot_holati(bot, ch['chat_id'])}\n"
    text += "\nO'chirish uchun 🗑 ni bosing."
    return text, kb.channels_panel_keyboard(channels)


@router.message(F.text == "📡 Kanal boshqaruv")
async def channels_menu(message: Message, state: FSMContext, bot: Bot):
    await state.clear()
    text, markup = await _panel(bot)
    await message.answer(text, parse_mode="HTML", reply_markup=markup)


@router.callback_query(F.data == "ch:panel")
async def channels_refresh(callback: CallbackQuery, state: FSMContext, bot: Bot):
    await state.clear()
    text, markup = await _panel(bot)
    await callback.message.edit_text(text, parse_mode="HTML", reply_markup=markup)
    await callback.answer()


@router.callback_query(F.data.startswith("ch:rm:"))
async def channel_rm_ask(callback: CallbackQuery):
    chat_id = callback_int(callback.data, "ch:rm:")
    channel = next((c for c in db.get_channels() if c["chat_id"] == chat_id), None)
    if not channel:
        await callback.answer("❌ Kanal topilmadi!", show_alert=True)
        return
    await callback.message.edit_text(
        f"⚠️ <b>{h(channel.get('title') or chat_id)}</b> majburiy obunadan olib tashlansinmi?",
        parse_mode="HTML",
        reply_markup=kb.channel_rm_confirm_keyboard(chat_id),
    )


@router.callback_query(F.data.startswith("ch:rmy:"))
async def channel_rm_confirm(callback: CallbackQuery, bot: Bot):
    chat_id = callback_int(callback.data, "ch:rmy:")
    channel = db.remove_channel(chat_id) if chat_id is not None else None
    await callback.answer("✅ O'chirildi" if channel else "❌ Kanal topilmadi", show_alert=not channel)
    text, markup = await _panel(bot)
    await callback.message.edit_text(text, parse_mode="HTML", reply_markup=markup)


@router.callback_query(F.data == "ch:add")
async def channel_add_start(callback: CallbackQuery, state: FSMContext):
    await state.set_state(AddChannel.waiting_username)
    await callback.message.edit_text(
        "➕ <b>Yangi kanal</b>\n\n"
        "Quyidagilardan birini yuboring:\n"
        "• kanal username: <code>@mykino</code> yoki <code>t.me/mykino</code>\n"
        "• yopiq kanal bo'lsa — o'sha kanaldan istalgan postni <b>forward</b> qiling\n\n"
        "⚠️ Avval botni kanalga <b>admin</b> qilib qo'shing — aks holda obunani tekshira olmaydi.",
        parse_mode="HTML",
        reply_markup=kb.channel_add_cancel_keyboard(),
    )
    await callback.answer()


@router.message(AddChannel.waiting_username)
async def channel_add_process(message: Message, state: FSMContext, bot: Bot):
    if message.text == "🔙 Ortga":
        await state.clear()
        await message.answer("🏠 Asosiy menyu:", reply_markup=kb.admin_main_menu())
        return
    origin = message.forward_origin
    if origin is not None and getattr(origin, "chat", None) is not None:
        ref = origin.chat.id
    elif message.text and message.text not in kb.MENU_TEXTS:
        ref = parse_channel_ref(message.text)
        if ref is None:
            await message.answer("❌ Tushunmadim. @username, t.me/username yoki kanaldan forward yuboring.")
            return
    else:
        await message.answer("❌ @username yuboring yoki kanaldan postni forward qiling (yoki « Bekor).")
        return

    try:
        chat = await bot.get_chat(ref)
    except Exception as e:
        await message.answer(f"❌ Kanal topilmadi: <i>{h(e)}</i>\nBot o'sha kanalga qo'shilganmi?", parse_mode="HTML")
        return
    if chat.type not in ("channel", "supergroup", "group"):
        await message.answer("❌ Bu kanal yoki guruh emas.")
        return
    holat = await _bot_holati(bot, chat.id)
    if not holat.startswith("✅"):
        # Admin bo'lmagan kanalni qo'shmaymiz: avval aynan shu holat bo'lib,
        # kanal obunani tekshirishga xalaqit berib turgan.
        await message.answer(f"❌ <b>{h(chat.title or chat.id)}</b>: {holat}.\n"
                             "Botni kanalga admin qiling va qayta yuboring.", parse_mode="HTML")
        return
    if db.channel_exists(chat.id):
        await message.answer("⚠️ Bu kanal allaqachon ro'yxatda.")
        return

    username = f"@{chat.username}" if chat.username else ""
    try:
        link = (await bot.create_chat_invite_link(chat.id)).invite_link
    except Exception as e:
        logger.warning("Taklif havolasi yaratilmadi [%s]: %s", chat.id, e)
        link = f"https://t.me/{chat.username}" if chat.username else ""
    if not link:
        await message.answer("❌ Kanal uchun havola olib bo'lmadi: botga «Foydalanuvchilarni taklif qilish» "
                             "huquqini bering yoki kanalga username qo'ying.")
        return
    db.add_channel(chat_id=chat.id, username=username, title=chat.title or username, invite_link=link)
    await state.clear()
    await message.answer(f"✅ <b>{h(chat.title or username)}</b> qo'shildi.", parse_mode="HTML",
                         reply_markup=kb.admin_main_menu())
    text, markup = await _panel(bot)
    await message.answer(text, parse_mode="HTML", reply_markup=markup)
