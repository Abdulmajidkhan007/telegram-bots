"""Sozlamalar faqat env'dan. Import paytida o'qilmaydi — testlar tokensiz ishlasin."""
import os
import shutil
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
    gemini_api_key: str
    stt_model: str
    stt_fallback: str
    tts_model: str
    default_voice: str
    admin_ids: frozenset[int]
    daily_limit: int
    tts_max_chars: int
    db_path: Path
    ffmpeg: str


def load() -> Config:
    load_dotenv(BOT_DIR / ".env")
    token = os.getenv("BOT_TOKEN", "").strip()
    if not token or token.startswith("BU_YERGA"):
        raise SystemExit("❌ .env da BOT_TOKEN to'ldirilmagan (bots/ovoz-bot/.env)")
    key = os.getenv("GEMINI_API_KEY", "").strip()
    if not key:
        raise SystemExit("❌ .env da GEMINI_API_KEY to'ldirilmagan — bot faqat Gemini bilan ishlaydi")
    ffmpeg = os.getenv("FFMPEG_PATH", "").strip() or shutil.which("ffmpeg") or ""
    if not ffmpeg:
        raise SystemExit("❌ ffmpeg topilmadi (sudo apt install ffmpeg yoki FFMPEG_PATH)")
    data_dir = Path(os.getenv("DATA_DIR", "").strip() or BOT_DIR)
    return Config(
        bot_token=token,
        gemini_api_key=key,
        stt_model=os.getenv("GEMINI_STT_MODEL", "").strip() or "gemini-3.8-flash",
        stt_fallback=os.getenv("GEMINI_STT_MODEL_FALLBACK", "").strip() or "gemini-2.5-flash",
        tts_model=os.getenv("GEMINI_TTS_MODEL", "").strip() or "gemini-3.8-flash-tts",
        default_voice=os.getenv("TTS_DEFAULT_VOICE", "").strip() or "Kore",
        admin_ids=parse_admin_ids(os.getenv("ADMIN_IDS", "")),
        daily_limit=max(0, _int("DAILY_LIMIT", 30)),
        tts_max_chars=max(1, _int("TTS_MAX_CHARS", 1000)),
        db_path=data_dir / "ovoz_bot.db",
        ffmpeg=ffmpeg,
    )
