"""Sozlamalar faqat env'dan. Import paytida o'qilmaydi — testlar tokensiz ishlasin."""
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BOT_DIR = Path(__file__).resolve().parent.parent


def _int(nom: str, standart: int) -> int:
    xom = os.getenv(nom, "").strip()
    if not xom:
        return standart
    try:
        return int(xom)
    except ValueError:
        raise SystemExit(f"❌ {nom} butun son bo'lishi kerak, hozir: {xom!r}")


def parse_admin_ids(xom: str) -> frozenset[int]:
    ids = set()
    for qism in xom.replace(" ", "").split(","):
        if not qism:
            continue
        if not qism.lstrip("-").isdigit():
            raise SystemExit(f"❌ ADMIN_IDS da raqam bo'lmagan qiymat: {qism!r}")
        ids.add(int(qism))
    return frozenset(ids)


@dataclass(frozen=True)
class Config:
    bot_token: str
    admin_ids: frozenset[int]
    database_url: str
    gemini_api_key: str
    gemini_model: str
    ai_daily_limit: int
    cv_retention_days: int


def load() -> Config:
    load_dotenv(BOT_DIR / ".env")
    token = os.getenv("BOT_TOKEN", "").strip()
    if not token or token.startswith("BU_YERGA"):
        raise SystemExit("❌ .env da BOT_TOKEN to'ldirilmagan (bots/hr-bot/.env)")
    admin_ids = parse_admin_ids(os.getenv("ADMIN_IDS", ""))
    if not admin_ids:
        # Adminsiz hech bir kompaniya faollashmaydi — bot ishlaydi-yu, foydasiz bo'ladi.
        raise SystemExit("❌ .env da ADMIN_IDS to'ldirilmagan (platforma admini Telegram ID'si)")
    db_url = os.getenv("DATABASE_URL", "").strip() or f"sqlite+aiosqlite:///{BOT_DIR / 'hr_bot.db'}"
    return Config(
        bot_token=token,
        admin_ids=admin_ids,
        database_url=db_url,
        gemini_api_key=os.getenv("GEMINI_API_KEY", "").strip(),
        gemini_model=os.getenv("GEMINI_MODEL", "").strip() or "gemini-2.5-flash",
        ai_daily_limit=max(0, _int("AI_DAILY_LIMIT", 200)),
        cv_retention_days=max(1, _int("CV_RETENTION_DAYS", 30)),
    )
