from datetime import date
from typing import Optional

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.types import Message, CallbackQuery, Voice, PhotoSize
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from bot.database.models import User, Expense, Category, Group, ExpenseStatus
from bot.keyboards.inline import main_menu_keyboard, confirm_keyboard
from bot.services.parser import parse_expense
from bot.services.voice import transcribe_voice
from bot.utils.formatters import format_amount, format_expense_list

router = Router()


async def _get_category_id(db: AsyncSession, category_name: Optional[str]) -> Optional[int]:
    if not category_name:
        return None
    result = await db.execute(select(Category).where(Category.name == category_name))
    cat = result.scalar_one_or_none()
    return cat.id if cat else None


async def _get_group_id(db: AsyncSession, chat_id: int) -> Optional[int]:
    if chat_id > 0:
        return None
    result = await db.execute(select(Group).where(Group.telegram_id == chat_id))
    group = result.scalar_one_or_none()
    if not group:
        group = Group(telegram_id=chat_id, title=f"Group {chat_id}")
        db.add(group)
        await db.flush()
    return group.id


@router.message(F.text & ~F.text.startswith("/"))
async def handle_text_expense(message: Message, db: AsyncSession, db_user: User):
    parsed = parse_expense(message.text or "")
    if not parsed:
        return

    group_id = await _get_group_id(db, message.chat.id)
    category_id = await _get_category_id(db, parsed.category_hint)
    today = date.today()

    expense = Expense(
        user_id=db_user.id,
        group_id=group_id,
        category_id=category_id,
        amount=parsed.amount,
        description=parsed.description,
        raw_text=parsed.raw_text,
        expense_date=today,
        month=today.month,
        year=today.year,
    )
    db.add(expense)
    await db.flush()

    cat_name = parsed.category_hint or "Boshqa"
    text = (
        f"✅ <b>Xarajat qo'shildi!</b>\n\n"
        f"💰 Miqdor: <b>{format_amount(parsed.amount)}</b>\n"
        f"📝 Tavsif: {parsed.description}\n"
        f"🏷 Kategoriya: {cat_name}\n"
        f"📅 Sana: {today.strftime('%d.%m.%Y')}"
    )
    await message.answer(text, parse_mode="HTML", reply_markup=main_menu_keyboard())


@router.message(F.voice)
async def handle_voice(message: Message, db: AsyncSession, db_user: User):
    if not message.voice:
        return

    await message.answer("🎙 Ovozni qayta ishlamoqda...")

    bot = message.bot
    file = await bot.get_file(message.voice.file_id)
    file_bytes = await bot.download_file(file.file_path)
    audio_data = file_bytes.read() if hasattr(file_bytes, "read") else bytes(file_bytes)

    text = await transcribe_voice(audio_data)
    if not text:
        await message.answer("❌ Ovozni tanib bo'lmadi. Iltimos, yozib yuboring.")
        return

    parsed = parse_expense(text)
    if not parsed:
        await message.answer(f"🎙 Tanildi: <i>{text}</i>\n\n❌ Xarajat formatida emas.", parse_mode="HTML")
        return

    group_id = await _get_group_id(db, message.chat.id)
    category_id = await _get_category_id(db, parsed.category_hint)
    today = date.today()

    expense = Expense(
        user_id=db_user.id,
        group_id=group_id,
        category_id=category_id,
        amount=parsed.amount,
        description=parsed.description,
        raw_text=text,
        expense_date=today,
        month=today.month,
        year=today.year,
    )
    db.add(expense)
    await db.flush()

    await message.answer(
        f"✅ <b>Ovozdan xarajat qo'shildi!</b>\n\n"
        f"🎙 <i>{text}</i>\n\n"
        f"💰 {format_amount(parsed.amount)} — {parsed.description}",
        parse_mode="HTML",
        reply_markup=main_menu_keyboard(),
    )
