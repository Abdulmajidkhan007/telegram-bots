"""SQLAlchemy 2 (async) modellari. PostgreSQL'ga o'tish — faqat DATABASE_URL.

Telegram ID'lari 32-bitdan katta — barcha ID ustunlari BigInteger.
"""
import logging
from datetime import datetime, timezone

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, inspect, text
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

log = logging.getLogger(__name__)


def now() -> datetime:
    return datetime.now(timezone.utc)


def aware(dt: datetime | None) -> datetime | None:
    """SQLite vaqt zonasini saqlamaydi — o'qilgan qiymat naive keladi.
    Naive va aware'ni solishtirish TypeError beradi, shuning uchun UTC deb belgilaymiz."""
    if dt is not None and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    tg_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(String(128), default="")
    lang: Mapped[str] = mapped_column(String(2), default="uz")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Company(Base):
    __tablename__ = "companies"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(32), unique=True)
    name: Mapped[str] = mapped_column(String(128))
    status: Mapped[str] = mapped_column(String(16), default="pending")  # pending/active/blocked
    # None — admin faollashtirgan pilot (muddatsiz); to'lov har safar +30 kun qo'shadi.
    active_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Muddat eslatmasi bir marta ketsin: None → "soon" → "expired"; to'lovda None ga qaytadi.
    expiry_notice: Mapped[str | None] = mapped_column(String(8), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Member(Base):
    __tablename__ = "members"
    __table_args__ = (UniqueConstraint("company_id", "user_id"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)
    user_id: Mapped[int] = mapped_column(BigInteger, index=True)
    role: Mapped[str] = mapped_column(String(8))  # owner/hr


class Invite(Base):
    __tablename__ = "invites"
    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    role: Mapped[str] = mapped_column(String(8), default="hr")
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)


class Vacancy(Base):
    __tablename__ = "vacancies"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)
    slug: Mapped[str] = mapped_column(String(62), unique=True)
    title: Mapped[str] = mapped_column(String(128))
    requirements: Mapped[str] = mapped_column(Text)
    deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(8), default="open")  # open/closed
    reject_template: Mapped[str] = mapped_column(Text, default="")
    # AI sabablari shu tilda yoziladi — vakansiyani ochgan HR tili.
    lang: Mapped[str] = mapped_column(String(2), default="uz")
    reminded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Application(Base):
    __tablename__ = "applications"
    # Bitta nomzod — bitta vakansiyaga bitta ariza (CV almashtirilsa yangilanadi).
    __table_args__ = (UniqueConstraint("vacancy_id", "candidate_id"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    vacancy_id: Mapped[int] = mapped_column(ForeignKey("vacancies.id"), index=True)
    candidate_id: Mapped[int] = mapped_column(BigInteger, index=True)
    candidate_name: Mapped[str] = mapped_column(String(128), default="")
    cv_file_id: Mapped[str | None] = mapped_column(String(256), nullable=True)
    cv_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    links: Mapped[str] = mapped_column(Text, default="")
    ai_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    status: Mapped[str] = mapped_column(String(16), default="new")
    notified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivery: Mapped[str | None] = mapped_column(String(16), nullable=True)  # ok/undeliverable
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    cv_deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AiUsage(Base):
    """Kunlik AI chaqiruv hisobi — xarajat nazorati."""
    __tablename__ = "ai_usage"
    day: Mapped[str] = mapped_column(String(10), primary_key=True)  # YYYY-MM-DD (UTC)
    calls: Mapped[int] = mapped_column(Integer, default=0)
    tokens: Mapped[int] = mapped_column(Integer, default=0)


class Payment(Base):
    __tablename__ = "payments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)
    user_id: Mapped[int] = mapped_column(BigInteger)  # to'lagan ega
    method: Mapped[str] = mapped_column(String(8))  # stars/card
    amount: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(8))  # XTR/UZS
    status: Mapped[str] = mapped_column(String(10), default="pending")  # pending/approved/rejected/refunded
    receipt_file_id: Mapped[str | None] = mapped_column(String(256), nullable=True)
    receipt_kind: Mapped[str | None] = mapped_column(String(8), nullable=True)  # photo/document
    # Unikal: Telegram bitta to'lovni qayta yetkazsa ham muddat ikki marta uzaymaydi.
    telegram_charge_id: Mapped[str | None] = mapped_column(String(128), unique=True, nullable=True)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    decided_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class BusinessLink(Base):
    """Telegram Business ulanishi: HR o'z akkauntiga botni ulagan (Settings → Business → Chatbots)."""
    __tablename__ = "business_links"
    connection_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger, index=True)  # ulagan HR
    user_chat_id: Mapped[int] = mapped_column(BigInteger)
    company_id: Mapped[int | None] = mapped_column(ForeignKey("companies.id"), nullable=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    can_reply: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class BusinessReply(Base):
    """HR chatida bot qachon javob bergan — har yozuvga emas, chatga kuniga bir marta."""
    __tablename__ = "business_replies"
    connection_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    chat_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    replied_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


def make_engine(url: str) -> AsyncEngine:
    return create_async_engine(url)


def add_missing_columns(conn) -> list[str]:
    """create_all mavjud jadvalga yangi ustun qo'shmaydi — eski baza bilan bot
    "no such column" bilan yiqilardi. Yangi ustunlar faqat nullable qilinadi."""
    insp = inspect(conn)
    qoshildi = []
    for table in Base.metadata.sorted_tables:
        if not insp.has_table(table.name):
            continue
        mavjud = {c["name"] for c in insp.get_columns(table.name)}
        for col in table.columns:
            if col.name in mavjud:
                continue
            if not col.nullable:
                raise RuntimeError(f"{table.name}.{col.name}: NOT NULL ustunni avtomatik qo'shib bo'lmaydi")
            conn.execute(text(f"ALTER TABLE {table.name} ADD COLUMN {col.name} {col.type.compile(conn.dialect)}"))
            qoshildi.append(f"{table.name}.{col.name}")
    for nom in qoshildi:
        log.info("Bazaga ustun qo'shildi: %s", nom)
    return qoshildi


async def init_db(engine: AsyncEngine) -> async_sessionmaker:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(add_missing_columns)
    return async_sessionmaker(engine, expire_on_commit=False)
