"""Telegram Business: HR o'z akkauntiga botni ulaydi, nomzod HR'ga yozsa bot
HR nomidan ochiq vakansiyalar va deep link'larni yuboradi.

Userbot emas (session fayl bizda saqlanmaydi) — rasmiy yo'l, HR istalgan vaqtda uzadi.
Kompaniya izolyatsiyasi shu yerda ham: ulanish faqat HR a'zo bo'lgan kompaniyaga
bog'lanadi va har javobda a'zolik qayta tekshiriladi (HR kompaniyadan chiqarilgan bo'lishi mumkin).
"""
from datetime import datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from . import billing
from .db import BusinessLink, BusinessReply, Company, Vacancy, aware, now
from .repo import accepts_applications, member_role, require_member, user_companies

MAX_VACANCIES = 10


async def upsert_connection(
    s: AsyncSession, connection_id: str, user_id: int, user_chat_id: int, is_enabled: bool, can_reply: bool,
) -> tuple[BusinessLink, list[Company]]:
    """(ulanish, HR kompaniyalari). Kompaniya bitta bo'lsa — avtomatik bog'lanadi."""
    link = await s.get(BusinessLink, connection_id)
    if link is None:
        link = BusinessLink(connection_id=connection_id, user_id=user_id)
        s.add(link)
    link.user_id, link.user_chat_id = user_id, user_chat_id
    link.is_enabled, link.can_reply, link.updated_at = is_enabled, can_reply, now()
    kompaniyalar = [c for c, _ in await user_companies(s, user_id)]
    if link.company_id not in {c.id for c in kompaniyalar}:
        link.company_id = kompaniyalar[0].id if len(kompaniyalar) == 1 else None
    await s.flush()
    return link, kompaniyalar


async def choose_company(s: AsyncSession, user_id: int, company_id: int) -> Company:
    """HR bir nechta kompaniyada bo'lsa — qaysi birining vakansiyalari ko'rsatilishini tanlaydi."""
    await require_member(s, company_id, user_id)
    await s.execute(update(BusinessLink).where(BusinessLink.user_id == user_id).values(company_id=company_id))
    return await s.get(Company, company_id)


async def reply_target(
    s: AsyncSession, connection_id: str, chat_id: int, sender_id: int, every_hours: int,
    at: datetime | None = None,
) -> tuple[Company, list[Vacancy]] | None:
    """Javob berish kerakmi: kerak bo'lsa (kompaniya, ochiq vakansiyalar) va vaqt belgilanadi.

    Javob YO'Q: ulanish o'chiq/huquqsiz, xabarni HR'ning o'zi yozgan, kompaniya
    tanlanmagan yoki HR endi a'zo emas, obuna tugagan, ochiq vakansiya yo'q,
    yoki shu chatga yaqinda javob berilgan (HR'ning shaxsiy chatini spam qilmaymiz).
    """
    at = at or now()
    link = await s.get(BusinessLink, connection_id)
    if link is None or not link.is_enabled or not link.can_reply or link.company_id is None:
        return None
    if sender_id == link.user_id or chat_id == link.user_id:
        return None
    if await member_role(s, link.company_id, link.user_id) is None:
        return None
    company = await s.get(Company, link.company_id)
    if not billing.is_paid_up(company.status, aware(company.active_until), at):
        return None
    vakansiyalar = [v for v in (await s.scalars(
        select(Vacancy).where(Vacancy.company_id == company.id, Vacancy.status == "open").order_by(Vacancy.deadline)
    )).all() if accepts_applications(v, company, at)][:MAX_VACANCIES]
    if not vakansiyalar:
        return None
    oxirgi = await s.get(BusinessReply, (connection_id, chat_id))
    if oxirgi is not None and aware(oxirgi.replied_at) > at - timedelta(hours=every_hours):
        return None
    if oxirgi is None:
        s.add(BusinessReply(connection_id=connection_id, chat_id=chat_id, replied_at=at))
    else:
        oxirgi.replied_at = at
    await s.flush()
    return company, vakansiyalar
