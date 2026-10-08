# ============================================================
#  HANDLERS_ADMIN.PY — Admin paneli (faqat adminlar)
# ============================================================
# IsAdmin router'ning O'ZIGA qo'yilgan: har yangi handler avtomatik himoyalanadi,
# alohida "if not is_admin" yozishni unutib bo'lmaydi. Admin bo'lmagan
# foydalanuvchining xabari bu router'dan o'tib ketadi va handlers_user ga tushadi.

import asyncio
import logging

from aiogram import Bot, F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

import buttons as kb
import database as db
from common import (
    AddAdmin, AddMovie, Broadcast, DeleteMovie, IsAdmin,
    callback_int, h, is_unreachable, movies_page,
)

logger = logging.getLogger(__name__)

router = Router(name="admin")
router.message.filter(IsAdmin())
router.callback_query.filter(IsAdmin())

BACK = "🔙 Ortga"


async def _back(message: Message, state: FSMContext, markup=None) -> None:
    await state.clear()
    await message.answer("🏠 Asosiy menyu:", reply_markup=markup or kb.admin_main_menu())


async def _matn_kerak(message: Message, state: FSMContext, markup=None) -> str | None:
    """Bosqichli kiritishda matnni oladi. None — javob allaqachon berilgan."""
    if message.text == BACK:
        await _back(message, state, markup)
        return None
    if not message.text:
        await message.answer("✍️ Matn yuboring (yoki 🔙 Ortga).")
        return None
    if message.text.startswith("/"):
        # /start va boshqa buyruqlar kod yoki ism bo'lib saqlanmasin.
        await state.clear()
        await message.answer("↩️ Jarayon bekor qilindi.", reply_markup=kb.admin_main_menu())
        return None
    if message.text in kb.MENU_TEXTS:
        await message.answer("⚠️ Avval shu bosqichni tugating yoki «🔙 Ortga» ni bosing — "
                             "menyu tugmasi javob sifatida qabul qilinmaydi.")
        return None
    return message.text.strip()


# ═══════════════════════════════════════════════
#  CALLBACK QUERYLAR
# ═══════════════════════════════════════════════

@router.callback_query(F.data == "broadcast_confirm")
async def broadcast_confirm(callback: CallbackQuery, state: FSMContext, bot: Bot):
    data = await state.get_data()
    await state.clear()
    await callback.message.edit_reply_markup(reply_markup=None)
    if "msg_id" not in data:
        # Bot qayta ishga tushgan (holat xotirada edi) yoki tugma ikki marta bosilgan.
        await callback.message.answer("⚠️ Reklama ma'lumoti topilmadi — qaytadan boshlang.",
                                      reply_markup=kb.admin_main_menu())
        return
    target = data.get("broadcast_target", "users")
    status_msg = await callback.message.answer("⏳ Yuborilmoqda...")
    ids = db.get_all_active_user_ids() if target == "users" else db.get_all_active_group_ids()
    success, failed = 0, 0
    for chat_id in ids:
        try:
            await bot.copy_message(chat_id=chat_id, from_chat_id=data["from_chat"], message_id=data["msg_id"])
            success += 1
        except Exception as e:
            failed += 1
            logger.warning("Reklama yetmadi [%s]: %s", chat_id, e)
            if is_unreachable(e):
                # Avval guruhlar uchun ham deactivate_user chaqirilardi — guruh hech qachon o'chmasdi.
                (db.deactivate_user if target == "users" else db.deactivate_group)(chat_id)
        await asyncio.sleep(0.05)   # ~20 xabar/soniya — Telegram limitidan past
    await status_msg.edit_text(
        f"✅ <b>Reklama yuborildi!</b>\n"
        f"✅ Muvaffaqiyatli: <b>{success}</b>\n"
        f"❌ Xatolik: <b>{failed}</b>",
        parse_mode="HTML",
    )
    await callback.message.answer("🏠 Asosiy menyu:", reply_markup=kb.admin_main_menu())


@router.callback_query(F.data == "broadcast_cancel")
async def broadcast_cancel(callback: CallbackQuery, state: FSMContext):
    await state.clear()
    await callback.message.edit_reply_markup(reply_markup=None)
    await callback.message.answer("❌ Reklama bekor qilindi.", reply_markup=kb.admin_main_menu())


@router.callback_query(F.data.startswith("del_movie_yes_"))
async def delete_movie_confirm(callback: CallbackQuery):
    code = callback.data.removeprefix("del_movie_yes_")
    movie = db.delete_movie(code)
    await callback.message.edit_reply_markup(reply_markup=None)
    if movie:
        await callback.message.answer(f"✅ <b>{h(movie['name'])}</b> kino o'chirildi!",
                                      parse_mode="HTML", reply_markup=kb.admin_main_menu())
    else:
        await callback.message.answer("❌ Kino topilmadi.", reply_markup=kb.admin_main_menu())


@router.callback_query(F.data == "del_movie_no")
async def delete_movie_cancel(callback: CallbackQuery):
    await callback.message.edit_reply_markup(reply_markup=None)
    await callback.message.answer("❌ Bekor qilindi.", reply_markup=kb.admin_main_menu())


@router.callback_query(F.data.startswith("remove_admin_"))
async def remove_admin_pick(callback: CallbackQuery):
    admin_id = callback_int(callback.data, "remove_admin_")
    admin = next((a for a in db.get_all_admins() if a["id"] == admin_id), None)
    if admin is None:
        await callback.answer("❌ Admin topilmadi!", show_alert=True)
        return
    await callback.message.edit_reply_markup(reply_markup=None)
    await callback.message.answer(
        f"⚠️ <b>{h(admin['name'])}</b> adminni o'chirishni tasdiqlaysizmi?",
        parse_mode="HTML",
        reply_markup=kb.remove_admin_confirm_keyboard(admin_id),
    )


@router.callback_query(F.data.startswith("admin_remove_yes_"))
async def remove_admin_confirm(callback: CallbackQuery):
    admin_id = callback_int(callback.data, "admin_remove_yes_")
    await callback.message.edit_reply_markup(reply_markup=None)
    if admin_id is not None and db.remove_admin(admin_id):
        await callback.message.answer(f"✅ Admin (<b>{admin_id}</b>) o'chirildi!",
                                      parse_mode="HTML", reply_markup=kb.admin_main_menu())
    else:
        await callback.message.answer("❌ Admin topilmadi yoki bosh adminni o'chirib bo'lmaydi.",
                                      reply_markup=kb.admin_main_menu())


@router.callback_query(F.data == "admin_remove_no")
async def remove_admin_cancel(callback: CallbackQuery):
    await callback.message.edit_reply_markup(reply_markup=None)
    await callback.message.answer("❌ Bekor qilindi.", reply_markup=kb.admin_main_menu())


# ═══════════════════════════════════════════════
#  FSM HANDLERLAR (STATE bo'yicha)
# ═══════════════════════════════════════════════

@router.message(AddMovie.code)
async def add_movie_code(message: Message, state: FSMContext):
    code = await _matn_kerak(message, state)
    if code is None:
        return
    if not db.valid_code(code):
        await message.answer("⚠️ Kod: 1–32 belgi, faqat lotin harf, raqam, «_» va «-» "
                             "<i>(masalan: 001 yoki avatar2)</i>. Boshqa kod kiriting:", parse_mode="HTML")
        return
    if db.movie_exists(code):
        await message.answer(f"⚠️ <b>{h(code)}</b> kodi allaqachon mavjud! Boshqa kod kiriting:",
                             parse_mode="HTML")
        return
    await state.update_data(code=code)
    await state.set_state(AddMovie.name)
    await message.answer("🎬 Kino nomini kiriting:")


async def _add_movie_step(message: Message, state: FSMContext, field: str, next_state, prompt: str, markup=None):
    value = await _matn_kerak(message, state)
    if value is None:
        return
    await state.update_data(**{field: value})
    await state.set_state(next_state)
    await message.answer(prompt, parse_mode="HTML", reply_markup=markup)


@router.message(AddMovie.name)
async def add_movie_name(message: Message, state: FSMContext):
    await _add_movie_step(message, state, "name", AddMovie.genre,
                          "🎭 Janrini kiriting <i>(masalan: Drama, Triller)</i>:")


@router.message(AddMovie.genre)
async def add_movie_genre(message: Message, state: FSMContext):
    await _add_movie_step(message, state, "genre", AddMovie.year,
                          "📅 Yilini kiriting <i>(masalan: 2024)</i>:")


@router.message(AddMovie.year)
async def add_movie_year(message: Message, state: FSMContext):
    await _add_movie_step(message, state, "year", AddMovie.quality,
                          "📺 Sifatini tanlang:", kb.quality_keyboard())


@router.message(AddMovie.quality)
async def add_movie_quality(message: Message, state: FSMContext):
    await _add_movie_step(message, state, "quality", AddMovie.description,
                          "📝 Tavsifini kiriting:", kb.back_button())


@router.message(AddMovie.description)
async def add_movie_description(message: Message, state: FSMContext):
    await _add_movie_step(message, state, "description", AddMovie.video, "🎥 Kino videosini yuboring:")


@router.message(AddMovie.video, F.video)
async def add_movie_video(message: Message, state: FSMContext):
    data = await state.get_data()
    db.add_movie(
        code=data["code"], name=data["name"], genre=data["genre"], year=data["year"],
        quality=data["quality"], description=data["description"],
        video_file_id=message.video.file_id,
    )
    await state.clear()
    await message.answer(
        f"✅ <b>{h(data['name'])}</b> muvaffaqiyatli qo'shildi!\n📌 Kod: <b>{h(data['code'])}</b>",
        parse_mode="HTML",
        reply_markup=kb.admin_main_menu(),
    )


@router.message(AddMovie.video)
async def add_movie_video_wrong(message: Message, state: FSMContext):
    if message.text == BACK:
        await _back(message, state)
        return
    await message.answer("❌ Iltimos, video faylni yuboring (hujjat emas, video!).")


@router.message(DeleteMovie.waiting_code)
async def delete_movie_ask_confirm(message: Message, state: FSMContext):
    code = await _matn_kerak(message, state)
    if code is None:
        return
    movie = db.get_movie(code)
    if not movie:
        await message.answer(f"❌ <b>{h(code)}</b> kodli kino topilmadi!", parse_mode="HTML")
        return
    await state.clear()
    await message.answer(
        f"⚠️ <b>{h(movie['name'])}</b> (<code>{h(code)}</code>) kinoni o'chirishni tasdiqlaysizmi?",
        parse_mode="HTML",
        reply_markup=kb.delete_movie_confirm_keyboard(code),
    )


@router.message(Broadcast.waiting_message)
async def broadcast_receive(message: Message, state: FSMContext):
    if message.text == BACK:
        await _back(message, state)
        return
    await state.update_data(msg_id=message.message_id, from_chat=message.chat.id)
    await message.answer("⚠️ <b>Ushbu xabarni yuborishni tasdiqlaysizmi?</b>",
                         parse_mode="HTML", reply_markup=kb.broadcast_confirm_keyboard())


@router.message(AddAdmin.waiting_id)
async def add_admin_get_id(message: Message, state: FSMContext):
    text = await _matn_kerak(message, state, kb.admin_manage_menu())
    if text is None:
        return
    try:
        new_id = int(text)
    except ValueError:
        await message.answer("❌ Faqat raqam kiriting (Telegram ID):")
        return
    if db.is_admin(new_id):
        await state.clear()
        await message.answer("⚠️ Bu foydalanuvchi allaqachon admin!", reply_markup=kb.admin_main_menu())
        return
    await state.update_data(new_admin_id=new_id)
    await state.set_state(AddAdmin.waiting_name)
    await message.answer(
        f"✅ ID: <b>{new_id}</b>\n\n"
        "👤 Endi bu adminning <b>ismini</b> kiriting\n"
        "<i>(Ro'yxatda ko'rish uchun — masalan: Sardor, @username)</i>:",
        parse_mode="HTML",
    )


@router.message(AddAdmin.waiting_name)
async def add_admin_get_name(message: Message, state: FSMContext):
    name = await _matn_kerak(message, state, kb.admin_manage_menu())
    if name is None:
        return
    new_id = (await state.get_data())["new_admin_id"]
    db.add_admin(new_id, name)
    await state.clear()
    await message.answer(f"✅ <b>{h(name)}</b> (ID: <code>{new_id}</code>) admin qilindi!",
                         parse_mode="HTML", reply_markup=kb.admin_main_menu())


# ═══════════════════════════════════════════════
#  REPLY KEYBOARD TUGMALARI (FSM handlerlardan KEYIN)
# ═══════════════════════════════════════════════

@router.message(F.text == BACK)
async def go_back(message: Message, state: FSMContext):
    await _back(message, state)


@router.message(F.text == "📢 Reklama yuborish")
async def broadcast_menu(message: Message):
    await message.answer("📢 <b>Reklama yuborish</b>\nQayerga yuborishni tanlang:",
                         parse_mode="HTML", reply_markup=kb.broadcast_target_menu())


@router.message(F.text.in_({"👥 Foydalanuvchilarga", "📢 Guruhlarga"}))
async def broadcast_select_target(message: Message, state: FSMContext):
    target = "users" if message.text == "👥 Foydalanuvchilarga" else "groups"
    await state.update_data(broadcast_target=target)
    await state.set_state(Broadcast.waiting_message)
    await message.answer("✉️ Yuboriladigan xabarni tashlang:\n<i>(Matn, rasm, video, audio — istalgan format)</i>",
                         parse_mode="HTML", reply_markup=kb.back_button())


@router.message(F.text == "📊 Statistika")
async def show_stats(message: Message):
    user_stats = db.get_user_stats()
    dl_stats = db.get_download_stats()
    top_text = "\n".join(
        f"  {i + 1}. 🎬 {h(name)} — {cnt} marta" for i, (name, cnt) in enumerate(db.get_top_movies())
    ) or "  Hali yuklab olinmagan"
    await message.answer(
        "📊 <b>Bot Statistikasi</b>\n\n"
        f"👥 Jami foydalanuvchilar: <b>{user_stats['total']}</b>\n"
        f"✅ Faol foydalanuvchilar: <b>{user_stats['active']}</b>\n"
        f"📅 Bugun qo'shilganlar: <b>{user_stats['joined_today']}</b>\n"
        f"🚪 Botni tark etganlar: <b>{user_stats['left']}</b>\n\n"
        f"🎬 Jami kinolar: <b>{db.get_movie_count()}</b>\n"
        f"⬇️ Jami yuklab olishlar: <b>{dl_stats['total']}</b>\n\n"
        f"🏆 <b>Top kinolar:</b>\n{top_text}",
        parse_mode="HTML",
        reply_markup=kb.admin_main_menu(),
    )


@router.message(F.text == "🎬 Kino qo'shish")
async def add_movie_start(message: Message, state: FSMContext):
    await state.set_state(AddMovie.code)
    await message.answer("🔢 Kino kodini kiriting <i>(masalan: 001)</i>:",
                         parse_mode="HTML", reply_markup=kb.back_button())


@router.message(F.text == "🗑 Kinoni o'chirish")
async def delete_movie_start(message: Message, state: FSMContext):
    await state.set_state(DeleteMovie.waiting_code)
    await message.answer("🔢 O'chirmoqchi bo'lgan kino kodini kiriting:", reply_markup=kb.back_button())


@router.message(F.text == "👑 Admin boshqaruv")
async def admin_manage_menu(message: Message):
    await message.answer("👑 <b>Admin boshqaruvi</b>", parse_mode="HTML", reply_markup=kb.admin_manage_menu())


@router.message(F.text == "➕ Admin qo'shish")
async def add_admin_start(message: Message, state: FSMContext):
    await state.set_state(AddAdmin.waiting_id)
    await message.answer("👤 Yangi adminning Telegram <b>ID</b> sini kiriting:\n"
                         "<i>(Bilish uchun: @userinfobot ga /start yuboring)</i>",
                         parse_mode="HTML", reply_markup=kb.back_button())


@router.message(F.text == "➖ Admin o'chirish")
async def remove_admin_list(message: Message):
    await message.answer("❌ O'chirmoqchi bo'lgan adminni tanlang:",
                         reply_markup=kb.admins_list_keyboard(db.get_all_admins(), db.super_admin_id()))


async def _movies_view(page: int):
    text, page, pages = movies_page(db.list_movies(), db.get_download_stats()["by_movie"], page)
    return text, kb.movies_pager_keyboard(page, pages)


@router.message(F.text == "📋 Kinolar ro'yxati")
async def movies_list(message: Message):
    text, markup = await _movies_view(0)
    await message.answer(text, parse_mode="HTML", reply_markup=markup)


@router.callback_query(F.data.startswith("mv:p:"))
async def movies_list_page(callback: CallbackQuery):
    page = callback_int(callback.data, "mv:p:")
    text, markup = await _movies_view(page or 0)
    await callback.message.edit_text(text, parse_mode="HTML", reply_markup=markup)
    await callback.answer()

