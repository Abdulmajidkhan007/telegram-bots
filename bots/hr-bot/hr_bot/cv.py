"""CV (PDF) tekshiruvi va matn ajratish. Telegram'siz test qilinadi."""
import io
import logging

from pypdf import PdfReader
from pypdf.errors import PdfReadError

log = logging.getLogger(__name__)

MAX_BYTES = 10 * 1024 * 1024
MAX_PAGES = 10
MAX_TEXT_CHARS = 30_000  # AI'ga ketadigan matn — xarajat va prompt chegarasi
MIN_TEXT_CHARS = 30  # bundan kami — skanerlangan (rasm) PDF deb hisoblanadi


class CvError(ValueError):
    """Foydalanuvchiga ko'rsatiladigan sabab kaliti (texts.py dagi kalit)."""


def check_document(mime_type: str | None, file_size: int | None, file_name: str | None) -> None:
    """Yuklab olishdan OLDIN — Telegram bergan metadata bo'yicha."""
    nom = (file_name or "").lower()
    if mime_type != "application/pdf" and not nom.endswith(".pdf"):
        raise CvError("cv_not_pdf")
    if file_size is None or file_size <= 0:
        raise CvError("cv_empty")
    if file_size > MAX_BYTES:
        raise CvError("cv_too_big")


def extract_text(data: bytes) -> str:
    """PDF → matn. Matn topilmasa bo'sh qator (AI ball hisoblanmaydi, HR CV'ni baribir ko'radi)."""
    if not data.startswith(b"%PDF"):
        # mime_type mijoz tomonidan beriladi — haqiqiy tarkibni tekshiramiz.
        raise CvError("cv_not_pdf")
    try:
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted:
            raise CvError("cv_encrypted")
        if len(reader.pages) > MAX_PAGES:
            raise CvError("cv_too_many_pages")
        bolaklar = []
        for sahifa in reader.pages:
            bolaklar.append(sahifa.extract_text() or "")
    except PdfReadError as e:
        log.warning("PDF o'qilmadi: %s", e)
        raise CvError("cv_broken") from e
    matn = "\n".join(b.strip() for b in bolaklar if b.strip())
    if len(matn) < MIN_TEXT_CHARS:
        return ""
    return matn[:MAX_TEXT_CHARS]
