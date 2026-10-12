"""To'lov: Telegram Stars (asosiy, 30 kunlik obuna) va karta + chek (zaxira, admin tasdiqlaydi).

Narx va karta raqami faqat env'da (cfg). Pul bilan bog'liq har qadam log'ga
faqat ID bilan yoziladi; summa va charge_id — ma'lumot, shaxsiy emas.
"""
import logging

from aiogram import Bot, F, Router
from aiogram.exceptions import TelegramAPIError
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, LabeledPrice, Message,
                           PreCheckoutQuery)

from .. import billing, repo, repo_billing
from ..texts import t
from .common import CompanyCb, PayCb, esc, fmt_date

log = logging.getLogger(__name__)
router = Router(name="payment")

RECEIPT_MAX_BYTES = 10 * 1024 * 1024
RECEIPT_MIME = {"application/pdf", "image/jpeg", "image/png", "image/webp"}


class PayForm(StatesGroup):
    receipt = State()


def is_admin(user_id: int, cfg) -> bool:
    return user_id in cfg.admin_ids


async def _user_lang(sessionmaker, user_id: int) -> str:
    async with sessionmaker() as s:
        u = await s.get(repo.User, user_id)
    return u.lang if u else "uz"


async def _notify(bot: Bot, sessionmaker, user_ids, key: str, **kw) -> None:
    for uid in user_ids:
        try:
            await bot.send_message(uid, t(await _user_lang(sessionmaker, uid), key, **kw))
        except TelegramAPIError as e:
            log.warning("Xabar ketmadi (user %s, %s): %s", uid, key, e)


async def _payable(call: CallbackQuery, company_id: int, lang: str, sessionmaker):
    async with sessionmaker() as s:
        try:
            return await repo_billing.payable_company(s, company_id, call.from_user.id)
        except repo.AccessError:
            await call.message.answer(t(lang, "access_denied"))
        except repo.StateError as e:
            await call.message.answer(t(lang, e.args[0]))
    return None


# --- tanlov -----------------------------------------------------------------

@router.callback_query(CompanyCb.filter(F.action == "pay"))
async def pay_menu(call: CallbackQuery, callback_data: CompanyCb, lang: str, sessionmaker, cfg):
    await call.answer()
    if not cfg.payments_enabled:
        await call.message.answer(t(lang, "pay_disabled"))
        return
    company = await _payable(call, callback_data.company_id, lang, sessionmaker)
    if company is None:
        return
    kb = []
    if cfg.stars_price > 0:
        kb.append([InlineKeyboardButton(text=t(lang, "btn_pay_stars", price=cfg.stars_price),
                                        callback_data=CompanyCb(action="stars", company_id=company.id).pack())])
    if cfg.card_price_uzs > 0:
        kb.append([InlineKeyboardButton(text=t(lang, "btn_pay_card", price=billing.format_uzs(cfg.card_price_uzs)),
                                        callback_data=CompanyCb(action="card", company_id=company.id).pack())])
    await call.message.answer(t(lang, "pay_menu", name=esc(company.name)),
                              reply_markup=InlineKeyboardMarkup(inline_keyboard=kb))


# --- Telegram Stars ---------------------------------------------------------

@router.callback_query(CompanyCb.filter(F.action == "stars"))
async def stars_link(call: CallbackQuery, callback_data: CompanyCb, lang: str, sessionmaker, cfg, bot: Bot):
    await call.answer()
    if cfg.stars_price <= 0:
        await call.message.answer(t(lang, "pay_disabled"))
        return
    company = await _payable(call, callback_data.company_id, lang, sessionmaker)
    if company is None:
        return
    try:
        # Obuna faqat createInvoiceLink orqali (sendInvoice'da subscription_period yo'q).
        link = await bot.create_invoice_link(
            title=t(lang, "pay_stars_title"),
            description=t(lang, "pay_stars_desc", name=company.name)[:255],
            payload=billing.make_payload(company.id),
            provider_token="",
            currency=billing.STARS,
            prices=[LabeledPrice(label=t(lang, "pay_stars_title"), amount=cfg.stars_price)],
            subscription_period=billing.SUBSCRIPTION_SECONDS,
        )
    except TelegramAPIError as e:
        log.error("createInvoiceLink yiqildi (kompaniya %s): %s", company.id, e)
        await call.message.answer(t(lang, "pay_link_failed"))
        return
    kb = InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text=t(lang, "btn_pay_open"), url=link)]])
    await call.message.answer(t(lang, "pay_stars_link"), reply_markup=kb)


@router.pre_checkout_query()
async def pre_checkout(query: PreCheckoutQuery, lang: str, sessionmaker, cfg):
    """Telegram 10 soniya kutadi — javob har holatda beriladi, xatoda ham."""
    try:
        async with sessionmaker() as s:
            xato = await repo_billing.check_pre_checkout(
                s, query.invoice_payload, query.currency, query.total_amount, cfg.stars_price, query.from_user.id)
    except Exception:
        log.exception("pre_checkout tekshiruvi yiqildi (user %s)", query.from_user.id)
        xato = "pay_error"
    if xato:
        log.info("pre_checkout rad etildi (user %s): %s", query.from_user.id, xato)
        await query.answer(ok=False, error_message=t(lang, xato))
        return
    await query.answer(ok=True)


@router.message(F.successful_payment)
async def successful_payment(message: Message, lang: str, sessionmaker, cfg, bot: Bot):
    sp = message.successful_payment
    company_id = billing.parse_payload(sp.invoice_payload)
    if company_id is None or sp.currency != billing.STARS:
        # Pul tushgan, lekin bizning havolamiz emas — yo'qotmaslik uchun adminga aytamiz.
        log.error("Noma'lum to'lov: user %s, charge %s", message.from_user.id, sp.telegram_payment_charge_id)
        await _notify(bot, sessionmaker, cfg.admin_ids, "admin_unknown_payment", uid=message.from_user.id,
                      charge=esc(sp.telegram_payment_charge_id), amount=sp.total_amount)
        return
    async with sessionmaker() as s:
        payment, company, yangi = await repo_billing.record_stars_payment(
            s, company_id, message.from_user.id, sp.total_amount, sp.telegram_payment_charge_id,
            bool(sp.is_recurring))
        await s.commit()
    if not yangi:
        log.info("Takroriy successful_payment e'tiborsiz: to'lov #%s", payment.id)
        return
    log.info("Stars to'lov #%s: kompaniya %s, %s XTR, recurring=%s", payment.id, company_id, sp.total_amount,
             sp.is_recurring)
    if company.status == "blocked":
        await message.answer(t(lang, "company_blocked"))
    elif company.active_until is not None:
        await message.answer(t(lang, "pay_done_stars", name=esc(company.name), date=fmt_date(company.active_until)))
    kb = InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(
        text=t("uz", "btn_refund"), callback_data=PayCb(action="refund", payment_id=payment.id).pack())]])
    matn = t("uz", "admin_stars", name=esc(company.name), id=company.id, amount=sp.total_amount, pid=payment.id,
             recurring=t("uz", "recurring") if sp.is_recurring and not sp.is_first_recurring else "")
    for admin_id in cfg.admin_ids:
        try:
            await bot.send_message(admin_id, matn, reply_markup=kb)
        except TelegramAPIError as e:
            log.warning("Adminga (%s) to'lov xabari ketmadi: %s", admin_id, e)


@router.callback_query(PayCb.filter(F.action == "refund"))
async def refund(call: CallbackQuery, callback_data: PayCb, lang: str, sessionmaker, cfg, bot: Bot):
    if not is_admin(call.from_user.id, cfg):
        await call.answer(t(lang, "access_denied"), show_alert=True)
        return
    async with sessionmaker() as s:
        try:
            payment = await repo_billing.refundable_payment(s, callback_data.payment_id)
        except repo.StateError as e:
            await call.answer(t(lang, e.args[0]), show_alert=True)
            return
    try:
        await bot.refund_star_payment(user_id=payment.user_id, telegram_payment_charge_id=payment.telegram_charge_id)
    except TelegramAPIError as e:
        log.error("refundStarPayment yiqildi (to'lov #%s): %s", payment.id, e)
        await call.answer(t(lang, "refund_failed", err=str(e))[:200], show_alert=True)
        return
    async with sessionmaker() as s:
        try:
            payment, company = await repo_billing.mark_refunded(s, payment.id, call.from_user.id)
            await s.commit()
        except repo.StateError as e:
            await call.answer(t(lang, e.args[0]), show_alert=True)
            return
    log.info("Stars to'lov #%s qaytarildi (admin %s)", payment.id, call.from_user.id)
    if payment.is_recurring:
        # Pul qaytdi, lekin obuna o'zi keyingi oy yana yechib olmasin.
        try:
            await bot.edit_user_star_subscription(user_id=payment.user_id,
                                                  telegram_payment_charge_id=payment.telegram_charge_id,
                                                  is_canceled=True)
        except TelegramAPIError as e:
            log.error("Obunani bekor qilib bo'lmadi (to'lov #%s): %s", payment.id, e)
            await call.message.answer(t(lang, "refund_failed", err=f"subscription: {e}"))
    await call.answer(t(lang, "done"))
    await _notify(bot, sessionmaker, [payment.user_id], "pay_refunded", name=esc(company.name), amount=payment.amount)


# --- karta + chek -----------------------------------------------------------

@router.callback_query(CompanyCb.filter(F.action == "card"))
async def card_info(call: CallbackQuery, callback_data: CompanyCb, state: FSMContext, lang: str, sessionmaker, cfg):
    await call.answer()
    if cfg.card_price_uzs <= 0:
        await call.message.answer(t(lang, "pay_disabled"))
        return
    company = await _payable(call, callback_data.company_id, lang, sessionmaker)
    if company is None:
        return
    await state.set_state(PayForm.receipt)
    await state.update_data(company_id=company.id)
    holder = f"\n{esc(cfg.card_holder)}" if cfg.card_holder else ""
    await call.message.answer(t(lang, "pay_card_info", card=esc(cfg.card_number), holder=holder,
                                price=billing.format_uzs(cfg.card_price_uzs)))


def _receipt(message: Message) -> tuple[str, str] | None:
    """(file_id, tur) yoki None. Rasm — eng katta o'lcham; hujjat — faqat PDF/rasm, ≤ 10 MB."""
    if message.photo:
        return message.photo[-1].file_id, "photo"
    doc = message.document
    if doc and doc.mime_type in RECEIPT_MIME and (doc.file_size or 0) <= RECEIPT_MAX_BYTES:
        return doc.file_id, "document"
    return None


@router.message(PayForm.receipt, F.photo | F.document)
async def got_receipt(message: Message, state: FSMContext, lang: str, sessionmaker, cfg, bot: Bot):
    chek = _receipt(message)
    if chek is None:
        await message.answer(t(lang, "pay_receipt_bad"))
        return
    data = await state.get_data()
    await state.clear()
    async with sessionmaker() as s:
        try:
            payment = await repo_billing.create_card_payment(
                s, data["company_id"], message.from_user.id, cfg.card_price_uzs, *chek)
            company = await s.get(repo.Company, payment.company_id)
            await s.commit()
        except repo.AccessError:
            await message.answer(t(lang, "access_denied"))
            return
        except repo.StateError as e:
            await message.answer(t(lang, e.args[0]))
            return
    await message.answer(t(lang, "pay_receipt_sent"))
    kb = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text=t("uz", "btn_pay_approve"), callback_data=PayCb(action="approve", payment_id=payment.id).pack()),
        InlineKeyboardButton(text=t("uz", "btn_pay_reject"), callback_data=PayCb(action="reject", payment_id=payment.id).pack()),
    ]])
    caption = t("uz", "admin_receipt", name=esc(company.name), id=company.id,
                price=billing.format_uzs(payment.amount), pid=payment.id)
    for admin_id in cfg.admin_ids:
        try:
            if payment.receipt_kind == "photo":
                await bot.send_photo(admin_id, payment.receipt_file_id, caption=caption, reply_markup=kb)
            else:
                await bot.send_document(admin_id, payment.receipt_file_id, caption=caption, reply_markup=kb)
        except TelegramAPIError as e:
            log.warning("Adminga (%s) chek ketmadi (to'lov #%s): %s", admin_id, payment.id, e)


@router.message(PayForm.receipt, ~F.text.startswith("/"))
async def receipt_not_file(message: Message, lang: str):
    await message.answer(t(lang, "pay_receipt_bad"))


@router.callback_query(PayCb.filter(F.action.in_({"approve", "reject"})))
async def decide_card(call: CallbackQuery, callback_data: PayCb, lang: str, sessionmaker, cfg, bot: Bot):
    # Callback'ni istalgan odam yasab yuborishi mumkin — admin'likni qayta tekshiramiz.
    if not is_admin(call.from_user.id, cfg):
        await call.answer(t(lang, "access_denied"), show_alert=True)
        return
    tasdiq = callback_data.action == "approve"
    async with sessionmaker() as s:
        try:
            payment, company = await repo_billing.decide_card_payment(s, callback_data.payment_id, call.from_user.id, tasdiq)
            await s.commit()
        except repo.StateError as e:
            await call.answer(t(lang, e.args[0]), show_alert=True)
            return
    await call.answer(t(lang, "done"))
    log.info("Karta to'lovi #%s → %s (admin %s)", payment.id, payment.status, call.from_user.id)
    if tasdiq and company.active_until is not None:
        await _notify(bot, sessionmaker, [payment.user_id], "pay_approved", name=esc(company.name),
                      date=fmt_date(company.active_until))
    elif not tasdiq:
        await _notify(bot, sessionmaker, [payment.user_id], "pay_rejected", name=esc(company.name))
