"""Deep link: yaratish va tekshirish. Toza mantiq — Telegram'siz test qilinadi.

Telegram cheklovi: start parametri ≤ 64 belgi, faqat A-Z a-z 0-9 _ -.
Parametr foydalanuvchi qo'lida (havolani o'zgartirib yuborishi mumkin) —
shuning uchun har kirishda shu regex bilan tekshiriladi.
"""
import re
import secrets

START_PARAM_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
SLUG_RE = re.compile(r"^[a-z0-9_-]{1,62}$")  # "v_" + slug ≤ 64
TOKEN_RE = re.compile(r"^[A-Za-z0-9_-]{16,59}$")  # "join_" + token ≤ 64

_KIRILL = {
    "а": "a", "б": "b", "в": "v", "г": "g", "ғ": "g", "д": "d", "е": "e", "ё": "yo",
    "ж": "j", "з": "z", "и": "i", "й": "y", "к": "k", "қ": "q", "л": "l", "м": "m",
    "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ў": "o",
    "ф": "f", "х": "x", "ҳ": "h", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sh",
    "ъ": "", "ы": "i", "ь": "", "э": "e", "ю": "yu", "я": "ya",
}


def parse_start(param: str | None) -> tuple[str, str] | None:
    """`/start` parametri → ("vacancy", slug) | ("join", token) | None.

    None — oddiy /start yoki buzilgan/soxta parametr (ikkalasida ham
    foydalanuvchi oddiy yo'riqnomani ko'radi).
    """
    if not param or not START_PARAM_RE.match(param):
        return None
    if param.startswith("v_"):
        slug = param[2:]
        return ("vacancy", slug) if SLUG_RE.match(slug) else None
    if param.startswith("join_"):
        token = param[5:]
        return ("join", token) if TOKEN_RE.match(token) else None
    return None


def slugify(matn: str, max_len: int = 24) -> str:
    """Kompaniya/vakansiya nomidan lotin slug: "Turkish Baby" → "turkishbaby"."""
    natija = []
    for harf in matn.lower():
        if harf in _KIRILL:
            natija.append(_KIRILL[harf])
        elif "a" <= harf <= "z" or "0" <= harf <= "9":
            natija.append(harf)
        # o'zbek lotinidagi o' / g' apostroflari va bo'shliqlar tashlanadi
    return "".join(natija)[:max_len]


def vacancy_slug(company: str, vacancy: str, mavjudlar: set[str]) -> str:
    """`turkishbaby_ai` ko'rinishida; band bo'lsa `_2`, `_3`, ... qo'shiladi."""
    asos = "_".join(q for q in (slugify(company, 24), slugify(vacancy, 20)) if q) or "vakansiya"
    if asos not in mavjudlar:
        return asos
    n = 2
    while f"{asos}_{n}" in mavjudlar:
        n += 1
    return f"{asos}_{n}"


def new_token() -> str:
    # token_urlsafe faqat A-Z a-z 0-9 _ - beradi — Telegram cheklovi bilan mos.
    return secrets.token_urlsafe(18)  # 24 belgi


def vacancy_link(bot_username: str, slug: str) -> str:
    return f"https://t.me/{bot_username}?start=v_{slug}"


def join_link(bot_username: str, token: str) -> str:
    return f"https://t.me/{bot_username}?start=join_{token}"
