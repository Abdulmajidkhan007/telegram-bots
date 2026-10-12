"""Sozlamalar faqat env'dan. Import paytida o'qilmaydi — testlar tokensiz ishlasin."""
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

from . import billing

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
    # To'lov: 0 / bo'sh — o'sha usul o'chiq. Ikkalasi o'chiq bo'lsa — faqat pilot (admin faollashtiradi).
    stars_price: int = 0
    card_price_uzs: int = 0
    card_number: str = ""
    card_holder: str = ""
    expiry_remind_days: int = 3
    business_reply_hours: int = 24

    @property
    def payments_enabled(self) -> bool:
        return self.stars_price > 0 or self.card_price_uzs > 0


def check_payment(stars_price: int, card_price: int, card_number: str) -> None:
    """Yarim sozlangan to'lov — jim ishlamaslik o'rniga ishga tushishda aniq xato."""
    if not 0 <= stars_price <= billing.MAX_STARS:
        # Bot API: obuna narxi 10000 Stars dan oshmasligi kerak.
        raise SystemExit(f"❌ STARS_PRICE 0..{billing.MAX_STARS} bo'lishi kerak, hozir: {stars_price}")
    if card_price < 0:
        raise SystemExit("❌ CARD_PRICE_UZS manfiy bo'lishi mumkin emas")
    if card_price > 0 and not card_number:
        raise SystemExit("❌ CARD_PRICE_UZS berilgan, lekin PAYMENT_CARD_NUMBER bo'sh")
    if card_number and card_price == 0:
        raise SystemExit("❌ PAYMENT_CARD_NUMBER berilgan, lekin CARD_PRICE_UZS bo'sh")


def load() -> Config:
    load_dotenv(BOT_DIR / ".env")
    token = os.getenv("BOT_TOKEN", "").strip()
    if not token or token.startswith("BU_YERGA"):
        raise SystemExit("❌ .env da BOT_TOKEN to'ldirilmagan (bots/hr-bot/.env)")
    admin_ids = parse_admin_ids(os.getenv("ADMIN_IDS", ""))
    if not admin_ids:
        # Adminsiz hech bir kompaniya faollashmaydi — bot ishlaydi-yu, foydasiz bo'ladi.
        raise SystemExit("❌ .env da ADMIN_IDS to'ldirilmagan (platforma admini Telegram ID'si)")
    stars_price = _int("STARS_PRICE", 0)
    card_price = _int("CARD_PRICE_UZS", 0)
    card_number = os.getenv("PAYMENT_CARD_NUMBER", "").strip()
    check_payment(stars_price, card_price, card_number)
    db_url = os.getenv("DATABASE_URL", "").strip() or f"sqlite+aiosqlite:///{BOT_DIR / 'hr_bot.db'}"
    return Config(
        bot_token=token,
        admin_ids=admin_ids,
        database_url=db_url,
        gemini_api_key=os.getenv("GEMINI_API_KEY", "").strip(),
        gemini_model=os.getenv("GEMINI_MODEL", "").strip() or "gemini-2.5-flash",
        ai_daily_limit=max(0, _int("AI_DAILY_LIMIT", 200)),
        cv_retention_days=max(1, _int("CV_RETENTION_DAYS", 30)),
        stars_price=stars_price,
        card_price_uzs=card_price,
        card_number=card_number,
        card_holder=os.getenv("PAYMENT_CARD_HOLDER", "").strip(),
        expiry_remind_days=max(1, _int("EXPIRY_REMIND_DAYS", 3)),
        business_reply_hours=max(1, _int("BUSINESS_REPLY_HOURS", 24)),
    )
