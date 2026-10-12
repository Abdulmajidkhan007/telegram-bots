"""Telegram Business: ulanishni qayd etish va HR chatidagi nomzodga vakansiyalar ro'yxati.

Bu yerga LangMiddleware ulanmagan: HR bilan yozishgan har odamni bazaga yozmaymiz
(ular nomzod bo'lmasligi ham mumkin). Til — Telegram language_code'dan.
"""
import logging

from aiogram import Bot, Router
from aiogram.exceptions import TelegramAPIError
from aiogram.types import (BusinessConnection, CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, LinkPreviewOptions,
                           Message)

from .. import links, repo, repo_business
from ..texts import lang_of, t
from .common import BizCb, esc, fmt_date

log = logging.getLogger(__name__)
router = Router(name="business")


@router.business_connection()
async def connection(bc: BusinessConnection, sessionmaker, cfg, bot: Bot):
    # Bot API: `can_reply` eskirgan, huquqlar endi `rights` ichida.
    can_reply = bool(bc.rights.can_reply) if bc.rights else bool(bc.can_reply)
    async with sessionmaker() as s:
        link, kompaniyalar = await repo_business.upsert_connection(
            s, bc.id, bc.user.id, bc.user_chat_id, bc.is_enabled, can_reply)
        u = await s.get(repo.User, bc.user.id)
        await s.commit()
    lang = u.lang if u else lang_of(bc.user.language_code)
    log.info("Business ulanish: user %s, enabled=%s, can_reply=%s, kompaniya %s",
             bc.user.id, bc.is_enabled, can_reply, link.company_id)
    kb = None
    if not bc.is_enabled:
        matn = t(lang, "biz_disabled")
    elif not kompaniyalar:
        matn = t(lang, "biz_no_company")
    elif link.company_id is not None:
        company = next(c for c in kompaniyalar if c.id == link.company_id)
        matn = t(lang, "biz_connected", name=esc(company.name), hours=cfg.business_reply_hours)
    else:
        matn = t(lang, "biz_choose")
        kb = InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(
            text=c.name[:60], callback_data=BizCb(company_id=c.id).pack())] for c in kompaniyalar])
    if bc.is_enabled and kompaniyalar and not can_reply:
        matn += "\n\n" + t(lang, "biz_no_reply_right")
    try:
        await bot.send_message(bc.user_chat_id, matn, reply_markup=kb)
    except TelegramAPIError as e:
        log.warning("Business ulanish xabari ketmadi (user %s): %s", bc.user.id, e)


@router.callback_query(BizCb.filter())
async def choose(call: CallbackQuery, callback_data: BizCb, lang: str, sessionmaker, cfg):
    await call.answer()
    async with sessionmaker() as s:
        try:
            company = await repo_business.choose_company(s, call.from_user.id, callback_data.company_id)
            await s.commit()
        except repo.AccessError:
            await call.message.answer(t(lang, "access_denied"))
            return
    await call.message.answer(t(lang, "biz_connected", name=esc(company.name), hours=cfg.business_reply_hours))


@router.business_message()
async def on_message(message: Message, sessionmaker, cfg, bot: Bot):
    sender = message.from_user
    if sender is None or sender.is_bot or message.chat.type != "private" or not message.business_connection_id:
        return
    async with sessionmaker() as s:
        target = await repo_business.reply_target(
            s, message.business_connection_id, message.chat.id, sender.id, cfg.business_reply_hours)
        await s.commit()
    if target is None:
        return
    company, vakansiyalar = target
    lang = lang_of(sender.language_code)
    me = await bot.me()
    qatorlar = "\n\n".join(t(lang, "biz_line", title=esc(v.title), deadline=fmt_date(v.deadline),
                             link=links.vacancy_link(me.username, v.slug)) for v in vakansiyalar)
    try:
        # Message.answer business_connection_id ni o'zi uzatadi — javob HR nomidan ketadi.
        await message.answer(t(lang, "biz_vacancies", company=esc(company.name), lines=qatorlar),
                             link_preview_options=LinkPreviewOptions(is_disabled=True))
    except TelegramAPIError as e:
        log.warning("Business javobi ketmadi (ulanish %s, chat %s): %s",
                    message.business_connection_id, message.chat.id, e)
    else:
        log.info("Business javob: kompaniya %s, chat %s, %d vakansiya", company.id, message.chat.id, len(vakansiyalar))
