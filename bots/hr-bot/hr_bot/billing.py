"""To'lov va obuna muddati — toza mantiq (baza va Telegram'siz test qilinadi).

Fakt manbai — o'rnatilgan aiogram 3.31 (rasmiy Bot API'dan generatsiya qilingan):
- createInvoiceLink.subscription_period: «Currently, it must always be 2592000
  (30 days) if specified … Subscription price must no exceed 10000 Telegram Stars»;
  valyuta faqat 'XTR'. sendInvoice'da bu maydon yo'q — shuning uchun havola.
- Stars uchun `prices` da aynan bitta element bo'lishi shart.
"""
import re
from datetime import datetime, timedelta

STARS = "XTR"
SUBSCRIPTION_SECONDS = 2592000  # Bot API: hozircha faqat shu qiymat ruxsat etilgan
PERIOD_DAYS = SUBSCRIPTION_SECONDS // 86400  # 30 — karta to'lovi ham shuncha muddat beradi
MAX_STARS = 10000

# Payload foydalanuvchi qo'lidan o'tmaydi, lekin pre_checkout'da baribir tekshiriladi:
# boshqa bot/eski havola payload'i bilan kelgan to'lov qabul qilinmasin.
_PAYLOAD_RE = re.compile(r"^sub_([1-9][0-9]{0,9})$")


def make_payload(company_id: int) -> str:
    return f"sub_{company_id}"


def parse_payload(payload: str | None) -> int | None:
    m = _PAYLOAD_RE.match(payload or "")
    return int(m.group(1)) if m else None


def check_invoice(payload: str, currency: str, total_amount: int, price: int) -> tuple[int | None, str | None]:
    """(company_id, xato_kaliti). Narx o'zgargan bo'lsa eski havola bilan to'lov o'tmaydi."""
    company_id = parse_payload(payload)
    if company_id is None:
        return None, "pay_bad_invoice"
    if currency != STARS or price <= 0 or total_amount != price:
        return company_id, "pay_price_changed"
    return company_id, None


def extend_until(current: datetime | None, at: datetime, days: int = PERIOD_DAYS) -> datetime:
    """Har to'lov +30 kun. Muddat tugamagan bo'lsa — qolgan kunlar yo'qolmaydi (oxiridan qo'shiladi)."""
    base = current if current is not None and current > at else at
    return base + timedelta(days=days)


def shorten_until(current: datetime | None, days: int = PERIOD_DAYS) -> datetime | None:
    """Pul qaytarilganda berilgan muddat qaytarib olinadi. Pilot (None) — o'zgarmaydi."""
    return None if current is None else current - timedelta(days=days)


def is_paid_up(status: str, active_until: datetime | None, at: datetime) -> bool:
    """Yangi vakansiya ochish mumkinmi. active_until=None — admin faollashtirgan pilot (muddatsiz)."""
    return status == "active" and (active_until is None or active_until > at)


def expiry_stage(active_until: datetime | None, at: datetime, remind_days: int) -> str:
    """'' — eslatma kerak emas, 'soon' — tez orada tugaydi, 'expired' — tugadi."""
    if active_until is None:
        return ""
    if active_until <= at:
        return "expired"
    if active_until - at <= timedelta(days=remind_days):
        return "soon"
    return ""


def format_uzs(amount: int) -> str:
    return f"{amount:,}".replace(",", " ")
