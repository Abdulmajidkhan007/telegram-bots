"""Atoyo Santexnika — RAG asosidagi AI savdo maslahatchisi boti.

Oqim:  mijoz so'rovi -> ChromaDB semantik qidiruv -> kanal postini forward
       -> Gemini javobi -> buyurtma bo'lsa admin guruh + n8n.

Ishga tushirish:  python3 main.py   (avval: python3 sync_db.py)
"""

import asyncio
import io
import logging
import time
from collections import defaultdict, deque

from aiogram import Bot, Dispatcher, F, types
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import Command, CommandStart
from google import genai
from google.genai import types as genai_types

import config
import crm_tool
import history_store
import rag_service
import text_utils

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s [%(name)s] %(message)s")
log = logging.getLogger("atoyo-rag-bot")

bot = Bot(
    token=config.TELEGRAM_BOT_TOKEN,
    default=DefaultBotProperties(parse_mode=ParseMode.HTML),
)
dp = Dispatcher()

ai = genai.Client(api_key=config.GEMINI_API_KEY)

SYSTEM_PROMPT = """Sen "Atoyo Santexnika" do'konining AI savdo maslahatchisisan.
Do'kon manzili: Qo'qon shahri, Navbahor ko'chasi 45P. Sayt: https://atoyo.uz

QAT'IY QOIDALAR:

1. FORMAT — faqat Telegram HTML teglari:
   qalin <b>matn</b>, havola <a href="https://atoyo.uz">atoyo.uz</a>,
   ro'yxat uchun oddiy • belgisi.
   Markdown (**, ##, []) ISHLATMA.

2. TOVARLARNI ANIQ SANA:
   Mijoz biror toifani so'rasa, [Katalog] dagi tovarlarning NOMI, KODI va
   ANIQ NARXINI birma-bir yoz. "Saytga kiring" deb qutulma.
   Narxni O'ZINGDAN TO'QIMA — faqat [Katalog] dagi raqamni ayt.
   [Katalog] bo'sh bo'lsa, rostini ayt: bu tovar katalogda yo'q.

3. KOD VA HAVOLA:
   Ichki ID larni ko'rsatma. Faqat tovar kodi va https://atoyo.uz.

4. BUYURTMA:
   Mijoz sotib olmoqchi bo'lsa yoki telefon raqamini qoldirsa, javobingning
   ENG BOSHIDA quyidagini yoz:
   [LEAD: Ism | Telefon | Mahsulot]
   keyin xushmuomala tasdiq matnini yoz."""

# Foydalanuvchi -> so'nggi so'rovlar vaqti. Bitta do'kon boti uchun
# xotiradagi cheklovchi yetarli; restartda nolga tushishi muammo emas.
_sorovlar = defaultdict(lambda: deque(maxlen=config.RATE_LIMIT_PER_MINUTE))


def _limitdan_otdi(user_id):
    hozir = time.monotonic()
    tarix = _sorovlar[user_id]
    while tarix and hozir - tarix[0] > 60:
        tarix.popleft()
    if len(tarix) >= config.RATE_LIMIT_PER_MINUTE:
        return True
    tarix.append(hozir)
    return False


async def _gemini(contents):
    """Gemini ga ASYNC murojaat.

    ai.models.generate_content() — sinxron funksiya. Uni async handler
    ichida to'g'ridan-to'g'ri chaqirish butun event loop'ni bloklaydi:
    bitta mijoz javob kutayotganda qolgan hamma mijoz ham kutardi.
    """
    javob = await ai.aio.models.generate_content(
        model=config.GEMINI_MODEL, contents=contents
    )
    return (javob.text or "").strip()


async def _javob_yubor(message, matn):
    """Javobni Telegram limitiga bo'lib yuboradi."""
    for bolak in text_utils.bolaklarga_bol(matn):
        try:
            await message.answer(bolak)
        except Exception as e:
            # Model noto'g'ri HTML qaytargan bo'lishi mumkin — matn
            # yo'qolgandan ko'ra, teglarsiz yuborgan afzal.
            log.warning("HTML bilan yuborilmadi (%s), oddiy matnda qayta urinilmoqda", e)
            await message.answer(bolak, parse_mode=None)


async def sorovni_qayta_ishla(message, sorov):
    user_id = message.from_user.id

    if _limitdan_otdi(user_id):
        await message.answer("Biroz sekinroq, iltimos — bir daqiqadan keyin urinib ko'ring.")
        return

    holat = await message.answer("🔎 Katalogdan qidirilmoqda...")

    try:
        # Chroma va embedding — CPU ishi, alohida oqimda bajariladi.
        kontekst, post_id = await asyncio.to_thread(rag_service.qidir, sorov)

        # Mos post topilgandagina forward qilamiz. Chegarasiz qidiruv
        # "salom" ga ham tasodifiy mahsulot yuborardi.
        if post_id and config.TELEGRAM_CHANNEL_ID:
            try:
                await bot.forward_message(
                    chat_id=message.chat.id,
                    from_chat_id=config.TELEGRAM_CHANNEL_ID,
                    message_id=post_id,
                )
            except Exception as e:
                log.warning("Post forward qilinmadi (id=%s): %s", post_id, e)

        tarix = "\n".join(f"{rol}: {matn}" for rol, matn in history_store.ol(user_id))
        prompt = (
            f"{SYSTEM_PROMPT}\n\n"
            f"[Katalog]:\n{kontekst or 'Mos tovar topilmadi.'}\n\n"
            f"[Suhbat tarixi]:\n{tarix or 'Yangi suhbat.'}\n\n"
            f"[Mijoz so'rovi]: {sorov}"
        )

        javob = await _gemini(prompt)
        javob, lead = text_utils.ajrat_lead(javob)

        if lead:
            telefon = text_utils.telefon_tozala(lead["telefon"])
            if telefon:
                await crm_tool.lid_yarat(
                    lead["ism"] or message.from_user.full_name,
                    telefon,
                    lead["mahsulot"] or sorov,
                )
            else:
                # Mijoz o'zi "[LEAD: ...]" deb yozib, soxta buyurtma
                # yuborishga urinishi mumkin — formatsiz raqam o'tmaydi.
                log.warning("Lid rad etildi, telefon formati noto'g'ri: %r", lead["telefon"])
                javob += "\n\nIltimos, telefon raqamingizni <b>+998 XX XXX XX XX</b> shaklida yozing."

        history_store.qosh(user_id, "Mijoz", sorov)
        history_store.qosh(user_id, "AI", javob)

        await holat.delete()
        await _javob_yubor(message, javob or "Javob tayyorlanmadi, qayta yozing.")

    except Exception as e:
        log.exception("So'rovni qayta ishlashda xato")
        await holat.edit_text(
            "Kechirasiz, javob tayyorlashda uzilish bo'ldi. Bir oz kutib qayta yozing."
        )


@dp.message(CommandStart())
async def start(message: types.Message):
    await message.answer(
        "Assalomu alaykum! Men <b>Atoyo Santexnika</b> do'konining AI maslahatchisiman.\n\n"
        "Menga:\n"
        "• matn yozing,\n"
        "• <b>ovozli xabar</b> yuboring,\n"
        "• yoki qidirayotgan buyumingiz <b>rasmini</b> tashlang.\n\n"
        "Suhbatni tozalash uchun /reset"
    )


@dp.message(Command("reset"))
async def reset(message: types.Message):
    history_store.tozala(message.from_user.id)
    await message.answer("Suhbat tarixi tozalandi.")


@dp.message(F.voice | F.audio)
async def ovoz(message: types.Message):
    holat = await message.answer("🎙 Ovozli xabar tinglanmoqda...")
    try:
        fayl = message.voice or message.audio
        bufer = io.BytesIO()
        await bot.download(fayl, destination=bufer)

        sorov = await _gemini([
            "Bu xaridorning audio so'rovi. Faqat toza qidiruv iborasini yoz, "
            "hech qanday ortiqcha gap qo'shma:",
            genai_types.Part.from_bytes(data=bufer.getvalue(), mime_type="audio/ogg"),
        ])

        await holat.delete()
        await message.answer(f"🗣 <i>Siz so'radingiz:</i> «{sorov}»")
        await sorovni_qayta_ishla(message, sorov)
    except Exception:
        log.exception("Ovozni o'girishda xato")
        await holat.edit_text("Ovozni tushunib bo'lmadi. Iltimos, yozma yuboring.")


@dp.message(F.photo)
async def rasm(message: types.Message):
    holat = await message.answer("🔍 Rasm tahlil qilinmoqda...")
    try:
        bufer = io.BytesIO()
        await bot.download(message.photo[-1], destination=bufer)

        izoh = f" Mijoz izohi: {message.caption}" if message.caption else ""
        sorov = await _gemini([
            "Rasmdagi santexnika buyumini aniqla va qidirish uchun FAQAT "
            "2-4 ta so'zdan iborat tovar nomini yoz." + izoh,
            genai_types.Part.from_bytes(data=bufer.getvalue(), mime_type="image/jpeg"),
        ])

        await holat.delete()
        await message.answer(f"📷 <i>Aniqlangan tovar:</i> <b>{sorov}</b>")
        await sorovni_qayta_ishla(message, sorov)
    except Exception:
        log.exception("Rasmni tahlil qilishda xato")
        await holat.edit_text("Rasmni tahlil qilib bo'lmadi. Nomini yozib yuboring.")


@dp.message(F.text)
async def matn(message: types.Message):
    await sorovni_qayta_ishla(message, message.text)


async def _modelni_tekshir():
    """Model nomi haqiqatan mavjudmi — startda tekshiramiz.

    Aks holda noto'g'ri nom har so'rovda 404 berib, bot "ishlayotgandek"
    turaveradi. Xato birinchi mijozda emas, startda ko'rinishi kerak.
    """
    nomlar = await asyncio.to_thread(lambda: [m.name for m in ai.models.list()])
    if not any(config.GEMINI_MODEL in n for n in nomlar):
        raise RuntimeError(
            f"GEMINI_MODEL='{config.GEMINI_MODEL}' mavjud emas.\n"
            f"Mavjud modellar: {', '.join(sorted(nomlar)[:15])}"
        )
    log.info("Model tasdiqlandi: %s", config.GEMINI_MODEL)


async def main():
    history_store.init()
    await _modelni_tekshir()
    log.info("Atoyo RAG boti ishga tushdi.")
    try:
        await dp.start_polling(bot)
    finally:
        await crm_tool.yop()
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
