"""Sozlamalar — hammasi .env dan. Kodda birorta kalit yozilmaydi."""

import os
from dotenv import load_dotenv

load_dotenv()


def _majburiy(nom):
    """Bo'lmasa darrov to'xtaymiz: yarim sozlangan bot jimgina noto'g'ri
    ishlagandan ko'ra, ishga tushmagani yaxshi."""
    qiymat = os.getenv(nom, "").strip()
    if not qiymat:
        raise RuntimeError(
            f"{nom} .env da ko'rsatilmagan. Namuna uchun .env.example ga qarang."
        )
    return qiymat


TELEGRAM_BOT_TOKEN = _majburiy("TELEGRAM_BOT_TOKEN")
GEMINI_API_KEY = _majburiy("GEMINI_API_KEY")

# Mahsulot postlari turgan kanal — topilgan post shu yerdan forward qilinadi.
TELEGRAM_CHANNEL_ID = os.getenv("TELEGRAM_CHANNEL_ID", "").strip()

# Buyurtmalar tushadigan admin guruhi (masalan -1001234567890).
ADMIN_GROUP_ID = os.getenv("ADMIN_GROUP_ID", "").strip()

# n8n webhook — o'chiq bo'lsa bot ishlashda davom etadi, faqat ogohlantiradi.
N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL", "").strip()

# Model nomi env dan olinadi: Gemini modellari nomlanishi vaqt o'tib
# o'zgaradi, kodni qayta yozmasdan almashtira olish kerak.
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()

# Ko'p tilli embedding modeli. Standart inglizcha all-MiniLM-L6-v2 o'zbekcha
# so'rovlarni deyarli tushunmaydi — katalog esa o'zbekcha.
EMBEDDING_MODEL = os.getenv(
    "EMBEDDING_MODEL", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
).strip()

CHROMA_DIR = os.getenv("CHROMA_DIR", "./chroma_db").strip()
CHROMA_COLLECTION = os.getenv("CHROMA_COLLECTION", "atoyo_products").strip()

FIREBASE_CREDENTIALS = os.getenv("FIREBASE_CREDENTIALS", "serviceAccountKey.json").strip()

# Qidiruv natijasi shu balldan past bo'lsa — mos emas deb hisoblanadi.
# Bunsiz "salom" deganga ham tasodifiy mahsulot forward qilinardi.
RELEVANCE_THRESHOLD = float(os.getenv("RELEVANCE_THRESHOLD", "0.35"))

# Bitta foydalanuvchi uchun daqiqasiga nechta so'rov.
RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "8"))

HISTORY_DB = os.getenv("HISTORY_DB", "history.db").strip()
