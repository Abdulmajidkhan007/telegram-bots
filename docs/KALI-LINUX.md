# 13 ta botni Kali Linux'da ishga tushirish

> Noldan: tizimni tayyorlash → klon → kalitlar → bitta bot → hammasi.
> Har qadam tekshiriladigan: buyruq beriladi, natija nima bo'lishi aytiladi.

**Oxirgi yangilanish:** 2026-09-22

---

## 0. Tez xulosa

```bash
# 1. Tizim paketlari
sudo apt update && sudo apt install -y nodejs npm python3 python3-venv python3-pip git ffmpeg

# 2. Klon
git clone https://github.com/Abdulmajidkhan007/telegram-bots.git
cd telegram-bots

# 3. Python muhiti (Kali'da SHART — pastga qarang)
python3 -m venv .venv && source .venv/bin/activate

# 4. Muhitni tekshirish
npm run doctor

# 5. .env fayllarini yaratish va kalitlarni to'ldirish
npm run setup
# ... har bots/<id>/.env ni tahrirlang ...

# 6. Bog'liqliklarni o'rnatish
npm run install:all

# 7. Bitta botni sinash
npm run bot gemini-qa-bot

# 8. Hammasini birdan
npm start          # faqat avtomatik ishga tushadiganlar (7 ta)
npm run start:all  # qo'shimcha xizmat talab qiladiganlar bilan (13 ta)
```

Quyida har qadam batafsil.

---

## 1. Tizimni tayyorlash

### Node.js

Repo **Node 18+** talab qiladi. Kali'dagi versiyani tekshiring:

```bash
node -v
```

`v18` dan past bo'lsa yoki umuman bo'lmasa — NodeSource orqali 20-versiyani qo'ying:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v20.x.x kutiladi
```

### Python

```bash
sudo apt install -y python3 python3-venv python3-pip
python3 --version   # 3.11+ kutiladi
```

### Qo'shimcha vositalar

```bash
# save-video-downloader-bot uchun
sudo apt install -y ffmpeg
sudo apt install -y yt-dlp || pip install yt-dlp

# countlist-ts-node uchun (yarn workspaces)
sudo npm install -g yarn
```

---

## 2. ⚠️ Kali'dagi asosiy tuzoq: `externally-managed-environment`

Kali Debian asosida, Python 3.11+ bilan keladi. Tizim Python'iga
`pip install` qilsangiz shunday xato chiqadi:

```
error: externally-managed-environment
× This environment is externally managed
```

Bu xato emas, **himoya** — tizim paketlarini buzib qo'ymaslik uchun.

**To'g'ri yechim — virtual muhit.** Repo ildizida bitta marta:

```bash
cd telegram-bots
python3 -m venv .venv
source .venv/bin/activate
```

Terminal boshida `(.venv)` paydo bo'ladi. Shundan keyin:

- `pip install` ishlaydi
- `python` buyrug'i mavjud bo'ladi (venv'siz Kali'da faqat `python3` bor,
  ba'zi botlarning start buyrug'i esa `python` deb yozilgan)

> **Har yangi terminalda qayta faollashtiring:** `source .venv/bin/activate`
>
> `--break-system-packages` bayrog'ini **ishlatmang** — u tizim Python'iga
> aralashadi va Kali'ning o'z vositalarini sindirishi mumkin.

`.venv/` papkasi `.gitignore` da — commit qilinmaydi.

---

## 3. Klon va muhit tekshiruvi

```bash
git clone https://github.com/Abdulmajidkhan007/telegram-bots.git
cd telegram-bots
source .venv/bin/activate     # 2-bo'limdagi venv

npm run doctor
```

`doctor` Node, Python va boshqa kerakli vositalar borligini tekshiradi.
Yetishmayotgani bo'lsa — nomini aytadi.

Botlar ro'yxati:

```bash
npm run list
```

`[qo'lda]` belgisi — bu bot avtomatik ishga tushmaydi, chunki qo'shimcha
xizmat (PostgreSQL, Redis, session fayl) kerak.

---

## 4. `.env` fayllarini yaratish

```bash
npm run setup
```

Har `bots/<id>/.env.example` dan `.env` nusxasi olinadi. **Mavjud `.env`
fayllar o'zgartirilmaydi** — xavfsiz, qayta-qayta ishlatish mumkin.

Endi har birini to'ldirish kerak:

```bash
nano bots/gemini-qa-bot/.env
```

### Qaysi botga nima kerak

| Bot | Kerakli kalitlar | Qayerdan olinadi |
|---|---|---|
| **anonim-bot** | `BOT_TOKEN` | [@BotFather](https://t.me/BotFather) |
| **quiz-bot** | `BOT_TOKEN` | @BotFather |
| **idfinder-bot** | `BOT_TOKEN` | @BotFather |
| **arxiv-topadi-bot** | `BOT_TOKEN` | @BotFather |
| **save-video-downloader-bot** | `BOT_TOKEN` | @BotFather |
| **gemini-qa-bot** | `BOT_TOKEN`, `GEMINI_API_KEY` | @BotFather, [AI Studio](https://aistudio.google.com/apikey) |
| **malware-bot** | `BOT_TOKEN`, `VIRUSTOTAL_API_KEY` | @BotFather, [VirusTotal](https://www.virustotal.com/gui/my-apikey) |
| **killspam-bot** | `BOT_TOKEN`, `DATABASE_URL` | @BotFather + PostgreSQL |
| **xulosa-ai-bot** | `API_ID`, `API_HASH`, `BOT_TOKEN` yoki `STRING_SESSION`, `GEMINI_API_KEY` | [my.telegram.org](https://my.telegram.org) + @BotFather + AI Studio |
| **atoyo-ai-bot** | `API_ID`, `API_HASH`, `GEMINI_API_KEY` | my.telegram.org + AI Studio |
| **atoyo-rag-bot** | `TELEGRAM_BOT_TOKEN`, `GEMINI_API_KEY`, `serviceAccountKey.json` | @BotFather, AI Studio, Firebase Console |
| **countlist-ts-node** | `BOT_TOKEN`, PostgreSQL, Redis | @BotFather + baza |
| **countlist-python** | `BOT_TOKEN`, PostgreSQL, Redis, (`OPENAI_API_KEY`) | @BotFather + baza |

**Guruh yoki kanal ID sini bilish kerak bo'lsa:** avval `idfinder-bot` ni
ishga tushiring — u aynan shuning uchun yozilgan.

---

## 5. Bog'liqliklarni o'rnatish

```bash
source .venv/bin/activate     # venv faol ekaniga ishonch hosil qiling
npm run install:all
```

Bu har bot papkasida `npm install` yoki `pip install -r requirements.txt`
bajaradi. Node botlari uchun bir necha daqiqa, Python botlari uchun —
`atoyo-rag-bot` og'ir (sentence-transformers, chromadb ~1 GB).

Faqat bittasini o'rnatish:

```bash
node tools/run.js install gemini-qa-bot
```

---

## 6. Bitta botni ishga tushirish

```bash
npm run bot <bot-id>
```

Masalan:

```bash
npm run bot gemini-qa-bot
```

Loglar to'g'ridan-to'g'ri terminalga chiqadi. To'xtatish — `Ctrl+C`.

### Sinash tartibi (soddadan murakkabga)

Hammasini birdan emas, shu tartibda sinang — birinchisi ishlasa, qolganlari
uchun asos to'g'ri degani:

```bash
npm run bot idfinder-bot      # 1. eng sodda: faqat BOT_TOKEN
npm run bot quiz-bot          # 2. token + fayl o'qish
npm run bot gemini-qa-bot     # 3. token + tashqi API
npm run bot anonim-bot        # 4. token + SQLite
npm run bot malware-bot       # 5. token + VirusTotal
npm run bot save-video-downloader-bot   # 6. yt-dlp + ffmpeg kerak
npm run bot arxiv-topadi-bot  # 7. qo'llanma-bot
```

Har biri ishga tushgandan keyin Telegram'da botga `/start` yozib ko'ring.
**"Ishga tushdi" degan log — bot ishlayapti degani emas.** Haqiqiy tekshiruv —
botga yozib, javob olish.

---

## 7. Qo'shimcha xizmat talab qiladigan 6 ta bot

Bular `npm start` bilan avtomatik ko'tarilmaydi.

### killspam-bot — PostgreSQL kerak

```bash
sudo apt install -y postgresql
sudo systemctl start postgresql
sudo -u postgres psql -c "CREATE USER spamuser WITH PASSWORD 'parol';"
sudo -u postgres psql -c "CREATE DATABASE spamdb OWNER spamuser;"
```

`.env` ga:

```env
DATABASE_URL=postgresql://spamuser:parol@localhost:5432/spamdb
```

Ishga tushirish (start buyrug'i avval `init_db.py` ni bajaradi):

```bash
npm run bot killspam-bot
```

### xulosa-ai-bot — ikki rejim

Bot ishga tushganda ulanish usulini so'raydi:

| Tanlov | Nima bo'ladi |
|---|---|
| **4 (standart)** | BotFather tokeni bilan oddiy bot — eng sodda |
| **1** | QR-kod orqali userbot — Telegram → Settings → Devices → Link Desktop Device |
| **2** | Telefon + SMS orqali userbot |
| **3** | Tayyor `STRING_SESSION` bilan |

`*.session` fayli bot papkasida yaratiladi. **U tokendan ham xavfliroq** —
akkauntga to'liq kirish beradi. `.gitignore` uni bloklaydi, lekin
nusxalab yubormang.

### atoyo-ai-bot — userbot, session kerak

Birinchi ishga tushirishda Telegram telefon raqamingizni va kodni so'raydi.
`API_ID` va `API_HASH` ni [my.telegram.org](https://my.telegram.org) dan oling.

### atoyo-rag-bot — avval katalogni yuklash

```bash
cd bots/atoyo-rag-bot
# serviceAccountKey.json ni shu papkaga qo'ying (Firebase Console →
# Project settings → Service accounts → Generate new private key)
python3 sync_db.py     # Firestore -> ChromaDB, bir necha daqiqa
cd ../..
npm run bot atoyo-rag-bot
```

Yoki Docker bilan (n8n ham birga ko'tariladi):

```bash
cd bots/atoyo-rag-bot
docker compose run --rm bot python sync_db.py
docker compose up -d
```

> Birinchi ishga tushirishda embedding modeli (~100 MB) yuklanadi — internet
> kerak, keyin keshdan o'qiladi.

### countlist-ts-node va countlist-python — PostgreSQL + Redis

Eng oson yo'li Docker:

```bash
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl start docker

cd bots/countlist-python
docker compose up -d        # bot + API + dashboard + PostgreSQL + Redis
```

Qo'lda ko'tarish uchun `bots/countlist-python/SETUP_NO_DOCKER.md` ga qarang.

---

## 8. Hammasini birdan ishga tushirish

### Faqat avtomatik ishga tushadiganlar (7 ta Node boti)

```bash
npm start
```

### Hammasi — 13 ta

```bash
source .venv/bin/activate
npm run start:all
```

CLI har botni alohida jarayonda ishga tushiradi va loglarni **rangli
prefiks** bilan aralashtirib ko'rsatadi, masalan:

```
[gemini-qa-bot]  Bot ishga tushdi
[quiz-bot]       Savollar yuklandi: 120 ta
[anonim-bot]     Baza tayyor
```

Hammasini to'xtatish — `Ctrl+C` (barcha jarayonlar birga yopiladi).

> Bitta bot yiqilsa qolganlari ishlashda davom etadi. Yiqilganini log'dagi
> prefiksdan topasiz.

---

## 9. Fonda uzluksiz ishlatish

Terminal yopilganda botlar ham o'chadi. Uzoq ishlashi uchun:

### tmux (eng sodda)

```bash
sudo apt install -y tmux
tmux new -s botlar

# tmux ichida:
source .venv/bin/activate
npm run start:all

# Ctrl+B keyin D bosib chiqing — botlar ishlashda davom etadi
```

Qaytish:

```bash
tmux attach -t botlar
```

### systemd (serverga o'rnatish uchun)

`/etc/systemd/system/telegram-botlar.service`:

```ini
[Unit]
Description=Telegram botlar monorepo
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=simple
User=kali
WorkingDirectory=/home/kali/telegram-bots
Environment=PATH=/home/kali/telegram-bots/.venv/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=/usr/bin/npm run start:all
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now telegram-botlar
sudo systemctl status telegram-botlar
journalctl -u telegram-botlar -f      # jonli loglar
```

---

## 10. Muammolar va yechimlari

| Alomat | Sabab | Yechim |
|---|---|---|
| `error: externally-managed-environment` | venv faollashmagan | `source .venv/bin/activate` |
| `python: command not found` | venv'siz Kali'da faqat `python3` bor | venv'ni faollashtiring |
| `node: not found` yoki eski versiya | Kali'dagi Node eski | NodeSource orqali Node 20 (1-bo'lim) |
| `401 Unauthorized` Telegram'dan | `BOT_TOKEN` noto'g'ri yoki bekor qilingan | @BotFather → tokenni qayta oling |
| `Conflict: terminated by other getUpdates` | **Bitta token bilan ikki nusxa ishlayapti** | eski jarayonni topib o'ldiring: `pkill -f <bot-nomi>` |
| `ECONNREFUSED 127.0.0.1:5432` | PostgreSQL ishlamayapti | `sudo systemctl start postgresql` |
| `ECONNREFUSED 127.0.0.1:6379` | Redis ishlamayapti | `sudo systemctl start redis` |
| `yt-dlp: not found` | vosita o'rnatilmagan | `pip install yt-dlp` (venv ichida) |
| `429 Too Many Requests` (Gemini) | kalit kvotasi tugagan | kuting yoki yangi kalit |
| `sqlite3.OperationalError: database is locked` | bir baza ikki jarayonda | ikkinchi nusxani to'xtating |
| Bot javob bermaydi, xato ham yo'q | `.env` bo'sh yoki noto'g'ri papkada | `cat bots/<id>/.env` bilan tekshiring |

### Ishlab turgan botlarni ko'rish

```bash
ps aux | grep -E "node|python" | grep -v grep
```

### Hammasini to'xtatish

```bash
pkill -f "tools/run.js"
```

---

## 11. Commit qilishdan oldin

Repo **public**. Har o'zgarishdan keyin:

```bash
npm run check     # testlar + kalit skaneri
```

`✅ ... sir topilmadi` chiqishi shart. `.env` va `*.session` fayllari
`.gitignore` da, lekin skaner baribir tekshiradi — bir marta commit
qilingan kalitni git tarixidan olib tashlash og'riqli.

---

**Muallif:** [@Abdulloh_77700](https://t.me/Abdulloh_77700)
