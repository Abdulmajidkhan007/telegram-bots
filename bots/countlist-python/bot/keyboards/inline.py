from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder


def main_menu_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="🌅 Bugun", callback_data="stats:today"),
        InlineKeyboardButton(text="📅 Hafta", callback_data="stats:week"),
    )
    builder.row(
        InlineKeyboardButton(text="📆 Oy", callback_data="stats:month"),
        InlineKeyboardButton(text="📊 Statistika", callback_data="stats:all"),
    )
    builder.row(
        InlineKeyboardButton(text="🏷 Kategoriyalar", callback_data="menu:categories"),
        InlineKeyboardButton(text="🎯 Limitlar", callback_data="menu:limits"),
    )
    builder.row(
        InlineKeyboardButton(text="📤 Export", callback_data="menu:export"),
        InlineKeyboardButton(text="⚙️ Sozlamalar", callback_data="menu:settings"),
    )
    return builder.as_markup()


def export_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="📄 CSV", callback_data="export:csv"),
        InlineKeyboardButton(text="📊 Excel", callback_data="export:excel"),
        InlineKeyboardButton(text="📑 PDF", callback_data="export:pdf"),
    )
    builder.row(
        InlineKeyboardButton(text="🔙 Orqaga", callback_data="menu:main"),
    )
    return builder.as_markup()


def period_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="Bu oy", callback_data="period:current_month"),
        InlineKeyboardButton(text="O'tgan oy", callback_data="period:last_month"),
        InlineKeyboardButton(text="Barcha", callback_data="period:all"),
    )
    return builder.as_markup()


def confirm_keyboard(action: str, resource_id: int) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="✅ Ha", callback_data=f"confirm:{action}:{resource_id}"),
        InlineKeyboardButton(text="❌ Yo'q", callback_data="confirm:cancel"),
    )
    return builder.as_markup()


def back_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.add(InlineKeyboardButton(text="🔙 Orqaga", callback_data="menu:main"))
    return builder.as_markup()
