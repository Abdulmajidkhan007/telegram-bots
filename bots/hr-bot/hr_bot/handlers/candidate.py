"""Nomzod oqimi: vakansiya kartochkasi → rozilik → PDF CV → havolalar → tasdiq.

AI baholash fonda ishlaydi: nomzod kutib qolmaydi, AI yiqilsa ham ariza saqlangan.
"""
import asyncio
import io
import logging

from aiogram import Bot, F, Router
from aiogram.exceptions import TelegramBadRequest
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message

from .. import cv, repo
from ..db import Application, Company, Vacancy
from ..texts import t
from .common import TEXT, ApplyCb, esc, fmt_date

log = logging.getLogger(__name__)
router = Router(name="candidate")

MAX_LINKS_CHARS = 1000
_fon_vazifalar: set[asyncio.Task] = set()  # GC yig'ib ketmasin


class CandForm(StatesGroup):
    cv = State()
    links = State()


async def open_vacancy(message: Message, state: FSMContext, lang: str, sessionmaker, cfg, slug: str):
    async with sessionmaker() as s:
        topildi = await repo.vacancy_by_slug(s, slug)
    if topildi is None:
        await message.answer(t(lang, "vacancy_not_found"))
        return
    vacancy, company = topildi
    if not repo.accepts_applications(vacancy, company):
        await message.answer(t(lang, "vacancy_closed"))
        return
    await message.answer(t(
        lang, "vacancy_card", title=esc(vacancy.title), company=esc(company.name),
        deadline=fmt_date(vacancy.deadline), requirements=esc(vacancy.requirements),
    ))
    kb = InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(
        text=t(lang, "btn_agree"), callback_data=ApplyCb(action="agree", vacancy_id=vacancy.id).pack())]])
    await message.answer(t(lang, "consent", days=cfg.cv_retention_days), reply_markup=kb)


@router.callback_query(ApplyCb.filter(F.action == "agree"))
async def agree(call: CallbackQuery, callback_data: ApplyCb, state: FSMContext, lang: str):
    await call.answer()
    await state.set_state(CandForm.cv)
    await state.update_data(vacancy_id=callback_data.vacancy_id)
    await call.message.answer(t(lang, "send_cv"))


@router.message(CandForm.cv, F.document)
async def got_cv(message: Message, state: FSMContext, lang: str, bot: Bot):
    doc = message.document
    try:
        cv.check_document(doc.mime_type, doc.file_size, doc.file_name)
    except cv.CvError as e:
        await message.answer(t(lang, e.args[0]))
        return
    buf = io.BytesIO()
    try:
        await bot.download(doc, destination=buf)
    except TelegramBadRequest as e:
        log.warning("CV yuklanmadi (user %s): %s", message.from_user.id, e.message)
        await message.answer(t(lang, "cv_download_failed"))
        return
    try:
        matn = cv.extract_text(buf.getvalue())
    except cv.CvError as e:
        await message.answer(t(lang, e.args[0]))
        return
    await state.update_data(cv_file_id=doc.file_id, cv_text=matn)
    await state.set_state(CandForm.links)
    data = await state.get_data()
    kb = InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(
        text=t(lang, "btn_no_links"), callback_data=ApplyCb(action="nolinks", vacancy_id=data["vacancy_id"]).pack())]])
    await message.answer(t(lang, "ask_links"), reply_markup=kb)


@router.message(CandForm.cv, ~F.text.startswith("/"))
async def cv_not_document(message: Message, lang: str):
    await message.answer(t(lang, "send_cv"))


@router.message(CandForm.links, TEXT)
async def got_links(message: Message, state: FSMContext, lang: str, sessionmaker, cfg, scorer):
    if len(message.text) > MAX_LINKS_CHARS:
        await message.answer(t(lang, "too_long", n=MAX_LINKS_CHARS))
        return
    await _submit(message, message.from_user, state, lang, sessionmaker, cfg, scorer, message.text)


@router.callback_query(CandForm.links, ApplyCb.filter(F.action == "nolinks"))
async def no_links(call: CallbackQuery, state: FSMContext, lang: str, sessionmaker, cfg, scorer):
    await call.answer()
    await _submit(call.message, call.from_user, state, lang, sessionmaker, cfg, scorer, "")


async def _submit(message: Message, user, state: FSMContext, lang, sessionmaker, cfg, scorer, links_text: str):
    data = await state.get_data()
    await state.clear()
    async with sessionmaker() as s:
        vacancy = await s.get(Vacancy, data.get("vacancy_id"))
        company = await s.get(Company, vacancy.company_id) if vacancy else None
        if vacancy is None or company is None:
            await message.answer(t(lang, "vacancy_not_found"))
            return
        try:
            app, yangi = await repo.submit_application(
                s, vacancy, company, user.id, user.full_name,
                data["cv_file_id"], data["cv_text"], links_text)
            await s.commit()
        except repo.StateError as e:
            await message.answer(t(lang, e.args[0]))
            return
    await message.answer(t(lang, "applied" if yangi else "reapplied", deadline=fmt_date(vacancy.deadline)))
    log.info("Ariza %s qabul qilindi (vakansiya %s, yangi=%s)", app.id, vacancy.id, yangi)
    if data["cv_text"] and scorer is not None:
        task = asyncio.create_task(score_application(sessionmaker, scorer, cfg.ai_daily_limit, app.id))
        _fon_vazifalar.add(task)
        task.add_done_callback(_fon_vazifalar.discard)


async def score_application(sessionmaker, scorer, daily_limit: int, app_id: int) -> bool:
    """Arizani AI bilan baholaydi. False — hisoblanmadi (limit/xato), ariza baribir turadi."""
    async with sessionmaker() as s:
        if not await repo.reserve_ai_call(s, daily_limit):
            log.warning("AI kunlik limiti tugadi — ariza %s ball'siz qoldi", app_id)
            await s.commit()
            return False
        await s.commit()
        app = await s.get(Application, app_id)
        vacancy = await s.get(Vacancy, app.vacancy_id)
        requirements, cv_text, lang = vacancy.requirements, app.cv_text or "", vacancy.lang
    natija, tokens = await scorer.score(requirements, cv_text, lang)
    async with sessionmaker() as s:
        if tokens:
            await repo.add_ai_tokens(s, tokens)
        if natija is not None:
            await repo.save_ai_result(s, app_id, natija.score, natija.to_json())
        await s.commit()
    log.info("AI: ariza %s → %s (token %d)", app_id, natija.score if natija else "hisoblanmadi", tokens)
    return natija is not None
