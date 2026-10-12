"""To'lovlar va obuna muddati (bazaga yozuvchi qism). Toza hisob — billing.py da.

Idempotentlik ikki joyda ta'minlanadi:
- Stars: `telegram_charge_id` unikal — bitta to'lov qayta kelsa muddat uzaymaydi;
- karta: admin qarori shartli UPDATE (`WHERE status='pending'`) — ikki admin bir
  vaqtda bossa ham, bitta tugma ikki marta bosilsa ham faqat bittasi o'tadi.
"""
from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from . import billing
from .db import Company, Payment, aware, now
from .repo import AccessError, StateError, company_owners, require_member


async def payable_company(s: AsyncSession, company_id: int, user_id: int) -> Company:
    """Faqat kompaniya egasi to'laydi; bloklangan kompaniya to'lay olmaydi (pul qaytarishga to'g'ri kelardi)."""
    await require_member(s, company_id, user_id, owner=True)
    company = await s.get(Company, company_id)
    if company.status == "blocked":
        raise StateError("company_blocked")
    return company


async def check_pre_checkout(s: AsyncSession, payload: str, currency: str, total: int, price: int,
                             user_id: int) -> str | None:
    """None — to'lovni qabul qilish mumkin, aks holda texts.py kaliti."""
    company_id, xato = billing.check_invoice(payload, currency, total, price)
    if xato:
        return xato
    try:
        await payable_company(s, company_id, user_id)
    except AccessError:
        return "pay_not_owner"
    except StateError as e:
        return e.args[0]
    return None


def _extend(company: Company, at: datetime) -> None:
    company.active_until = billing.extend_until(aware(company.active_until), at)
    company.expiry_notice = None
    if company.status == "pending":
        company.status = "active"


async def record_stars_payment(
    s: AsyncSession, company_id: int, user_id: int, amount: int, charge_id: str, recurring: bool,
    at: datetime | None = None,
) -> tuple[Payment, Company, bool]:
    """(to'lov, kompaniya, yangi_mi). Bir xil charge_id ikkinchi marta kelsa — hech narsa o'zgarmaydi."""
    at = at or now()
    mavjud = await s.scalar(select(Payment).where(Payment.telegram_charge_id == charge_id))
    company = await s.get(Company, company_id)
    if mavjud is not None:
        return mavjud, company, False
    if company is None:
        raise StateError("not_found")
    payment = Payment(company_id=company_id, user_id=user_id, method="stars", amount=amount,
                      currency=billing.STARS, status="approved", telegram_charge_id=charge_id,
                      is_recurring=recurring, decided_at=at)
    try:
        async with s.begin_nested():
            s.add(payment)
            await s.flush()
    except IntegrityError:
        # Parallel yetkazilgan nusxa bizdan oldin yozib ulgurdi — u allaqachon muddatni uzaytirgan.
        return await s.scalar(select(Payment).where(Payment.telegram_charge_id == charge_id)), company, False
    # Bloklangan kompaniyaning avtomatik yangilangan obunasi faollashtirmaydi — admin pulni qaytaradi.
    if company.status != "blocked":
        _extend(company, at)
    await s.flush()
    return payment, company, True


async def create_card_payment(s: AsyncSession, company_id: int, user_id: int, amount: int,
                              file_id: str, kind: str) -> Payment:
    await payable_company(s, company_id, user_id)
    kutayotgan = await s.scalar(select(Payment.id).where(
        Payment.company_id == company_id, Payment.method == "card", Payment.status == "pending"))
    if kutayotgan is not None:
        raise StateError("pay_pending_exists")
    payment = Payment(company_id=company_id, user_id=user_id, method="card", amount=amount, currency="UZS",
                      status="pending", receipt_file_id=file_id, receipt_kind=kind)
    s.add(payment)
    await s.flush()
    return payment


async def decide_card_payment(s: AsyncSession, payment_id: int, admin_id: int, approve: bool,
                              at: datetime | None = None) -> tuple[Payment, Company]:
    """Faqat platforma admini chaqiradi (handler ADMIN_IDS ni tekshiradi)."""
    at = at or now()
    natija = await s.execute(
        update(Payment)
        .where(Payment.id == payment_id, Payment.method == "card", Payment.status == "pending")
        .values(status="approved" if approve else "rejected", decided_by=admin_id, decided_at=at)
    )
    payment = await s.get(Payment, payment_id)
    if natija.rowcount != 1:
        raise StateError("pay_already_decided" if payment else "not_found")
    await s.refresh(payment)
    company = await s.get(Company, payment.company_id)
    if approve and company.status != "blocked":
        _extend(company, at)
    await s.flush()
    return payment, company


async def refundable_payment(s: AsyncSession, payment_id: int) -> Payment:
    payment = await s.get(Payment, payment_id)
    if payment is None or payment.method != "stars":
        raise StateError("not_found")
    if payment.status != "approved":
        raise StateError("pay_already_refunded")
    return payment


async def mark_refunded(s: AsyncSession, payment_id: int, admin_id: int,
                        at: datetime | None = None) -> tuple[Payment, Company]:
    """Telegram pulni qaytargandan KEYIN chaqiriladi; berilgan 30 kun qaytarib olinadi (bir marta)."""
    natija = await s.execute(
        update(Payment).where(Payment.id == payment_id, Payment.status == "approved")
        .values(status="refunded", decided_by=admin_id, decided_at=at or now())
    )
    payment = await s.get(Payment, payment_id)
    if natija.rowcount != 1:
        raise StateError("pay_already_refunded")
    await s.refresh(payment)
    company = await s.get(Company, payment.company_id)
    company.active_until = billing.shorten_until(aware(company.active_until))
    await s.flush()
    return payment, company


async def expiry_notices(s: AsyncSession, remind_days: int,
                         at: datetime | None = None) -> list[tuple[Company, str, list[int]]]:
    """Eslatma kerak bo'lgan kompaniyalar: (kompaniya, 'soon'|'expired', egalar). Har bosqich — bir marta."""
    at = at or now()
    natija = []
    kompaniyalar = (await s.scalars(select(Company).where(
        Company.status == "active", Company.active_until.is_not(None)))).all()
    for c in kompaniyalar:
        bosqich = billing.expiry_stage(aware(c.active_until), at, remind_days)
        if not bosqich or bosqich == c.expiry_notice:
            continue
        if bosqich == "soon" and c.expiry_notice == "expired":
            continue  # bo'lmaydi (to'lov None ga qaytaradi), lekin orqaga eslatma yubormaymiz
        c.expiry_notice = bosqich
        natija.append((c, bosqich, await company_owners(s, c.id)))
    await s.flush()
    return natija

