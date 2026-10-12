# Doimiy serverga chiqarish (Railway) — telefondan

> 5 ta bot: **kino-bot**, **anonim-bot**, **save-video-downloader-bot**, **hr-bot**, **ovoz-bot**.
> Har biri Railway'da **alohida servis**, lekin bitta loyiha (project) ichida.
> Hamma qadam railway.com saytida, telefon brauzeridan bajariladi.

## Qoidalar (o'qib chiqing)

- **Token faqat Railway → servis → Variables'da.** Repoga, `.env` ga, chatga yozilmaydi.
- **Bitta token — bitta jarayon.** Bot Railway'da ishlasa, uni telefonda/Kali'da
  o'chiring, aks holda `409 Conflict` chiqadi va xabarlar yo'qoladi.
- **Volume majburiy.** Hamma bot ma'lumotni faylda saqlaydi (JSON yoki SQLite). Volume'siz
  har deploy'da foydalanuvchilar, kinolar, kompaniyalar va arizalar **o'chadi**.
- Har bot papkasida tayyor: `Dockerfile`, `.dockerignore` (`.env` obrazga tushmaydi),
  `railway.toml` (Dockerfile builder, `restartPolicy = ALWAYS`, 1 nusxa).

## Narx haqida (tekshiring)

Railway bepul emas: sinov krediti tugagach oylik tarif kerak bo'ladi. Uchta
polling bot kam resurs yeydi, lekin video-bot (ffmpeg) ko'proq CPU/trafik
oladi. Joriy narxni railway.com/pricing dan ko'ring — bu yerda narx yozilmaydi,
chunki o'zgarib turadi.

---

## Umumiy qadamlar (har bot uchun bir xil)

1. railway.com → **Login with GitHub**.
2. **New Project → Deploy from GitHub repo → `telegram-bots`**.
   (Ikkinchi va uchinchi bot uchun: shu loyiha ichida **+ Create → GitHub Repo**.)
3. Servisni bosing → **Settings**:
   - **Source → Root Directory:** `/bots/<bot-id>`
   - **Config-as-code → Railway Config File:** `/bots/<bot-id>/railway.toml`
     (to'liq yo'l — Railway bu faylni Root Directory'ga nisbatan qidirmaydi)
   - **Networking:** domen **kerak emas** (botlar polling rejimida, port ochmaydi).
4. **Volume:** servis ustida uzoq bosing (yoki **+ Create → Volume**) →
   servisni tanlang → **Mount path: `/data`**.
5. **Variables** → pastdagi jadvaldagi qiymatlarni kiriting (**Raw Editor** qulay).
6. **Deploy** → **Deployments → View logs**. Kutilgan qator jadvalda.
7. Telegram'da botga `/start` yozing.

Kod `main` ga push qilinganda faqat **o'sha bot papkasi o'zgargan bo'lsa** qayta
deploy bo'ladi (`watchPatterns`).

---

## 1. kino-bot

| Variable | Qiymat | Majburiy |
|---|---|---|
| `BOT_TOKEN` | @BotFather'dan **yangi** token | ✅ |
| `SUPER_ADMIN_ID` | sizning Telegram ID (@userinfobot) | ✅ |
| `DATA_DIR` | `/data` | ✅ (Dockerfile'da standart, baribir yozing) |
| `PROTECT_CONTENT` | `true` | — |
| `MOVIES_PER_HOUR` | `20` | — |

- Root Directory: `/bots/kino-bot`, Config: `/bots/kino-bot/railway.toml`
- Volume: `/data`
- Log'da kutiladi: `Baza: /data/database.json — N kino, M foydalanuvchi`
- **Eski bazani ko'chirish:** botga bosh admin sifatida `/restore` yozing va
  `database.json` ni yuboring. Keyin `/backup` bilan nusxa olib turing.

## 2. anonim-bot

| Variable | Qiymat | Majburiy |
|---|---|---|
| `BOT_TOKEN` | @BotFather'dan | ✅ |
| `ADMIN_ID` | sizning Telegram ID | ✅ |
| `DATA_DIR` | `/data` | ✅ |
| `RATE_PER_MIN` / `RATE_PER_HOUR` | `5` / `30` | — |
| `REQUIRED_CHANNELS` | `@kanal1,@kanal2` | — |

- Root Directory: `/bots/anonim-bot`, Config: `/bots/anonim-bot/railway.toml`
- Volume: `/data`
- Log'da kutiladi: `✅ @bot_username ishga tushdi (DATA_DIR=/data)`

## 3. save-video-downloader-bot

| Variable | Qiymat | Majburiy |
|---|---|---|
| `BOT_TOKEN` | @BotFather'dan | ✅ |
| `ADMIN_IDS` | `123456789` (vergul bilan bir nechta) | ✅ |
| `DATA_DIR` | `/data` | ✅ |
| `YTDLP_COOKIES_B64` | cookies.txt base64 (bot README'siga qarang) | YouTube uchun tavsiya |
| `YTDLP_PROXY` | `http://user:pass@host:port` | YouTube bloklasa |
| `ACR_HOST` / `ACR_ACCESS_KEY` / `ACR_ACCESS_SECRET` | ACRCloud | — |

- Root Directory: `/bots/save-video-downloader-bot`,
  Config: `/bots/save-video-downloader-bot/railway.toml`
- Volume: `/data` (yuklab olinayotgan videolar Volume'ga emas, `/tmp/downloads` ga)
- Build'da `ffmpeg` apt'dan, `yt-dlp` + `gallery-dl` eng yangi relizdan yuklanadi.
- Log'da kutiladi: `[data] DATA_DIR: /data` va `yt-dlp --version` qatori.
- BotFather: **/setprivacy → Disable** (guruhdagi havolalarni ko'rishi uchun).
- ⚠️ **Ma'lum cheklov:** YouTube Railway (datacenter) IP'larini tez-tez bloklaydi.
  Instagram/TikTok ishlaydi, YouTube uchun cookies yoki proxy kerak bo'lishi mumkin.

## 4. hr-bot

| Variable | Qiymat | Majburiy |
|---|---|---|
| `BOT_TOKEN` | @BotFather'dan (`@hr_ai_007_bot`) | ✅ |
| `ADMIN_IDS` | platforma adminlari ID (vergul bilan) | ✅ |
| `DATA_DIR` | `/data` | ✅ (SQLite `hr_bot.db` shu yerda) |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | AI Studio / `gemini-2.5-flash` | — (bo'lmasa AI ball «hisoblanmadi») |
| `AI_DAILY_LIMIT` / `CV_RETENTION_DAYS` | `200` / `30` | — |
| `STARS_PRICE` | 30 kunlik obuna, Stars (1..10000) | — (bo'sh — Stars o'chiq) |
| `CARD_PRICE_UZS` + `PAYMENT_CARD_NUMBER` (+ `PAYMENT_CARD_HOLDER`) | narx so'mda, karta raqami | — (ikkalasi birga) |
| `EXPIRY_REMIND_DAYS` / `BUSINESS_REPLY_HOURS` | `3` / `24` | — |

- Root Directory: `/bots/hr-bot`, Config: `/bots/hr-bot/railway.toml`
- Volume: `/data` — **ichida nomzodlar CV matni** (shaxsiy ma'lumot), Volume'ni boshqa servis bilan bo'lishmang.
- Log'da kutiladi: `@hr_ai_007_bot ishga tushdi; adminlar: N ta` (AI yoqilgan bo'lsa oldin `AI: <model>, kunlik limit N`).
- Narx yoki karta raqami noto'g'ri bo'lsa bot **ishga tushmaydi** va sababini yozadi
  (masalan `❌ STARS_PRICE 0..10000 bo'lishi kerak`).
- **BotFather sozlamalari:**
  - Stars to'lovi uchun to'lov provayderi ulanmaydi (Bot API: Stars uchun `provider_token` bo'sh).
  - Telegram Business: **Bot Settings → Business Mode → Turn on**. Keyin HR (Premium)
    Settings → Telegram Business → Chatbots → `@hr_ai_007_bot` (javob berish huquqi bilan).
- Hozircha `PostgreSQL` shart emas: SQLite + Volume yetadi. O'tish — `DATABASE_URL=postgresql+asyncpg://…`
  (`asyncpg` ni `requirements.txt` ga qo'shish kerak bo'ladi).

## 5. ovoz-bot

| Variable | Qiymat | Majburiy |
|---|---|---|
| `BOT_TOKEN` | @BotFather'dan | ✅ |
| `GEMINI_API_KEY` | [AI Studio](https://aistudio.google.com/apikey) | ✅ |
| `DATA_DIR` | `/data` | ✅ (kunlik limit bazasi) |
| `ADMIN_IDS` | limitsiz foydalanuvchilar | — |
| `DAILY_LIMIT` / `TTS_MAX_CHARS` | `30` / `1000` | — |
| `GEMINI_STT_MODEL` / `GEMINI_STT_MODEL_FALLBACK` / `GEMINI_TTS_MODEL` | bot README'siga qarang | — |

- Root Directory: `/bots/ovoz-bot`, Config: `/bots/ovoz-bot/railway.toml`
- Volume: `/data`
- Build'da `ffmpeg` apt'dan o'rnatiladi (`FFMPEG_PATH` kerak emas).
- Ishga tushganda token, kalit, ffmpeg va **uchala model** tekshiriladi — xato bo'lsa
  aniq sabab bilan to'xtaydi (Deploy logs'da ko'rinadi).

---

## Muammo bo'lsa

| Log'dagi xabar | Sabab | Yechim |
|---|---|---|
| `409 Conflict: terminated by other getUpdates` | Bot boshqa joyda ham ishlayapti | Telefon/Kali'dagi nusxani o'chiring |
| `401 Unauthorized` | Token xato yoki revoke qilingan | BotFather'dan yangisini olib, Variables'ni yangilang |
| `❌ .env da BOT_TOKEN to'ldirilmagan` | Variables kiritilmagan | 5-qadam |
| Deploydan keyin foydalanuvchilar 0 | Volume ulanmagan yoki `DATA_DIR` boshqa | 4-qadam; mount path = `DATA_DIR` |
| `Dockerfile not found` | Root Directory noto'g'ri | `/bots/<bot-id>` ekanini tekshiring |
| hr-bot: to'lov tugmasi yo'q | `STARS_PRICE` va `CARD_PRICE_UZS` bo'sh | Variables'ni to'ldiring (yoki pilot rejimida qoldiring) |
| hr-bot: Business'da bot javob bermaydi | Business Mode o'chiq / javob huquqi yo'q / ochiq vakansiya yo'q | BotFather → Business Mode; HR'ga bot yuborgan ogohlantirishni o'qing |

## Allaqachon Railway'da ishlayotgan servis bo'lsa

Eski servislarda Volume `/app/data` ga ulangan bo'lishi mumkin. Unda hech narsani
ko'chirmang: Variables'da `DATA_DIR=/app/data` qoldiring — Variables Dockerfile'dagi
standart qiymatdan ustun turadi. Muhimi: **mount path = `DATA_DIR`**.

## VPS varianti (Railway o'rniga)

Har bot papkasidagi `Dockerfile` istalgan Docker xostida ishlaydi:

```bash
cd bots/kino-bot
docker build -t kino-bot .
docker run -d --restart=always --name kino-bot \
  --env-file .env -v kino-data:/data kino-bot
```

`.env` faqat serverda turadi (`chmod 600 .env`), repoga tushmaydi.
