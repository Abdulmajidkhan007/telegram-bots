"""Foydalanuvchi matnlari (o'zbekcha). Kodda matn yozilmaydi — shu lug'atdan olinadi."""

T = {
    "start": (
        "🎙 <b>Ovoz bot</b>\n\n"
        "• Ovozli xabar, video-xabar yoki audio fayl yuboring — <b>matnini</b> qaytaraman "
        "(o'zbek, rus, ingliz — avtomatik).\n"
        "• Matn yozing — <b>ovozli xabar</b> qilib qaytaraman (≤ {max_chars} belgi).\n"
        "• /voice — ovozni tanlash, /limit — bugungi limit.\n\n"
        "Kuniga {limit} ta so'rov. Audio fayl ≤ 20 MB (Telegram bot cheklovi).\n\n"
        "ℹ️ Audio va matn Google Gemini API'ga yuboriladi. Bepul tarifda Google bu "
        "ma'lumotdan o'z mahsulotlarini yaxshilashda foydalanishi mumkin — maxfiy narsa yubormang."
    ),
    "limit_reached": "⛔️ Bugungi limit tugadi ({limit} ta). Ertaga (Toshkent vaqti 00:00 dan) yana yozing.",
    "limit_info": "Bugun: {used} / {limit}",
    "limit_admin": "Siz adminsiz — limit yo'q.",
    "too_big": "❌ Fayl {mb} MB — Telegram bot faqat 20 MB gacha faylni yuklab oladi. Qisqaroq audio yuboring.",
    "not_audio": "❌ Bu fayl audio/video emas. Ovozli xabar, video-xabar yoki audio fayl yuboring.",
    "no_speech": "🤷 Audioda nutq topilmadi.",
    "busy": "⏳ Gemini hozir band. 1 daqiqadan keyin qayta yuboring — bu so'rov limitdan yechilmadi.",
    "stt_failed": "❌ Matnga aylantirib bo'lmadi: {reason}. Limitdan yechilmadi.",
    "tts_failed": "❌ Ovoz yaratib bo'lmadi: {reason}. Limitdan yechilmadi.",
    "download_failed": "❌ Faylni Telegram'dan yuklab bo'lmadi. Qayta yuboring.",
    "tts_empty": "Ovozga aylantirish uchun matn yozing.",
    "tts_too_long": "❌ Matn {n} belgi — chegara {max_chars}. Qisqartirib yuboring.",
    "voice_choose": "Ovozni tanlang (hozirgi: <b>{voice}</b>):",
    "voice_set": "✅ Ovoz: {voice}",
    "voice_unknown": "Bunday ovoz yo'q.",
    "ai_caption": "🤖 AI ovoz",
}


def t(key: str, **kw) -> str:
    return T[key].format(**kw) if kw else T[key]
