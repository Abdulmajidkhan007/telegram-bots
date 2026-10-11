"""Ma'lumotlar bilan ishlash. Har HR amalida kompaniya a'zoligi SHU YERDA tekshiriladi.

Handler'lar huquqni o'zi tekshirishiga tayanmaymiz: bitta unutilgan tekshiruv —
bir kompaniya boshqasining nomzodlari CV'sini ko'radi. Shuning uchun
`user_id` qabul qiladigan har funksiya a'zolikni o'zi tekshiradi (AccessError).
"""
from datetime import datetime, timedelta

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from . import links, status
from .db import AiUsage, Application, Company, Invite, Member, User, Vacancy, aware, now


class AccessError(PermissionError):
    """Foydalanuvchida bu obyektga huquq yo'q (yoki obyekt yo'q — farqi oshkor qilinmaydi)."""


class StateError(ValueError):
    """Amal hozirgi holatda mumkin emas. args[0] — texts.py kaliti."""


# --- foydalanuvchi ----------------------------------------------------------

async def ensure_user(s: AsyncSession, tg_id: int, name: str, lang: str) -> User:
    user = await s.get(User, tg_id)
    if user is None:
        user = User(tg_id=tg_id, name=name[:128], lang=lang)
        s.add(user)
    else:
        user.name = name[:128]
    await s.flush()
    return user


async def set_lang(s: AsyncSession, tg_id: int, lang: str) -> None:
    await s.execute(update(User).where(User.tg_id == tg_id).values(lang=lang))


# --- kompaniya --------------------------------------------------------------

async def create_company(s: AsyncSession, owner_id: int, name: str) -> Company:
    mavjud = set((await s.scalars(select(Company.slug))).all())
    slug = links.vacancy_slug(name, "", mavjud)[:32]
    company = Company(name=name[:128], slug=slug, status="pending")
    s.add(company)
    await s.flush()
    s.add(Member(company_id=company.id, user_id=owner_id, role="owner"))
    await s.flush()
    return company


async def set_company_status(s: AsyncSession, company_id: int, yangi: str) -> Company:
    """Faqat platforma admini chaqiradi (handler ADMIN_IDS ni tekshiradi)."""
    if yangi not in ("pending", "active", "blocked"):
        raise ValueError(yangi)
    company = await s.get(Company, company_id)
    if company is None:
        raise StateError("not_found")
    company.status = yangi
    await s.flush()
    return company


async def member_role(s: AsyncSession, company_id: int, user_id: int) -> str | None:
    return await s.scalar(
        select(Member.role).where(Member.company_id == company_id, Member.user_id == user_id)
    )


async def require_member(s: AsyncSession, company_id: int, user_id: int, owner: bool = False) -> str:
    role = await member_role(s, company_id, user_id)
    if role is None or (owner and role != "owner"):
        raise AccessError(company_id)
    return role


async def company_owners(s: AsyncSession, company_id: int) -> list[int]:
    return list((await s.scalars(select(Member.user_id).where(
        Member.company_id == company_id, Member.role == "owner"))).all())


async def user_companies(s: AsyncSession, user_id: int) -> list[tuple[Company, str]]:
    rows = await s.execute(
        select(Company, Member.role).join(Member, Member.company_id == Company.id)
        .where(Member.user_id == user_id).order_by(Company.id)
    )
    return [(c, r) for c, r in rows.all()]


async def pending_companies(s: AsyncSession) -> list[Company]:
    return list((await s.scalars(select(Company).where(Company.status == "pending"))).all())


# --- HR taklifi -------------------------------------------------------------

async def create_invite(s: AsyncSession, company_id: int, by_user: int, ttl_days: int = 7) -> str:
    await require_member(s, company_id, by_user, owner=True)
    token = links.new_token()
    s.add(Invite(token=token, company_id=company_id, role="hr", expires_at=now() + timedelta(days=ttl_days)))
    await s.flush()
    return token


async def accept_invite(s: AsyncSession, token: str, user_id: int) -> Company:
    invite = await s.get(Invite, token)
    if invite is None or invite.used_by is not None or aware(invite.expires_at) < now():
        raise StateError("invite_invalid")
    if await member_role(s, invite.company_id, user_id) is None:
        s.add(Member(company_id=invite.company_id, user_id=user_id, role=invite.role))
    invite.used_by = user_id
    await s.flush()
    return await s.get(Company, invite.company_id)


# --- vakansiya --------------------------------------------------------------

async def create_vacancy(
    s: AsyncSession, company_id: int, by_user: int, title: str, requirements: str,
    days: int, reject_template: str = "", lang: str = "uz",
) -> Vacancy:
    await require_member(s, company_id, by_user)
    company = await s.get(Company, company_id)
    if company.status != "active":
        raise StateError("company_not_active")
    if not 1 <= days <= 90:
        raise StateError("bad_days")
    mavjud = set((await s.scalars(select(Vacancy.slug))).all())
    vacancy = Vacancy(
        company_id=company_id, slug=links.vacancy_slug(company.name, title, mavjud),
        title=title[:128], requirements=requirements[:4000],
        deadline=now() + timedelta(days=days), reject_template=reject_template[:2000], lang=lang,
    )
    s.add(vacancy)
    await s.flush()
    return vacancy


async def vacancy_by_slug(s: AsyncSession, slug: str) -> tuple[Vacancy, Company] | None:
    row = (await s.execute(
        select(Vacancy, Company).join(Company, Company.id == Vacancy.company_id).where(Vacancy.slug == slug)
    )).first()
    return (row[0], row[1]) if row else None


async def company_vacancies(s: AsyncSession, company_id: int, user_id: int) -> list[Vacancy]:
    await require_member(s, company_id, user_id)
    return list((await s.scalars(
        select(Vacancy).where(Vacancy.company_id == company_id).order_by(Vacancy.id.desc())
    )).all())


async def get_vacancy(s: AsyncSession, vacancy_id: int, user_id: int) -> Vacancy:
    vacancy = await s.get(Vacancy, vacancy_id)
    if vacancy is None:
        raise AccessError(vacancy_id)
    await require_member(s, vacancy.company_id, user_id)
    return vacancy


def accepts_applications(vacancy: Vacancy, company: Company, at: datetime | None = None) -> bool:
    return vacancy.status == "open" and company.status == "active" and aware(vacancy.deadline) > (at or now())


# --- ariza ------------------------------------------------------------------

async def submit_application(
    s: AsyncSession, vacancy: Vacancy, company: Company, candidate_id: int, name: str,
    cv_file_id: str, cv_text: str, links_text: str,
) -> tuple[Application, bool]:
    """(ariza, yangi_mi). Muddat ichida qayta yuborilsa CV almashtiriladi va ball qayta hisoblanadi."""
    if not accepts_applications(vacancy, company):
        raise StateError("vacancy_closed")
    app = await s.scalar(select(Application).where(
        Application.vacancy_id == vacancy.id, Application.candidate_id == candidate_id))
    yangi = app is None
    if yangi:
        app = Application(vacancy_id=vacancy.id, candidate_id=candidate_id)
        s.add(app)
    elif app.status != status.NEW:
        raise StateError("already_decided")
    app.candidate_name = name[:128]
    app.cv_file_id = cv_file_id
    app.cv_text = cv_text
    app.links = links_text[:1000]
    app.ai_score = None
    app.ai_summary = None
    await s.flush()
    return app, yangi


async def save_ai_result(s: AsyncSession, app_id: int, score: int, summary_json: str) -> None:
    await s.execute(update(Application).where(Application.id == app_id).values(ai_score=score, ai_summary=summary_json))


async def list_applications(s: AsyncSession, vacancy_id: int, user_id: int) -> list[Application]:
    await get_vacancy(s, vacancy_id, user_id)
    # Ball bo'yicha kamayish; ball yo'qlar (AI ishlamagan) oxirida.
    return list((await s.scalars(
        select(Application).where(Application.vacancy_id == vacancy_id)
        .order_by(Application.ai_score.is_(None), Application.ai_score.desc(), Application.id)
    )).all())


async def get_application(s: AsyncSession, app_id: int, user_id: int) -> tuple[Application, Vacancy]:
    app = await s.get(Application, app_id)
    if app is None:
        raise AccessError(app_id)
    vacancy = await get_vacancy(s, app.vacancy_id, user_id)
    return app, vacancy


async def decide(s: AsyncSession, app_id: int, user_id: int, yangi: str) -> tuple[Application, Vacancy]:
    app, vacancy = await get_application(s, app_id, user_id)
    try:
        app.status = status.transition(app.status, yangi)
    except status.TransitionError as e:
        raise StateError("already_decided") from e
    await s.flush()
    return app, vacancy


async def count_undecided(s: AsyncSession, vacancy_id: int, user_id: int) -> int:
    await get_vacancy(s, vacancy_id, user_id)
    return await s.scalar(select(func.count()).select_from(Application).where(
        Application.vacancy_id == vacancy_id, Application.status.in_(status.UNDECIDED)))


async def close_vacancy(s: AsyncSession, vacancy_id: int, user_id: int) -> tuple[Vacancy, list[Application]]:
    """Vakansiyani yopadi va qaror qilinmaganlarni `rejected` qiladi.

    Qaytgan ro'yxat — rad xati yuborilishi kerak bo'lganlar. Allaqachon
    taklif/rad olganlarga ikkinchi xabar ketmaydi.
    """
    vacancy = await get_vacancy(s, vacancy_id, user_id)
    if vacancy.status == "closed":
        raise StateError("already_closed")
    qolganlar = list((await s.scalars(select(Application).where(
        Application.vacancy_id == vacancy_id, Application.status.in_(status.UNDECIDED)))).all())
    for app in qolganlar:
        app.status = status.transition(app.status, status.REJECTED)
    vacancy.status = "closed"
    vacancy.closed_at = now()
    await s.flush()
    return vacancy, qolganlar


async def mark_delivery(s: AsyncSession, app_id: int, ok: bool) -> None:
    await s.execute(update(Application).where(Application.id == app_id).values(
        delivery="ok" if ok else "undeliverable", notified_at=now()))


async def overdue_vacancies(s: AsyncSession, at: datetime | None = None) -> list[tuple[Vacancy, list[int], int]]:
    """Muddati o'tgan, hali eslatilmagan ochiq vakansiyalar: (vakansiya, a'zolar, qarorsizlar soni).
    Eslatma faqat bir marta — reminded_at belgilanadi. Avtomatik rad YO'Q."""
    natija = []
    vakansiyalar = (await s.scalars(select(Vacancy).where(
        Vacancy.status == "open", Vacancy.reminded_at.is_(None), Vacancy.deadline < (at or now())))).all()
    for v in vakansiyalar:
        azolar = list((await s.scalars(select(Member.user_id).where(Member.company_id == v.company_id))).all())
        n = await s.scalar(select(func.count()).select_from(Application).where(
            Application.vacancy_id == v.id, Application.status.in_(status.UNDECIDED)))
        v.reminded_at = at or now()
        natija.append((v, azolar, n))
    await s.flush()
    return natija


# --- saqlash muddati --------------------------------------------------------

async def purge_expired_cvs(s: AsyncSession, retention_days: int, at: datetime | None = None) -> int:
    """Yopilgan vakansiya + retention_days o'tgan arizalarning CV matni va fayl havolasini o'chiradi."""
    chegara = (at or now()) - timedelta(days=retention_days)
    vakansiyalar = select(Vacancy.id).where(Vacancy.status == "closed", Vacancy.closed_at < chegara)
    natija = await s.execute(
        update(Application)
        .where(Application.vacancy_id.in_(vakansiyalar), Application.cv_deleted_at.is_(None))
        .values(cv_text=None, cv_file_id=None, links="", cv_deleted_at=at or now())
    )
    return natija.rowcount or 0


# --- AI xarajat nazorati ----------------------------------------------------

async def reserve_ai_call(s: AsyncSession, limit: int, at: datetime | None = None) -> bool:
    """Kunlik limitdan oshmasa chaqiruvni hisobga yozib True qaytaradi."""
    if limit <= 0:
        return False
    day = (at or now()).strftime("%Y-%m-%d")
    row = await s.get(AiUsage, day)
    if row is None:
        row = AiUsage(day=day, calls=0, tokens=0)
        s.add(row)
    if row.calls >= limit:
        return False
    row.calls += 1
    await s.flush()
    return True


async def add_ai_tokens(s: AsyncSession, tokens: int, at: datetime | None = None) -> None:
    day = (at or now()).strftime("%Y-%m-%d")
    await s.execute(update(AiUsage).where(AiUsage.day == day).values(tokens=AiUsage.tokens + tokens))


async def stats(s: AsyncSession) -> dict[str, int]:
    async def n(model, *where):
        return await s.scalar(select(func.count()).select_from(model).where(*where)) or 0
    return {
        "companies": await n(Company),
        "active": await n(Company, Company.status == "active"),
        "vacancies": await n(Vacancy),
        "applications": await n(Application),
    }
