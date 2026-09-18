"""Toza mantiq: LEAD ajratish, telefon tekshiruvi, uzun xabarni bo'lish.

Bu yerda tashqi xizmat yo'q — shuning uchun hammasi testdan o'tkaziladi.
LLM javobi ustidagi ish aynan shu yerda turadi, chunki model nima
qaytarishini oldindan bilib bo'lmaydi: parsing mo'rt bo'lsa, bot yiqiladi.
"""

import re

# Telegram bitta xabarda 4096 belgidan ko'pini qabul qilmaydi.
# 3900 — HTML teglari yopilmay qolganda qo'shiladigan zaxira bilan.
TELEGRAM_LIMIT = 3900

# Model buyurtmani shu ko'rinishda belgilaydi: [LEAD: Ism | Telefon | Mahsulot]
LEAD_RE = re.compile(r"\[LEAD:\s*([^\]]*)\]", re.IGNORECASE)

# O'zbekiston raqami: +998 90 123 45 67 va uning barcha yozilish shakllari.
PHONE_RE = re.compile(r"^\+?998\d{9}$")


def ajrat_lead(javob):
    """LLM javobidan LEAD blokini ajratib oladi.

    (tozalangan_javob, lead_dict_yoki_None) qaytaradi.

    Oddiy split("]") ishlatilmaydi: model javobida boshqa kvadrat qavs
    uchrasa (masalan havola yoki o'lcham), matnning yarmi qirqilib ketardi.
    """
    mos = LEAD_RE.search(javob)
    if not mos:
        return javob.strip(), None

    bolaklar = [b.strip() for b in mos.group(1).split("|")]
    lead = {
        "ism": bolaklar[0] if len(bolaklar) > 0 else "",
        "telefon": bolaklar[1] if len(bolaklar) > 1 else "",
        "mahsulot": bolaklar[2] if len(bolaklar) > 2 else "",
    }

    # Belgini javobdan butunlay olib tashlaymiz — mijoz uni ko'rmasligi kerak.
    tozalangan = LEAD_RE.sub("", javob).strip()
    return tozalangan, lead


def telefon_tozala(xom):
    """Raqamni normal shaklga keltiradi, noto'g'ri bo'lsa None qaytaradi.

    Tekshiruv shart: LEAD belgisini modelning o'zi yozadi, ya'ni mijoz
    suhbatda "[LEAD: ...]" deb yozib, adminga soxta buyurtma yuborishga
    urinishi mumkin. Formatga tushmagan raqam — lid emas.
    """
    if not xom:
        return None

    raqam = re.sub(r"[^\d+]", "", str(xom))

    if raqam.startswith("+"):
        raqam = "+" + re.sub(r"\D", "", raqam[1:])
    else:
        raqam = re.sub(r"\D", "", raqam)
        # 901234567 -> 998901234567 (operator kodi bilan yozilgan holat)
        if len(raqam) == 9:
            raqam = "998" + raqam

    if not raqam.startswith("+"):
        raqam = "+" + raqam

    return raqam if PHONE_RE.match(raqam) else None


def bolaklarga_bol(matn, limit=TELEGRAM_LIMIT):
    """Uzun javobni Telegram limitiga sig'adigan bo'laklarga ajratadi.

    Avval qator chegarasidan bo'lishga harakat qilamiz — o'rtasidan kesilgan
    HTML tegi butun xabarni yuborilmas qilib qo'yadi.
    """
    if len(matn) <= limit:
        return [matn]

    bolaklar = []
    qoldiq = matn
    while len(qoldiq) > limit:
        kesish = qoldiq.rfind("\n", 0, limit)
        if kesish <= 0:
            kesish = qoldiq.rfind(" ", 0, limit)
        if kesish <= 0:
            kesish = limit
        bolaklar.append(qoldiq[:kesish].strip())
        qoldiq = qoldiq[kesish:].strip()

    if qoldiq:
        bolaklar.append(qoldiq)
    return bolaklar
