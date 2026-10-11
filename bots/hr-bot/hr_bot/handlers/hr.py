"""HR: vakansiyalar, arizalar (AI ball bo'yicha), qaror tugmalari, vakansiyani yopish."""
import json
import logging

from aiogram import Bot, F, Router
from aiogram.exceptions import TelegramBadRequest
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup

from .. import notify, repo, status
from ..db import Company
from ..texts import T, t
from .common import AppCb, CompanyCb, VacancyCb, esc

log = logging.getLogger(__name__)
router = Router(name="hr")

_DECISION = {"invite": status.INVITED, "reject": status.REJECTED, "later": status.SHORTLISTED}


@router.callback_query(CompanyCb.filter(F.action == "vac"))
async def vacancies(call: CallbackQuery, callback_data: CompanyCb, lang: str, sessionmaker):
    await call.answer()
    async with sessionmaker() as s:
        try:
            royxat = await repo.company_vacancies(s, callback_data.company_id, call.from_user.id)
            sonlar = {v.id: len(await repo.list_applications(s, v.id, call.from_user.id)) for v in royxat}
        except repo.AccessError:
            await call.message.answer(t(lang, "access_denied"))
            return
    if not royxat:
        await call.message.answer(t(lang, "vac_list_empty"))
        return
    kb = [[InlineKeyboardButton(
        text=t(lang, "vac_line", icon="🟢" if v.status == "open" else "🔒", title=v.title, n=sonlar[v.id]),
        callback_data=VacancyCb(action="apps", vacancy_id=v.id).pack())] for v in royxat]
    await call.message.answer(t(lang, "btn_vacancies"), reply_markup=InlineKeyboardMarkup(inline_keyboard=kb))


def _score(lang: str, score: int | None) -> str:
    return t(lang, "score_none") if score is None else f"{score}/100"


@router.callback_query(VacancyCb.filter(F.action == "apps"))
async def applications(call: CallbackQuery, callback_data: VacancyCb, lang: str, sessionmaker):
    await call.answer()
    async with sessionmaker() as s:
        try:
            vacancy = await repo.get_vacancy(s, callback_data.vacancy_id, call.from_user.id)
            apps = await repo.list_applications(s, vacancy.id, call.from_user.id)
        except repo.AccessError:
            await call.message.answer(t(lang, "access_denied"))
            return
    kb = [[InlineKeyboardButton(
        text=f"{_score(lang, a.ai_score)} · {a.candidate_name[:30]} · {t(lang, 'status_' + a.status)}",
        callback_data=AppCb(action="open", app_id=a.id).pack())] for a in apps[:50]]
    if vacancy.status == "open":
        kb.append([InlineKeyboardButton(text=t(lang, "btn_close_vac"),
                                        callback_data=VacancyCb(action="close", vacancy_id=vacancy.id).pack())])
    await call.message.answer(t(lang, "apps_header", title=esc(vacancy.title), n=len(apps)),
                              reply_markup=InlineKeyboardMarkup(inline_keyboard=kb))


def _summary(lang: str, app) -> str:
    if app.cv_deleted_at:
        return t(lang, "cv_deleted") + "\n"
    if not app.cv_text:
        return t(lang, "no_text") + "\n"
    if not app.ai_summary:
        return ""
    try:
        d = json.loads(app.ai_summary)
    except json.JSONDecodeError:
        log.warning("Ariza %s: ai_summary buzuq JSON", app.id)
        return ""
    qatorlar = [f"• {esc(r)}" for r in d.get("reasons", [])]
    if d.get("matched"):
        qatorlar.append("✅ " + esc(", ".join(d["matched"])))
    if d.get("missing"):
        qatorlar.append("➖ " + esc(", ".join(d["missing"])))
    return "\n".join(qatorlar) + "\n"


@router.callback_query(AppCb.filter(F.action == "open"))
async def open_app(call: CallbackQuery, callback_data: AppCb, lang: str, sessionmaker, bot: Bot):
    await call.answer()
    async with sessionmaker() as s:
        try:
            app, vacancy = await repo.get_application(s, callback_data.app_id, call.from_user.id)
        except repo.AccessError:
            await call.message.answer(t(lang, "access_denied"))
            return
    kb = None
    if app.status in status.UNDECIDED and vacancy.status == "open":
        kb = InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(text=t(lang, "btn_invite_app"), callback_data=AppCb(action="invite", app_id=app.id).pack()),
            InlineKeyboardButton(text=t(lang, "btn_reject_app"), callback_data=AppCb(action="reject", app_id=app.id).pack()),
            InlineKeyboardButton(text=t(lang, "btn_later"), callback_data=AppCb(action="later", app_id=app.id).pack()),
        ]])
    matn = t(lang, "app_card", name=esc(app.candidate_name), score=_score(lang, app.ai_score),
             status=t(lang, "status_" + app.status), summary=_summary(lang, app),
             links=("🔗 " + esc(app.links)) if app.links else "")
    if app.cv_file_id:
        try:
            await bot.send_document(call.from_user.id, app.cv_file_id, caption=matn[:1024], reply_markup=kb)
            return
        except TelegramBadRequest as e:
            log.warning("Ariza %s: CV fayli yuborilmadi: %s", app.id, e.message)
    await call.message.answer(matn, reply_markup=kb)


@router.callback_query(AppCb.filter(F.action.in_(_DECISION.keys())))
async def decide(call: CallbackQuery, callback_data: AppCb, lang: str, sessionmaker, bot: Bot):
    async with sessionmaker() as s:
        try:
            app, vacancy = await repo.decide(s, callback_data.app_id, call.from_user.id, _DECISION[callback_data.action])
            company = await s.get(Company, vacancy.company_id)
            await s.commit()
        except repo.AccessError:
            await call.answer(t(lang, "access_denied"), show_alert=True)
            return
        except repo.StateError as e:
            await call.answer(t(lang, e.args[0]), show_alert=True)
            return
    await call.answer(t(lang, "done"))
    if app.status == status.SHORTLISTED:
        return
    # Nomzodga o'z tilida yozamiz.
    async with sessionmaker() as s:
        nomzod = await s.get(repo.User, app.candidate_id)
    nlang = nomzod.lang if nomzod else "uz"
    if app.status == status.INVITED:
        matn = t(nlang, "msg_invited", company=esc(company.name), title=esc(vacancy.title))
    else:
        matn = notify.rejection_text(vacancy.reject_template, T["msg_rejected_default"][nlang], company.name, vacancy.title)
    ok = await notify.send_safe(bot, app.candidate_id, matn)
    async with sessionmaker() as s:
        await repo.mark_delivery(s, app.id, ok)
        await s.commit()


@router.callback_query(VacancyCb.filter(F.action == "close"))
async def close_ask(call: CallbackQuery, callback_data: VacancyCb, lang: str, sessionmaker):
    await call.answer()
    async with sessionmaker() as s:
        try:
            n = await repo.count_undecided(s, callback_data.vacancy_id, call.from_user.id)
        except repo.AccessError:
            await call.message.answer(t(lang, "access_denied"))
            return
    kb = InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(
        text=t(lang, "btn_yes"), callback_data=VacancyCb(action="closeyes", vacancy_id=callback_data.vacancy_id).pack())]])
    await call.message.answer(t(lang, "close_confirm", n=n), reply_markup=kb)


@router.callback_query(VacancyCb.filter(F.action == "closeyes"))
async def close_yes(call: CallbackQuery, callback_data: VacancyCb, lang: str, sessionmaker, bot: Bot):
    await call.answer()
    async with sessionmaker() as s:
        try:
            vacancy, qolganlar = await repo.close_vacancy(s, callback_data.vacancy_id, call.from_user.id)
            company = await s.get(Company, vacancy.company_id)
            tillar = {a.candidate_id: ((await s.get(repo.User, a.candidate_id)) or repo.User(lang="uz")).lang
                      for a in qolganlar}
            await s.commit()
        except repo.AccessError:
            await call.message.answer(t(lang, "access_denied"))
            return
        except repo.StateError as e:
            await call.message.answer(t(lang, e.args[0]))
            return
    items = [(a.id, a.candidate_id, notify.rejection_text(
        vacancy.reject_template, T["msg_rejected_default"][tillar[a.candidate_id]], company.name, vacancy.title))
        for a in qolganlar]

    async def yoz(app_id: int, ok: bool):
        async with sessionmaker() as s2:
            await repo.mark_delivery(s2, app_id, ok)
            await s2.commit()

    ok, fail = await notify.broadcast(bot, items, yoz)
    log.info("Vakansiya %s yopildi: %d yetkazildi, %d yetkazilmadi", vacancy.id, ok, fail)
    await call.message.answer(t(lang, "closed_report", ok=ok, fail=fail))
