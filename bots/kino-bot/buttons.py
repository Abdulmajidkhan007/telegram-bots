# ============================================================
#  BUTTONS.PY — Barcha klaviaturalar (Reply & Inline)
# ============================================================

from aiogram.types import (
    ReplyKeyboardMarkup, KeyboardButton,
    InlineKeyboardMarkup, InlineKeyboardButton,
    ReplyKeyboardRemove,
)


# ─────────────────────────────────────────────
#  FOYDALANUVCHI KLAVIATURALARI
# ─────────────────────────────────────────────

def user_main_menu():
    """Oddiy foydalanuvchi uchun maxsus tugma yo'q — eski klaviaturani tozalaydi."""
    return ReplyKeyboardRemove()
    

def subscription_keyboard(channels: list[dict]) -> InlineKeyboardMarkup:
    """Obuna bo'lmagan kanallar ro'yxati + tekshirish tugmasi."""
    buttons = [
        [InlineKeyboardButton(
            text=f"📢 {ch['title']}",
            url=ch.get("invite_link", f"https://t.me/{ch['username'].lstrip('@')}")
        )]
        for ch in channels
    ]
    buttons.append([InlineKeyboardButton(text="✅ Obunani tekshirish", callback_data="check_sub")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)


# ─────────────────────────────────────────────
#  ADMIN KLAVIATURALARI — Asosiy menyu
# ─────────────────────────────────────────────

def admin_main_menu() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="📢 Reklama yuborish"), KeyboardButton(text="📊 Statistika")],
            [KeyboardButton(text="🎬 Kino qo'shish"),    KeyboardButton(text="🗑 Kinoni o'chirish")],
            [KeyboardButton(text="👑 Admin boshqaruv"),  KeyboardButton(text="📡 Kanal boshqaruv")],
        ],
        resize_keyboard=True,
    )


def back_button() -> ReplyKeyboardMarkup:
    """Faqat «Ortga» tugmasi."""
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="🔙 Ortga")]],
        resize_keyboard=True,
    )


# ─────────────────────────────────────────────
#  REKLAMA
# ─────────────────────────────────────────────

def broadcast_target_menu() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="👥 Foydalanuvchilarga")],
            [KeyboardButton(text="📢 Guruhlarga")],
            [KeyboardButton(text="🔙 Ortga")],
        ],
        resize_keyboard=True,
    )


def broadcast_confirm_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="✅ Tasdiqlash",    callback_data="broadcast_confirm"),
        InlineKeyboardButton(text="❌ Bekor qilish", callback_data="broadcast_cancel"),
    ]])


# ─────────────────────────────────────────────
#  KINO QO'SHISH — sifat tanlash
# ─────────────────────────────────────────────

def quality_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="360p"),  KeyboardButton(text="480p")],
            [KeyboardButton(text="720p"),  KeyboardButton(text="1080p")],
            [KeyboardButton(text="4K UHD")],
            [KeyboardButton(text="🔙 Ortga")],
        ],
        resize_keyboard=True,
    )


# ─────────────────────────────────────────────
#  KINONI O'CHIRISH
# ─────────────────────────────────────────────

def delete_movie_confirm_keyboard(code: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="✅ O'chirish",    callback_data=f"del_movie_yes_{code}"),
        InlineKeyboardButton(text="❌ Bekor qilish", callback_data="del_movie_no"),
    ]])


# ─────────────────────────────────────────────
#  ADMIN BOSHQARUV
# ─────────────────────────────────────────────

def admin_manage_menu() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="➕ Admin qo'shish"), KeyboardButton(text="➖ Admin o'chirish")],
            [KeyboardButton(text="🔙 Ortga")],
        ],
        resize_keyboard=True,
    )


def admins_list_keyboard(admins: list[dict], super_admin_id: int) -> InlineKeyboardMarkup:
    """Super admindan tashqari barcha adminlar — ism bilan ko'rsatiladi."""
    buttons = []
    for a in admins:
        admin_id   = a["id"]   if isinstance(a, dict) else int(a)
        admin_name = a["name"] if isinstance(a, dict) else str(a)
        if admin_id == super_admin_id:
            continue
        buttons.append([InlineKeyboardButton(
            text=f"❌ {admin_name}",
            callback_data=f"remove_admin_{admin_id}"
        )])
    if not buttons:
        buttons = [[InlineKeyboardButton(text="— Adminlar yo'q —", callback_data="noop")]]
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def remove_admin_confirm_keyboard(admin_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="✅ O'chirish",    callback_data=f"admin_remove_yes_{admin_id}"),
        InlineKeyboardButton(text="❌ Bekor qilish", callback_data="admin_remove_no"),
    ]])


# ─────────────────────────────────────────────
#  KANAL BOSHQARUV
# ─────────────────────────────────────────────

def channel_manage_menu() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="➕ Kanal qo'shish"), KeyboardButton(text="➖ Kanalni o'chirish")],
            [KeyboardButton(text="🔙 Ortga")],
        ],
        resize_keyboard=True,
    )


def channels_list_inline(channels: list[dict]) -> InlineKeyboardMarkup:
    """O'chirish uchun kanal tanlash."""
    buttons = [
        [InlineKeyboardButton(
            text=f"🗑 {ch['title']}",
            callback_data=f"pick_channel_{ch['chat_id']}"
        )]
        for ch in channels
    ]
    if not buttons:
        buttons = [[InlineKeyboardButton(text="— Kanallar yo'q —", callback_data="noop")]]
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def delete_channel_confirm_keyboard(chat_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="✅ O'chirish",    callback_data=f"del_channel_yes_{chat_id}"),
        InlineKeyboardButton(text="❌ Bekor qilish", callback_data="del_channel_no"),
    ]])


# ─────────────────────────────────────────────
#  /help — Admin linki
# ─────────────────────────────────────────────

def admin_contact_keyboard(url: str, label: str = "👑 Admin bilan bog'lanish") -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text=label, url=url)
    ]])


# Admin menyularidagi barcha reply-tugma matnlari. Kino qo'shish bosqichlarida
# shu matn kelsa — bu javob emas, adashib bosilgan tugma: bazada kodi
# "🎬 Kino qo'shish", janri "🗑 Kinoni o'chirish" bo'lgan kino aynan shundan paydo bo'lgan.
MENU_TEXTS = frozenset({
    "📢 Reklama yuborish", "📊 Statistika",
    "🎬 Kino qo'shish", "🗑 Kinoni o'chirish",
    "👑 Admin boshqaruv", "📡 Kanal boshqaruv",
    "👥 Foydalanuvchilarga", "📢 Guruhlarga",
    "➕ Admin qo'shish", "➖ Admin o'chirish",
    "➕ Kanal qo'shish", "➖ Kanalni o'chirish",
    "🔙 Ortga",
})
