from aiogram import F, Router
from aiogram.types import CallbackQuery

from bot.keyboards.inline import main_menu_keyboard, export_keyboard

router = Router()


@router.callback_query(F.data == "menu:main")
async def cb_main_menu(callback: CallbackQuery):
    await callback.message.edit_text(
        "🏠 <b>Asosiy menyu</b>",
        parse_mode="HTML",
        reply_markup=main_menu_keyboard(),
    )
    await callback.answer()


@router.callback_query(F.data == "menu:export")
async def cb_export_menu(callback: CallbackQuery):
    await callback.message.edit_text(
        "📤 <b>Export format tanlang:</b>",
        parse_mode="HTML",
        reply_markup=export_keyboard(),
    )
    await callback.answer()


@router.callback_query(F.data == "menu:categories")
async def cb_categories(callback: CallbackQuery):
    await callback.answer("Kategoriyalar tez orada!", show_alert=True)


@router.callback_query(F.data == "menu:limits")
async def cb_limits(callback: CallbackQuery):
    await callback.answer("Limitlar tez orada!", show_alert=True)


@router.callback_query(F.data == "menu:settings")
async def cb_settings(callback: CallbackQuery):
    await callback.answer("Sozlamalar tez orada!", show_alert=True)
