import os
from dotenv import load_dotenv

# .env faylidan ma'lumotlarni o'qish
load_dotenv()

# Telegram API ma'lumotlari (my.telegram.org)
API_ID = os.getenv("API_ID")
# API_ID int bo'lishi kerak. Raqam bo'lmasa bu yerda yiqilmaymiz —
# missing_settings() buni aniq xabar bilan aytadi.
if API_ID and API_ID.strip().isdigit():
    API_ID = int(API_ID)
API_HASH = os.getenv("API_HASH", "")

# Bot Token (@BotFather) - faqat 4-usul uchun
BOT_TOKEN = os.getenv("BOT_TOKEN", "")

# String Session - faqat 3-usul uchun
STRING_SESSION = os.getenv("STRING_SESSION", "")

# Gemini AI API Kaliti (Google AI Studio)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Bot Egasi va Boshqaruv sozlamalari
ADMIN_ID = os.getenv("ADMIN_ID")
if ADMIN_ID:
    ADMIN_ID = int(ADMIN_ID)

REQUIRED_CHANNEL = os.getenv("REQUIRED_CHANNEL", "")  # Majburiy a'zolik kanali (yoki bo'sh qoldiring)
CARD_NUMBER = os.getenv("CARD_NUMBER", "")
SUB_PRICE = os.getenv("SUB_PRICE", "")


def missing_settings(env=None):
    """Ishga tushish uchun yetishmayotgan sozlamalar ro'yxati (bo'sh = hammasi joyida).

    Avval GEMINI_API_KEY bo'sh bo'lsa google-genai ichidan 30 qatorli
    traceback chiqardi ("No API key was provided") — qaysi .env qatorini
    to'ldirish kerakligi ko'rinmasdi. Toza funksiya: env berilsa o'shani tekshiradi.
    """
    env = os.environ if env is None else env
    problems = []
    if not env.get("GEMINI_API_KEY", "").strip():
        problems.append("GEMINI_API_KEY — https://aistudio.google.com/apikey dan oling")
    api_id = env.get("API_ID", "").strip()
    if not api_id:
        problems.append("API_ID — https://my.telegram.org → API development tools")
    elif not api_id.isdigit():
        problems.append(f"API_ID raqam bo'lishi kerak (hozir: {api_id!r})")
    if not env.get("API_HASH", "").strip():
        problems.append("API_HASH — https://my.telegram.org → API development tools")
    return problems
