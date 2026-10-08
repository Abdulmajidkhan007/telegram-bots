# ============================================================
#  CONFIG.PY — Bot sozlamalari (.env dan)
# ============================================================
# Token avval shu faylga to'g'ridan-to'g'ri yozilgan edi. Repo ochiq —
# endi hamma narsa faqat .env orqali keladi.

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


def _majburiy(nom: str) -> str:
    qiymat = os.getenv(nom, "").strip().strip('"').strip("'")
    if not qiymat or qiymat.startswith("BU_YERGA"):
        raise SystemExit(f"❌ .env da {nom} to'ldirilmagan (bots/kino-bot/.env)")
    return qiymat


BOT_TOKEN: str = _majburiy("BOT_TOKEN")

# Bosh admin: uni bot ichidan o'chirib bo'lmaydi va /backup, /restore faqat unga.
try:
    SUPER_ADMIN_ID: int = int(_majburiy("SUPER_ADMIN_ID"))
except ValueError:
    raise SystemExit("❌ SUPER_ADMIN_ID faqat raqam bo'lsin (Telegram ID, @userinfobot dan)")

# Railway'da konteyner fayllari har deploy'da o'chadi — baza Volume'da turishi
# kerak (DATA_DIR=/data). Lokal'da standart: bot papkasining o'zi.
DATA_DIR = Path(os.getenv("DATA_DIR", "").strip() or BASE_DIR)
DB_FILE: Path = DATA_DIR / "database.json"

# Kinoni forward/saqlash/skrinshotdan himoyalash. Standart: yoqilgan.
PROTECT_CONTENT: bool = os.getenv("PROTECT_CONTENT", "true").strip().lower() not in ("0", "false", "no", "yoq", "yo'q")
