# ============================================================
#  HANDLERS_BACKUP.PY — /backup va /restore (faqat bosh admin)
# ============================================================
# Railway'da bazani faylga qo'lda qo'yib bo'lmaydi: eski database.json shu
# /restore orqali botning o'ziga yuboriladi. /backup — muntazam nusxa uchun.
# Admin router'idan keyin ulanadi: "🔙 Ortga" ni o'sha router ushlaydi.

import json
import logging

from aiogram import Bot, F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import BufferedInputFile, Message

import buttons as kb
import database as db
from common import IsAdmin, RestoreDb, h

logger = logging.getLogger(__name__)

router = Router(name="backup")
router.message.filter(IsAdmin())

@router.message(Command("backup"))
async def cmd_backup(message: Message):
    if message.from_user.id != db.super_admin_id():
        return
    raw = json.dumps(db.load_db(), ensure_ascii=False, indent=2).encode("utf-8")
    await message.answer_document(BufferedInputFile(raw, filename="database.json"),
                                  caption="💾 Baza nusxasi. Ichida foydalanuvchilar ro'yxati bor — hech kimga yubormang.")


@router.message(Command("restore"))
async def cmd_restore(message: Message, state: FSMContext):
    if message.from_user.id != db.super_admin_id():
        return
    await state.set_state(RestoreDb.waiting_file)
    await message.answer("📥 database.json faylini yuboring. Joriy baza almashtiriladi "
                         "(avval /backup qilib oling).", reply_markup=kb.back_button())


@router.message(RestoreDb.waiting_file, F.document)
async def restore_file(message: Message, state: FSMContext, bot: Bot):
    if message.from_user.id != db.super_admin_id():
        return
    if message.document.file_size and message.document.file_size > 20 * 1024 * 1024:
        await message.answer("❌ Fayl 20 MB dan katta.")
        return
    buf = await bot.download(message.document)
    try:
        data, skipped = db.validate_db(json.loads(buf.read().decode("utf-8")))
    except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as e:
        await message.answer(f"❌ Fayl qabul qilinmadi: {h(e)}", parse_mode="HTML")
        return
    db.save_db(data)
    await state.clear()
    text = (f"✅ Baza tiklandi: {len(data['movies'])} ta kino, {len(data['users'])} ta foydalanuvchi, "
            f"{len(data['channels'])} ta kanal.")
    if skipped:
        text += "\n⚠️ Noto'g'ri kodli yozuvlar tashlab yuborildi: " + ", ".join(h(repr(c)) for c in skipped)
    logger.info("Baza /restore orqali tiklandi; tashlab yuborilgan kodlar: %d", len(skipped))
    await message.answer(text, reply_markup=kb.admin_main_menu())


@router.message(RestoreDb.waiting_file)
async def restore_wrong(message: Message):
    await message.answer("📎 database.json ni fayl (hujjat) sifatida yuboring yoki «🔙 Ortga».")
