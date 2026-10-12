"""/start: deep link (vakansiya / HR taklifi) yoki rol tanlash."""
import logging

from aiogram import Router
from aiogram.filters import CommandObject, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message

from .. import links, repo
from ..texts import t
from . import candidate
from .common import RoleCb, esc
from .owner import OwnerForm

log = logging.getLogger(__name__)
router = Router(name="start")


def roles_kb(lang: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=t(lang, "role_owner"), callback_data=RoleCb(role="owner").pack())],
        [InlineKeyboardButton(text=t(lang, "role_hr"), callback_data=RoleCb(role="hr").pack())],
        [InlineKeyboardButton(text=t(lang, "role_candidate"), callback_data=RoleCb(role="candidate").pack())],
        [InlineKeyboardButton(text=t(lang, "lang_btn"), callback_data=RoleCb(role="lang").pack())],
    ])


@router.message(CommandStart())
async def start(message: Message, command: CommandObject, state: FSMContext, lang: str, sessionmaker, cfg):
    await state.clear()
    parsed = links.parse_start(command.args)
    if command.args and parsed is None:
        # Soxta/buzilgan parametr — faqat foydalanuvchi ID log'ga, parametr emas.
        log.info("Noto'g'ri start parametri: user %s", message.from_user.id)
    if parsed and parsed[0] == "vacancy":
        await candidate.open_vacancy(message, state, lang, sessionmaker, cfg, parsed[1])
        return
    if parsed and parsed[0] == "join":
        async with sessionmaker() as s:
            try:
                company = await repo.accept_invite(s, parsed[1], message.from_user.id)
                await s.commit()
            except repo.StateError as e:
                await message.answer(t(lang, e.args[0]))
                return
        await message.answer(t(lang, "invite_ok", name=esc(company.name)))
        return
    await message.answer(t(lang, "start"), reply_markup=roles_kb(lang))


@router.callback_query(RoleCb.filter())
async def choose_role(call: CallbackQuery, callback_data: RoleCb, state: FSMContext, lang: str, sessionmaker):
    await call.answer()
    rol = callback_data.role
    if rol == "lang":
        yangi = "ru" if lang == "uz" else "uz"
        async with sessionmaker() as s:
            await repo.set_lang(s, call.from_user.id, yangi)
            await s.commit()
        await call.message.edit_text(t(yangi, "start"), reply_markup=roles_kb(yangi))
    elif rol == "owner":
        await state.set_state(OwnerForm.company_name)
        await call.message.answer(t(lang, "ask_company_name"))
    elif rol == "hr":
        await call.message.answer(t(lang, "hr_help"))
    elif rol == "candidate":
        await call.message.answer(t(lang, "candidate_help"))
    else:
        log.warning("Noma'lum rol callback: %r", rol)

