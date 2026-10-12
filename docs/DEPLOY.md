# Doimiy serverga chiqarish (Railway) — telefondan

> 3 ta ommaviy bot: **kino-bot**, **anonim-bot**, **save-video-downloader-bot**.
> Har biri Railway'da **alohida servis**, lekin bitta loyiha (project) ichida.
> Hamma qadam railway.com saytida, telefon brauzeridan bajariladi.

## Qoidalar (o'qib chiqing)

- **Token faqat Railway → servis → Variables'da.** Repoga, `.env` ga, chatga yozilmaydi.
- **Bitta token — bitta jarayon.** Bot Railway'da ishlasa, uni telefonda/Kali'da
  o'chiring, aks holda `409 Conflict` chiqadi va xabarlar yo'qoladi.
- **Volume majburiy.** Uchala bot ham ma'lumotni JSON faylda saqlaydi. Volume'siz
  har deploy'da foydalanuvchilar va kinolar **o'chadi**.
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

---

## Muammo bo'lsa

| Log'dagi xabar | Sabab | Yechim |
|---|---|---|
| `409 Conflict: terminated by other getUpdates` | Bot boshqa joyda ham ishlayapti | Telefon/Kali'dagi nusxani o'chiring |
| `401 Unauthorized` | Token xato yoki revoke qilingan | BotFather'dan yangisini olib, Variables'ni yangilang |
| `❌ .env da BOT_TOKEN to'ldirilmagan` | Variables kiritilmagan | 5-qadam |
| Deploydan keyin foydalanuvchilar 0 | Volume ulanmagan yoki `DATA_DIR` boshqa | 4-qadam; mount path = `DATA_DIR` |
| `Dockerfile not found` | Root Directory noto'g'ri | `/bots/<bot-id>` ekanini tekshiring |

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
