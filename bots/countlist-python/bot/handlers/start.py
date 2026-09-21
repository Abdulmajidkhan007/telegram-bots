from aiogram import Router
from aiogram.filters import Command, CommandStart
from aiogram.types import Message

from bot.keyboards.inline import main_menu_keyboard
from bot.config import settings

router = Router()

WELCOME_TEXT = """
👋 <b>Assalomu alaykum, {name}!</b>

💰 <b>Xarajat Menejeri botiga xush kelibsiz!</b>

Ushbu bot sizga shaxsiy va guruh xarajatlaringizni kuzatib borishda yordam beradi.

<b>🚀 Boshlash uchun:</b>
1. Botni guruhingizga qo'shing
2. Guruhda uni <b>admin</b> qiling
3. Xarajatlarni yozing!

<b>📝 Misol:</b>
• <code>500000 so'm telefonga</code>
• <code>2 mln remontga</code>
• <code>50k ovqat</code>

<b>📊 Dashboard:</b> {dashboard_url}
"""

HELP_TEXT = """
📖 <b>Buyruqlar ro'yxati</b>

<b>📊 Statistika:</b>
/today — Bugungi xarajatlar
/week — Haftalik xarajatlar
/month — Oylik xarajatlar
/all — Barcha xarajatlar
/stats — Umumiy statistika
/top — Top xarajatlar

<b>📂 Boshqaruv:</b>
/categories — Kategoriyalar
/limit — Limitlar
/balance — Balans
/export — Export (CSV/Excel/PDF)
/settings — Sozlamalar

<b>🔄 Takroriy:</b>
/recurring — Takroriy xarajatlar

<b>💡 Xarajat qo'shish:</b>
Oddiy xabar yozing:
• <code>500000 ovqatga</code>
• <code>2 mln taksi</code>
• <code>150k dori</code>
"""


@router.message(CommandStart())
async def cmd_start(message: Message):
    name = message.from_user.first_name if message.from_user else "Foydalanuvchi"
    text = WELCOME_TEXT.format(name=name, dashboard_url=settings.dashboard_url)
    await message.answer(text, reply_markup=main_menu_keyboard(), parse_mode="HTML")


@router.message(Command("help"))
async def cmd_help(message: Message):
    await message.answer(HELP_TEXT, parse_mode="HTML", reply_markup=main_menu_keyboard())
