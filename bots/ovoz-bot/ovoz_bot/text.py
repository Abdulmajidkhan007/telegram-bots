"""Matn bo'laklash (Telegram xabari ≤ 4096 belgi) va TTS kirishini tekshirish."""
TG_LIMIT = 4096


def split_text(matn: str, limit: int = 4000) -> list[str]:
    """Uzun transkripsiyani xabarlarga bo'ladi: avval paragraf, keyin gap, keyin
    bo'shliq bo'yicha — so'z o'rtasidan faqat boshqa iloj bo'lmasa kesiladi."""
    matn = matn.strip()
    if not matn:
        return []
    bolaklar = []
    while len(matn) > limit:
        oyna = matn[:limit]
        kesim = -1
        for ajratgich in ("\n\n", "\n", ". ", "! ", "? ", " "):
            i = oyna.rfind(ajratgich)
            if i > limit // 3:  # juda kichik bo'lak qolmasin
                kesim = i + len(ajratgich)
                break
        if kesim == -1:
            kesim = limit
        bolaklar.append(matn[:kesim].strip())
        matn = matn[kesim:].strip()
    if matn:
        bolaklar.append(matn)
    return bolaklar


def check_tts_text(matn: str | None, max_chars: int) -> str | None:
    """None — mos; aks holda texts.py kaliti (sabab)."""
    if not matn or not matn.strip():
        return "tts_empty"
    if len(matn) > max_chars:
        return "tts_too_long"
    return None
