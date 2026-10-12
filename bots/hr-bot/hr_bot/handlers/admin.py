"""Platforma admini (ADMIN_IDS): kompaniyani faollashtirish/bloklash, statistika."""
import logging

from aiogram import Bot, F, Router
from aiogram.exceptions import TelegramAPIError
from aiogram.filters import Command
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message

from .. import repo
from ..texts import t
from .common import AdminCb, esc

log = logging.getLogger(__name__)
router = Router(name="admin")


def is_admin(user_id: int, cfg) -> bool:
    return user_id in cfg.admin_ids


@router.message(Command("admin"))
async def admin_panel(message: Message, lang: str, sessionmaker, cfg):
    if not is_admin(message.from_user.id, cfg):
        return  # oddiy foydalanuvchiga buyruq borligini ham oshkor qilmaymiz
    async with sessionmaker() as s:
        st = await repo.stats(s)
        kutganlar = await repo.pending_companies(s)
    await message.answer(t(lang, "admin_stats", **st))
    if not kutganlar:
        await message.answer(t(lang, "admin_none"))
        return
    for c in kutganlar:
        kb = InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(text=t(lang, "btn_activate"), callback_data=AdminCb(action="activate", company_id=c.id).pack()),
            InlineKeyboardButton(text=t(lang, "btn_block"), callback_data=AdminCb(action="block", company_id=c.id).pack()),
        ]])
        await message.answer(t(lang, "admin_new_company", name=esc(c.name), id=c.id), reply_markup=kb)


@router.callback_query(AdminCb.filter(F.action.in_({"activate", "block"})))
async def set_status(call: CallbackQuery, callback_data: AdminCb, lang: str, sessionmaker, cfg, bot: Bot):
    # Callback'ni boshqa odam ham yasab yuborishi mumkin — admin'likni qayta tekshiramiz.
    if not is_admin(call.from_user.id, cfg):
        await call.answer(t(lang, "access_denied"), show_alert=True)
        return
    yangi = "active" if callback_data.action == "activate" else "blocked"
    async with sessionmaker() as s:
        try:
            company = await repo.set_company_status(s, callback_data.company_id, yangi)
        except repo.StateError:
            await call.answer(t(lang, "not_found"), show_alert=True)
            return
        egalar = await repo.company_owners(s, company.id)
        await s.commit()
    await call.answer(t(lang, "done"))
    log.info("Kompaniya %s → %s (admin %s)", company.id, yangi, call.from_user.id)
    if yangi != "active":
        return
    for owner_id in egalar:
        async with sessionmaker() as s:
            u = await s.get(repo.User, owner_id)
        try:
            await bot.send_message(owner_id, t(u.lang if u else "uz", "company_activated", name=esc(company.name)))
        except TelegramAPIError as e:
            log.warning("Egaga (%s) faollashtirish xabari ketmadi: %s", owner_id, e)
