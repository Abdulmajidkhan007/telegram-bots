# ============================================================
#  HANDLERS_SUPPORT.PY — /help: foydalanuvchi murojaati → admin → javob
# ============================================================
# Avval /help admin username'ini tugma qilib ko'rsatardi — admin shaxsiy
# akkaunti hammaga ochiq edi. Endi foydalanuvchi bot ichida xabar qoldiradi,
# xabar adminlarga BOT orqali keladi, admin ham bot orqali javob beradi.

import logging
import time

from aiogram import Bot, F, Router
from aiogram.exceptions import TelegramForbiddenError
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

import buttons as kb
import database as db
from common import IsAdmin, Support, callback_int, h

logger = logging.getLogger(__name__)

user_router = Router(name="support_user")
admin_router = Router(name="support_admin")
admin_router.message.filter(IsAdmin())
admin_router.callback_query.filter(IsAdmin())


class Cooldown:
    """Bir foydalanuvchidan murojaatlar orasida kamida N soniya — adminni spamdan saqlaydi."""

    def __init__(self, seconds: int):
        self.seconds = seconds
        self._last: dict[int, float] = {}

    def remaining(self, user_id: int, now: float | None = None) -> int:
        now = time.monotonic() if now is None else now
        last = self._last.get(user_id)
        return 0 if last is None else max(0, int(self.seconds - (now - last) + 0.999))

    def mark(self, user_id: int, now: float | None = None) -> None:
        self._last[user_id] = time.monotonic() if now is None else now


COOLDOWN = Cooldown(60)


def _recipients() -> list[int]:
    ids = [db.super_admin_id()] + [a["id"] for a in db.get_all_admins()]
    return list(dict.fromkeys(i for i in ids if i))   # tartibni saqlab, takrorsiz


# ── Foydalanuvchi ──

@user_router.message(Command("help", "yordam"))
async def cmd_help(message: Message, state: FSMContext):
    if message.chat.type != "private":
        return
    await state.set_state(Support.waiting_message)
    await message.answer(
        "📩 <b>Adminga xabar</b>\n\n"
        "Savolingiz yoki taklifingizni bitta xabarda yozing — matn, rasm yoki ovozli xabar bo'lishi mumkin. "
        "Javob shu bot orqali keladi.",
        parse_mode="HTML",
        reply_markup=kb.support_cancel_keyboard(),
    )


@user_router.callback_query(F.data == "sp:cancel")
async def support_cancel(callback: CallbackQuery, state: FSMContext):
    await state.clear()
    await callback.message.edit_text("❌ Bekor qilindi.")
    await callback.answer()


@user_router.message(Support.waiting_message)
async def support_message(message: Message, state: FSMContext, bot: Bot):
    if message.text and message.text.startswith("/"):
        await state.clear()
        await message.answer("❌ Murojaat bekor qilindi.")
        return
    user = message.from_user
    wait = COOLDOWN.remaining(user.id)
    if wait:
        await message.answer(f"⏳ Keyingi xabarni {wait} soniyadan keyin yuborishingiz mumkin.")
        return

    header = (
        "📩 <b>Yangi murojaat</b>\n"
        f"👤 {h(user.full_name)}"
        f"{' (@' + h(user.username) + ')' if user.username else ''}\n"
        f"🆔 <code>{user.id}</code>"
    )
    yetdi = 0
    for admin_id in _recipients():
        try:
            await bot.send_message(admin_id, header, parse_mode="HTML",
                                   reply_markup=kb.support_reply_keyboard(user.id))
            await bot.copy_message(admin_id, message.chat.id, message.message_id)
            yetdi += 1
        except Exception as e:
            # Admin botni hali /start qilmagan yoki bloklagan bo'lishi mumkin.
            logger.warning("Murojaat adminga yetmadi [%s]: %s", admin_id, e)
    await state.clear()
    if yetdi:
        COOLDOWN.mark(user.id)
        await message.answer("✅ Xabaringiz adminga yuborildi. Javob shu yerga keladi.")
    else:
        logger.error("Murojaat hech bir adminga yetmadi (foydalanuvchi %s)", user.id)
        await message.answer("❌ Hozir adminga yetkazib bo'lmadi. Birozdan keyin /help ni qayta bosing.")


# ── Admin javobi ──

@admin_router.callback_query(F.data.startswith("sp:r:"))
async def reply_start(callback: CallbackQuery, state: FSMContext):
    user_id = callback_int(callback.data, "sp:r:")
    if user_id is None:
        await callback.answer("❌ Noto'g'ri tugma", show_alert=True)
        return
    await state.set_state(Support.waiting_reply)
    await state.update_data(reply_to=user_id)
    await callback.message.answer(f"✍️ <code>{user_id}</code> ga javobingizni yozing "
                                  "(matn, rasm, ovoz — istalgan format).",
                                  parse_mode="HTML", reply_markup=kb.support_cancel_keyboard())
    await callback.answer()


@admin_router.message(Support.waiting_reply)
async def reply_send(message: Message, state: FSMContext, bot: Bot):
    if message.text and (message.text == "🔙 Ortga" or message.text.startswith("/")):
        await state.clear()
        await message.answer("❌ Javob bekor qilindi.", reply_markup=kb.admin_main_menu())
        return
    user_id = (await state.get_data()).get("reply_to")
    await state.clear()
    if not user_id:
        await message.answer("⚠️ Kimga javob ekani topilmadi — «✍️ Javob berish» ni qayta bosing.")
        return
    try:
        await bot.send_message(user_id, "📬 <b>Admin javobi:</b>", parse_mode="HTML")
        await bot.copy_message(user_id, message.chat.id, message.message_id)
    except TelegramForbiddenError:
        await message.answer("❌ Yetmadi: foydalanuvchi botni bloklagan.", reply_markup=kb.admin_main_menu())
        return
    except Exception as e:
        logger.warning("Javob yetmadi [%s]: %s", user_id, e)
        await message.answer(f"❌ Yetmadi: {h(e)}", parse_mode="HTML", reply_markup=kb.admin_main_menu())
        return
    await message.answer("✅ Javob yuborildi.", reply_markup=kb.admin_main_menu())
