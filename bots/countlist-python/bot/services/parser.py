"""
Natural language expense parser for Uzbek/Russian text.

Supports:
  "500000 so'm telefonga"
  "2 mln remontga"
  "50k ovqat"
  "1.5 million kiyim"
"""
import re
from dataclasses import dataclass
from decimal import Decimal
from typing import Optional


MULTIPLIERS = {
    "mln": 1_000_000,
    "million": 1_000_000,
    "mlrd": 1_000_000_000,
    "ming": 1_000,
    "k": 1_000,
    "kk": 1_000_000,
}

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "Oziq-ovqat": ["ovqat", "non", "go'sht", "sabzavot", "bozor", "supermarket", "do'kon", "mahsulot", "qahva", "choy", "restoran"],
    "Transport": ["taksi", "avtobus", "metro", "benzin", "yoqilg'i", "yo'l", "marshrutka", "uber", "yandex"],
    "Uy-ro'zg'or": ["uy", "kvartira", "remont", "mebel", "jihozlar", "kommunal", "ijara", "elektr"],
    "Sog'liq": ["dori", "dorixona", "shifoxona", "klinika", "shifokor", "kasalxona", "tibbiy"],
    "Ta'lim": ["kurs", "kitob", "o'quv", "ta'lim", "dars", "repetitor", "maktab", "universitet"],
    "Ko'ngilochar": ["kino", "teatr", "konsert", "o'yin", "kafe", "restoran", "sayohat", "dam"],
    "Kiyim-kechak": ["kiyim", "poyabzal", "ko'ylak", "shim", "kurtka", "sumka", "aksessuar"],
    "Kommunal": ["gaz", "suv", "elektr", "internet", "telefon", "kommunal"],
    "Aloqa": ["telefon", "sim", "internet", "paket", "tarif"],
}


@dataclass
class ParsedExpense:
    amount: Decimal
    description: str
    category_hint: Optional[str] = None
    raw_text: str = ""


def _extract_amount(text: str) -> tuple[Optional[Decimal], str]:
    text_lower = text.lower().strip()

    pattern = r"(\d[\d\s,._]*)\s*(mln|million|mlrd|ming|kk|k)?\b"
    match = re.search(pattern, text_lower)
    if not match:
        return None, text

    raw_num = re.sub(r"[\s,_]", "", match.group(1))
    raw_num = raw_num.replace(",", ".")
    try:
        num = Decimal(raw_num)
    except Exception:
        return None, text

    multiplier_str = (match.group(2) or "").lower()
    multiplier = MULTIPLIERS.get(multiplier_str, 1)
    amount = num * multiplier

    remaining = text[:match.start()] + text[match.end():]
    remaining = re.sub(r"\b(so'?m|sum|uzs|usd|\$)\b", "", remaining, flags=re.I)
    remaining = remaining.strip(" -–:")
    return amount, remaining


def _guess_category(description: str) -> Optional[str]:
    desc_lower = description.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in desc_lower for kw in keywords):
            return category
    return None


def parse_expense(text: str) -> Optional[ParsedExpense]:
    cleaned = re.sub(r"\s+", " ", text.strip())
    amount, description = _extract_amount(cleaned)
    if amount is None or amount <= 0:
        return None

    description = description.strip(" -–:,.")
    if not description:
        description = "Xarajat"

    return ParsedExpense(
        amount=amount,
        description=description,
        category_hint=_guess_category(description),
        raw_text=cleaned,
    )
