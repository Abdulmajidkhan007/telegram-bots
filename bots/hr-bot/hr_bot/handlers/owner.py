"""Kompaniya egasi va HR paneli: kompaniya ochish, vakansiya yaratish, HR taklifi."""
import logging

from aiogram import Bot, F, Router
from aiogram.exceptions import TelegramAPIError
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message

from .. import billing, links, repo
from ..db import aware, now
from ..texts import t
from .common import TEXT, AdminCb, CompanyCb, esc, fmt_date

log = logging.getLogger(__name__)
router = Router(name="owner")

LIMITS = {"company_name": 128, "title": 128, "requirements": 4000, "reject": 2000}


class OwnerForm(StatesGroup):
    company_name = State()
    vac_title = State()
    vac_req = State()
    vac_days = State()
    vac_reject = State()


async def _too_long(message: Message, lang: str, key: str) -> bool:
    if len(message.text) > LIMITS[key]:
        await message.answer(t(lang, "too_long", n=LIMITS[key]))
        return True
    return False


@router.message(OwnerForm.company_name, TEXT)
async def company_name(message: Message, state: FSMContext, lang: str, sessionmaker, cfg, bot: Bot):
    if await _too_long(message, lang, "company_name"):
        return
    await state.clear()
    async with sessionmaker() as s:
        company = await repo.create_company(s, message.from_user.id, message.text.strip())
        await s.commit()
    await message.answer(t(lang, "company_created_paid" if cfg.payments_enabled else "company_created",
                           name=esc(company.name)))
    kb = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text=t("uz", "btn_activate"), callback_data=AdminCb(action="activate", company_id=company.id).pack()),
        InlineKeyboardButton(text=t("uz", "btn_block"), callback_data=AdminCb(action="block", company_id=company.id).pack()),
    ]])
    for admin_id in cfg.admin_ids:
        try:
            await bot.send_message(admin_id, t("uz", "admin_new_company", name=esc(company.name), id=company.id), reply_markup=kb)
        except TelegramAPIError as e:
            log.warning("Adminga (%s) yangi kompaniya xabari ketmadi: %s", admin_id, e)


def _panel_text(lang: str, company) -> str:
    matn = t(lang, "panel", name=esc(company.name), status=company.status)
    until = aware(company.active_until)
    if until is not None:
        kalit = "panel_until" if until > now() else "panel_expired"
        matn += "\n" + t(lang, kalit, date=fmt_date(until))
    return matn


@router.message(Command("panel"))
async def panel(message: Message, state: FSMContext, lang: str, sessionmaker, cfg):
    await state.clear()
    async with sessionmaker() as s:
        kompaniyalar = await repo.user_companies(s, message.from_user.id)
    if not kompaniyalar:
        await message.answer(t(lang, "no_companies"))
        return
    for company, role in kompaniyalar:
        tugmalar = [[InlineKeyboardButton(text=t(lang, "btn_vacancies"),
                                          callback_data=CompanyCb(action="vac", company_id=company.id).pack())]]
        if company.status == "active":
            tugmalar.append([InlineKeyboardButton(text=t(lang, "btn_new_vacancy"),
                                                  callback_data=CompanyCb(action="new", company_id=company.id).pack())])
        if role == "owner":
            tugmalar.append([InlineKeyboardButton(text=t(lang, "btn_invite"),
                                                  callback_data=CompanyCb(action="invite", company_id=company.id).pack())])
            if cfg.payments_enabled and company.status != "blocked":
                tugmalar.append([InlineKeyboardButton(text=t(lang, "btn_pay"),
                                                      callback_data=CompanyCb(action="pay", company_id=company.id).pack())])
        await message.answer(_panel_text(lang, company), reply_markup=InlineKeyboardMarkup(inline_keyboard=tugmalar))


@router.callback_query(CompanyCb.filter(F.action == "invite"))
async def invite(call: CallbackQuery, callback_data: CompanyCb, lang: str, sessionmaker, bot: Bot):
    await call.answer()
    async with sessionmaker() as s:
        try:
            token = await repo.create_invite(s, callback_data.company_id, call.from_user.id)
            await s.commit()
        except repo.AccessError:
            await call.message.answer(t(lang, "access_denied"))
            return
    me = await bot.me()
    await call.message.answer(t(lang, "invite_link", link=links.join_link(me.username, token)))


@router.callback_query(CompanyCb.filter(F.action == "new"))
async def new_vacancy(call: CallbackQuery, callback_data: CompanyCb, state: FSMContext, lang: str, sessionmaker):
    await call.answer()
    async with sessionmaker() as s:
        if await repo.member_role(s, callback_data.company_id, call.from_user.id) is None:
            await call.message.answer(t(lang, "access_denied"))
            return
        company = await s.get(repo.Company, callback_data.company_id)
    # 5 qadamli formani to'ldirib bo'lgach "muddat tugagan" deyish — vaqtni behuda olish.
    if not billing.is_paid_up(company.status, aware(company.active_until), now()):
        await call.message.answer(t(lang, "subscription_expired" if company.status == "active" else "company_not_active"))
        return
    await state.set_state(OwnerForm.vac_title)
    await state.update_data(company_id=callback_data.company_id)
    await call.message.answer(t(lang, "ask_vac_title"))


@router.message(OwnerForm.vac_title, TEXT)
async def vac_title(message: Message, state: FSMContext, lang: str):
    if await _too_long(message, lang, "title"):
        return
    await state.update_data(title=message.text.strip())
    await state.set_state(OwnerForm.vac_req)
    await message.answer(t(lang, "ask_vac_req"))


@router.message(OwnerForm.vac_req, TEXT)
async def vac_req(message: Message, state: FSMContext, lang: str):
    if await _too_long(message, lang, "requirements"):
        return
    await state.update_data(requirements=message.text.strip())
    await state.set_state(OwnerForm.vac_days)
    await message.answer(t(lang, "ask_vac_days"))


@router.message(OwnerForm.vac_days, TEXT)
async def vac_days(message: Message, state: FSMContext, lang: str):
    xom = message.text.strip()
    if not xom.isdigit() or not 1 <= int(xom) <= 90:
        await message.answer(t(lang, "bad_days"))
        return
    await state.update_data(days=int(xom))
    await state.set_state(OwnerForm.vac_reject)
    await message.answer(t(lang, "ask_vac_reject"))


@router.message(OwnerForm.vac_reject, TEXT)
async def vac_reject(message: Message, state: FSMContext, lang: str, sessionmaker, bot: Bot):
    if await _too_long(message, lang, "reject"):
        return
    shablon = "" if message.text.strip() == "-" else message.text.strip()
    data = await state.get_data()
    await state.clear()
    async with sessionmaker() as s:
        try:
            vacancy = await repo.create_vacancy(
                s, data["company_id"], message.from_user.id, data["title"], data["requirements"],
                data["days"], shablon, lang)
            await s.commit()
        except repo.AccessError:
            await message.answer(t(lang, "access_denied"))
            return
        except repo.StateError as e:
            await message.answer(t(lang, e.args[0]))
            return
    me = await bot.me()
    await message.answer(t(lang, "vac_created", title=esc(vacancy.title), deadline=fmt_date(vacancy.deadline),
                           link=links.vacancy_link(me.username, vacancy.slug)))
