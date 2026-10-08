# ============================================================
#  BOT_PROFILE.PY — Bot profili: tavsif, qisqa tavsif, buyruqlar menyusi
# ============================================================
# Bot har ishga tushganda o'zi o'rnatadi — BotFather'da qo'lda yozish shart
# emas va matn kod bilan birga versiyalanadi. Telegram chegaralari testda tekshiriladi.

import logging

from aiogram import Bot
from aiogram.types import BotCommand, BotCommandScopeChat, BotCommandScopeDefault

logger = logging.getLogger(__name__)

# /start bosilmagan bo'sh chatda ko'rinadi ("What can this bot do?"). ≤ 512 belgi.
DESCRIPTION = (
    "🎬 Kino kodini yuboring — film darhol keladi.\n"
    "\n"
    "📌 Qanday ishlaydi:\n"
    "1️⃣ Kanal yoki reklamadagi kino kodini oling\n"
    "2️⃣ Kodni shu botga yozing (masalan: 12)\n"
    "3️⃣ Kino tayyor — tomosha qiling 🍿\n"
    "\n"
    "✅ Bepul · ⚡ Tez · 📱 To'g'ridan-to'g'ri Telegram'da\n"
    "\n"
    "Savol bo'lsa: /help"
)

# Bot profilida va havola ulashilganda ko'rinadi. ≤ 120 belgi.
SHORT_DESCRIPTION = "🎬 Kino kodini yuboring — film darhol keladi. Bepul va tez 🍿"

USER_COMMANDS = [
    ("start", "🏠 Bosh sahifa"),
    ("kino", "🔢 Kino kodini kiritish"),
    ("help", "ℹ️ Admin bilan bog'lanish"),
]

# Faqat bosh adminning chatida ko'rinadi — oddiy foydalanuvchi menyusida yo'q.
SUPER_ADMIN_COMMANDS = USER_COMMANDS + [
    ("backup", "💾 Baza nusxasini olish"),
    ("restore", "📥 Bazani fayldan tiklash"),
]


def _cmds(pairs):
    return [BotCommand(command=c, description=d) for c, d in pairs]


async def apply(bot: Bot, super_admin_id: int) -> None:
    # Har biri alohida: bittasi yiqilsa (masalan, limit) qolganlari baribir o'rnatilsin.
    steps = [
        ("tavsif", bot.set_my_description(DESCRIPTION)),
        ("qisqa tavsif", bot.set_my_short_description(SHORT_DESCRIPTION)),
        ("buyruqlar", bot.set_my_commands(_cmds(USER_COMMANDS), scope=BotCommandScopeDefault())),
        ("admin buyruqlari", bot.set_my_commands(_cmds(SUPER_ADMIN_COMMANDS),
                                                 scope=BotCommandScopeChat(chat_id=super_admin_id))),
    ]
    for nom, coro in steps:
        try:
            await coro
        except Exception as e:
            # Profil o'rnatilmasa ham bot ishlayveradi — lekin sabab log'da ko'rinsin.
            logger.error("Bot profili (%s) o'rnatilmadi: %s", nom, e)
