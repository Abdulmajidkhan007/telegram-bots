# 🎙 Ovoz Bot

Gemini API bilan ishlaydigan Telegram bot:

1. **Ovoz → matn:** ovozli xabar, video-xabar, audio yoki video fayl yuborilsa —
   matnini qaytaradi (o'zbek, rus, ingliz — avtomatik; o'zbekcha lotin yozuvida).
2. **Matn → ovoz:** matn yuborilsa — ovozli xabar (OGG/Opus voice) qaytaradi,
   caption'da «🤖 AI ovoz» belgisi bilan.

**Muallif:** [@Abdulloh_77700](https://t.me/Abdulloh_77700) · Litsenziya: MIT ·
Holat: **1-faza (MVP)**. 2-faza (`/myvoice`, ovoz klonlash) boshlanmagan —
[`docs/OVOZ-BOT-PROMPT.md`](../../docs/OVOZ-BOT-PROMPT.md).

## Imkoniyatlar va chegaralar

| | |
|---|---|
| Audio hajmi | ≤ **20 MB** — rasmiy Bot API `getFile`: «bots can download files of up to 20MB in size». 14 MB dan kattasi Gemini Files API orqali yuboriladi |
| Uzun transkripsiya | 4000 belgidan bo'linadi (paragraf → gap → bo'shliq) |
| Matn → ovoz | ≤ `TTS_MAX_CHARS` (standart 1000) belgi |
| Ovozlar | `/voice`: Kore, Puck, Charon, Aoede, Fenrir, Enceladus |
| Limit | kuniga `DAILY_LIMIT` (standart 30) so'rov, Toshkent vaqti bilan yangilanadi; `ADMIN_IDS` — limitsiz. SQLite'da |
| Gemini band (429/5xx) | 3 urinish, exponential backoff; STT zaxira modelga o'tadi; baribir band bo'lsa — «hozir band, 1 daqiqadan keyin», limit qaytariladi |

`/start` matnida foydalanuvchiga aytiladi: audio Google Gemini API'ga ketadi va
bepul tarifda Google undan o'z mahsulotlarini yaxshilashda foydalanishi mumkin.

## Tekshirilgan faktlar (2026-10-11)

`ai.google.dev` bu muhitdan ochilmadi. Manba — Google'ning rasmiy
[gemini cookbook](https://github.com/google-gemini/cookbook) reposi
(`quickstarts/Get_started_TTS.ipynb`, `Get_Started_Voices.ipynb`) va
`google-genai` 2.29 SDK kodi:

- TTS modellari: `gemini-3.8-flash-tts` va `gemini-3.8-flash-lite-tts`.
- Chaqiruv: `client.interactions.create(model, input, response_format={"type": "audio"},
  generation_config={"speech_config": [{"voice": "Kore"}]})` → `output_audio.data` (base64).
- Format: «unary … returns complete AUDIO_WAV … (24kHz, mono, 16-bit PCM)», stream — xom PCM.
  Bot ikkalasini ham ffmpeg bilan OGG/Opus'ga aylantiradi.
- 30 ta tayyor ovoz bor; nomi aniq yozilgani 6 ta — botda faqat shular.
- Ovoz klonlash (Voice Replication) **mavjud**: qisqa namuna + shu odamning o'z ovozida
  rozilik iborasi: «I am the owner of this voice and I consent to Google using this voice
  to create a synthetic voice model.»

**Tekshirib bo'lmadi** (rasmiy hujjat sahifasi ochilmadi — taxmin qilinmadi):
- TTS tillar ro'yxati, jumladan **o'zbek tili** borligi (ikkala model uchun).
- Klonlash **bepul tarifda** mavjudmi; bepul tarif limitlari.
- STT standart modeli `gemini-3.8-flash` — cookbook'da «standard Gemini reasoning model»
  sifatida tilga olingan; bot ishga tushganda `models.get` bilan baribir tekshiradi.

## O'rnatish

```bash
sudo apt install -y ffmpeg          # Termux: pkg install ffmpeg
cd bots/ovoz-bot
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                 # BOT_TOKEN, GEMINI_API_KEY, ADMIN_IDS
python -m ovoz_bot.main
```

Ishga tushganda tekshiriladi: token, kalit, ffmpeg, standart ovoz nomi va
**uchala model** (`models.get`). Xato bo'lsa — aniq sabab bilan to'xtaydi.

| O'zgaruvchi | Standart | |
|---|---|---|
| `BOT_TOKEN` | — | majburiy |
| `GEMINI_API_KEY` | — | majburiy |
| `GEMINI_STT_MODEL` / `GEMINI_STT_MODEL_FALLBACK` | `gemini-3.8-flash` / `gemini-2.5-flash` | |
| `GEMINI_TTS_MODEL` | `gemini-3.8-flash-tts` | yoki `gemini-3.8-flash-lite-tts` |
| `TTS_DEFAULT_VOICE` | `Kore` | |
| `ADMIN_IDS` | bo'sh | limitsiz foydalanuvchilar |
| `DAILY_LIMIT` / `TTS_MAX_CHARS` | 30 / 1000 | |
| `DATA_DIR` | bot papkasi | Railway: `/data` (Volume) |
| `FFMPEG_PATH` | PATH'dan | |

## Testlar

```bash
pip install pytest && python -m pytest -q
```

Internetga chiqmaydi. Bo'laklash, limit (Toshkent kuni, refund), ffmpeg buyrug'i va
**haqiqiy** PCM/WAV → OGG/Opus aylantirish, Gemini retry/zaxira/Files API (mock),
haqiqiy Dispatcher + soxta Telegram sessiyasi bilan handler'lar.
