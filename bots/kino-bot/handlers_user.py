# ============================================================
#  HANDLERS_USER.PY — Foydalanuvchi qismi
# ============================================================
# Bu router admin router'idan KEYIN ulanadi (main.py): admin xabarlari avval
# o'sha yerda ko'riladi, ushlanmaganlari bu yerga tushadi.

import logging

from aiogram import Bot, F, Router
from aiogram.exceptions import TelegramBadRequest
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message, ReplyKeyboardRemove

import buttons as kb
import database as db
from common import MovieSearch, check_subscription, h, send_movie

logger = logging.getLogger(__name__)

router = Router(name="user")


async def _not_found(message: Message, code: str) -> None:
    await message.answer(f"❌ <b>{h(code)}</b> kodli kino topilmadi.\n/help — admin bilan bog'lanish",
                         parse_mode="HTML")


@router.message(CommandStart())
async def cmd_start(message: Message):
    user = message.from_user
    if message.chat.type in ("group", "supergroup"):
        db.register_group(message.chat.id, message.chat.title or "")
        return
    db.register_user(user.id, user.username or "", user.full_name)
    # /start da obuna TEKSHIRILMAYDI — faqat salomlashadi
    if db.is_admin(user.id):
        await message.answer(
            f"👋 Salom, <b>{h(user.full_name)}</b>!\n\n🎬 <b>Kino Bot Admin Paneliga xush kelibsiz!</b>",
            parse_mode="HTML",
            reply_markup=kb.admin_main_menu(),
        )
    else:
        await message.answer(
            f"👋 Salom, <b>{h(user.full_name)}</b>!\n\n🎬 <b>Kino Botga xush kelibsiz!</b>\nKino kodini yuboring! 🍿",
            parse_mode="HTML",
            reply_markup=kb.user_main_menu(),
        )


@router.message(Command("kino"))
async def cmd_kino(message: Message, state: FSMContext, bot: Bot):
    subscribed, not_subbed = await check_subscription(bot, message.from_user.id)
    if not subscribed:
        await message.answer("⚠️ <b>Avval kanallarga obuna bo'ling:</b>", parse_mode="HTML",
                             reply_markup=kb.subscription_keyboard(not_subbed))
        return
    await state.set_state(MovieSearch.waiting_code)
    await message.answer("🔢 Kino kodini kiriting:", reply_markup=ReplyKeyboardRemove())


@router.message(Command("help"))
async def cmd_help(message: Message, bot: Bot):
    admins = db.get_all_admins()
    main_admin = admins[0]["id"] if admins else db.super_admin_id()
    try:
        chat = await bot.get_chat(main_admin)
        username = getattr(chat, "username", None)
    except Exception as e:
        logger.warning("Admin profilini olib bo'lmadi [%s]: %s", main_admin, e)
        username = None
    url = f"https://t.me/{username}" if username else f"tg://user?id={main_admin}"
    label = f"👑 @{username}" if username else "👑 Admin"
    await message.answer("ℹ️ <b>Yordam kerakmi?</b>\nAdmin bilan bog'lanish uchun tugmani bosing:",
                         parse_mode="HTML", reply_markup=kb.admin_contact_keyboard(url, label))


@router.callback_query(F.data == "check_sub")
async def check_sub_callback(callback: CallbackQuery, bot: Bot):
    subscribed, not_subbed = await check_subscription(bot, callback.from_user.id)
    if not subscribed:
        await callback.answer("❌ Hali obuna bo'lmadingiz!", show_alert=True)
        try:
            await callback.message.edit_reply_markup(reply_markup=kb.subscription_keyboard(not_subbed))
        except TelegramBadRequest as e:
            # Odatda "message is not modified" — kanallar ro'yxati o'zgarmagan.
            logger.debug("Obuna tugmalari yangilanmadi: %s", e)
        return
    await callback.message.delete()
    user = callback.from_user
    menu = kb.admin_main_menu() if db.is_admin(user.id) else kb.user_main_menu()
    await callback.message.answer(
        f"✅ Obuna tasdiqlandi! Xush kelibsiz, <b>{h(user.full_name)}</b>!\n🎬 Kino kodini yuboring:",
        parse_mode="HTML",
        reply_markup=menu,
    )


@router.callback_query(F.data == "noop")
async def noop(callback: CallbackQuery):
    await callback.answer()


@router.message(MovieSearch.waiting_code)
async def movie_search_handler(message: Message, state: FSMContext, bot: Bot):
    if not message.text:
        # Avval stiker yoki rasm kelsa message.text None bo'lib, handler yiqilardi.
        await message.answer("🔢 Kino kodini matn qilib yuboring:")
        return
    await state.clear()
    code = message.text.strip()
    if not await send_movie(bot, message.chat.id, code):
        await _not_found(message, code)


@router.message(F.text == "🔙 Ortga")
async def go_back(message: Message, state: FSMContext):
    await state.clear()
    await message.answer("🏠 Asosiy menyu:", reply_markup=kb.user_main_menu())


# ═══════════════════════════════════════════════
#  OXIRGI: istalgan matn = kino kodi (faqat user)
#  Bu handler ENG OXIRDA bo'lishi shart!
# ═══════════════════════════════════════════════

@router.message(F.text)
async def handle_any_text(message: Message, bot: Bot):
    if db.is_admin(message.from_user.id):
        return   # adminlar uchun /kino bor
    if message.chat.type != "private":
        return
    if message.text.startswith("/"):
        # /restore kabi buyruq kino kodi sifatida izlanmasin.
        await message.answer("❓ Bunday buyruq yo'q. Kino kodini yuboring yoki /help.")
        return
    subscribed, not_subbed = await check_subscription(bot, message.from_user.id)
    if not subscribed:
        await message.answer("⚠️ <b>Avval kanallarga obuna bo'ling:</b>", parse_mode="HTML",
                             reply_markup=kb.subscription_keyboard(not_subbed))
        return
    code = message.text.strip()
    if not await send_movie(bot, message.chat.id, code):
        await _not_found(message, code)
