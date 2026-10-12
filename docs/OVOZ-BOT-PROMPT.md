# ovoz-bot — telegram-bots sessiyasi uchun topshiriq

> Bu faylni o'qigan sessiya avval faqat o'qiydi va qisqa javob beradi
> (tushunganini + 3 tagacha savol). Kod **"telegram-bots/ovoz-bot ni boshla"**
> deyilgandan keyin yoziladi.

## Maqsad

Gemini API kaliti bilan ishlaydigan Telegram bot:
1. **Ovoz → matn (STT):** ovozli xabar, video-xabar yoki audio fayl yuborilsa —
   matnini qaytaradi (o'zbekcha, ruscha, inglizcha — avtomatik).
2. **Matn → ovoz (TTS):** matn yuborilsa — ovozli xabar (voice) qaytaradi.
3. **Keyin (2-faza): `/myvoice`** — foydalanuvchi o'z ovozini yozadi, bot shu
   ovozda gapiradi.

Sabab: Gemini ilovasining bepul tarifi ovozli xabarlarni yomon tushunyapti;
API orqali model va promptni o'zimiz boshqaramiz.

## Faktlar (tekshirib keyin yozing — taxmin qilmang)

- STT: Gemini audio tushunadi. Repoda tayyor namuna bor:
  `bots/xulosa-ai-bot/main.py` → `transcribe_media_with_ai` — shu yondashuvni
  ko'chirib, moslab yozing (boshqa bot papkasidan import QILINMAYDI).
- TTS: `gemini-3.8-flash-tts` (130 til, ro'yxatda **Northern Uzbek** bor) va
  `gemini-3.8-flash-lite-tts` (101 til — o'zbek bormi, hujjatdan tekshiring).
  Model nomi `.env` da (`GEMINI_TTS_MODEL`), ishga tushganda tekshiriladi.
- TTS javobi — xom PCM audio. Telegram voice uchun **OGG/Opus** kerak:
  `ffmpeg` bilan aylantiring (`execFile`/`subprocess` ro'yxat bilan, shell emas).
- Ovoz klonlash: 3.8 modelida 30 soniyalik namuna + **yozib olingan rozilik
  iborasi** bilan ishlashi aytiladi (uchinchi tomon manbalari). Rasmiy hujjatdan
  va bepul tarifda mavjudligini tekshirmasdan 2-fazani boshlamang.
- Bepul tarif: limitlar AI Studio loyihasida ko'rinadi; bepul tarifda Google
  ma'lumotdan o'z mahsulotini yaxshilashda foydalanishi mumkin — `/start`
  matnida foydalanuvchiga qisqa aytilsin.

## 1-faza (MVP)

- `bots/ovoz-bot/` — Python, aiogram 3 (`>=3.15,<4`), `google-genai` (async:
  `client.aio...`), `ffmpeg`.
- Ovoz/video-xabar/audio → matn. Uzun audio (Telegram bot API 20 MB gacha
  yuklaydi) — chegarani aniq ayting.
- Matn → ovoz: bitta standart ovoz; `/voice` bilan bir nechta tayyor ovozdan
  tanlash (Gemini prebuilt voices). Matn uzunligi chegarasi (masalan 1000 belgi).
- Har foydalanuvchiga kunlik limit (masalan 30 ta), admin limitsiz
  (`ADMIN_IDS`). Limit SQLite'da.
- Gemini 503/429 bo'lsa — qayta urinish (exponential backoff) va zaxira model
  (`GEMINI_STT_MODEL_FALLBACK`); foydalanuvchiga "hozir band, 1 daqiqadan keyin"
  deyiladi, jim qolmaydi.
- `bots.json` yozuvi, `README.md` (muallif `@Abdulloh_77700`), `LICENSE`,
  `.env.example`, `docs/KALI-LINUX.md` jadvaliga qator.
- Testlar: matn bo'laklash, limit hisobi, PCM→OGG buyrug'i yasalishi, xato
  yo'llari (Gemini va Telegram mock).

## 2-faza: `/myvoice` (faqat 1-faza ishlagach va API tasdiqlangach)

Bu imkoniyat firibgarlik uchun xavfli (birovning ovozida "pul o'tkaz" degan
xabar). Shuning uchun qat'iy qoidalar:
- Namuna **faqat shu chatda jonli yozilgan voice** bo'lishi kerak — forward
  qilingan yoki fayl sifatida yuborilgan audio qabul qilinmaydi.
- Namunadan oldin foydalanuvchi bot ko'rsatgan **rozilik iborasini o'z ovozida
  o'qiydi** (masalan: "Bu mening ovozim, uni shu botda ishlatishga roziman").
- Klonlangan ovoz faqat **o'sha foydalanuvchiga** ishlaydi, boshqaga berilmaydi.
- `/deletevoice` — namuna va saqlangan ovoz butunlay o'chiriladi.
- Yaratilgan har audio caption'ida "🤖 AI ovoz" belgisi.
- Kunlik limit qattiqroq.

## Qoidalar

Repo `CLAUDE.md` amal qiladi (testlar, `npm run scan`, `except: pass` yo'q,
kalit faqat `.env`). Repo cheklovi (2026-12-11 gacha yangi loyiha yo'q) —
egasi bu botni istisno qilgan bo'lsa, `docs/REJA.md` ga yozib qo'ying.
