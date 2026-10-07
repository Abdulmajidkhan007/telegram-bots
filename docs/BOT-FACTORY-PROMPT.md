# bot-factory — bot konstruktor platformasi uchun topshiriq

> Bu faylni o'qigan sessiya: **hozir hech narsa yozmaydi va o'zgartirmaydi.**
> Faqat o'qiydi, tushunadi va tayyor turadi. Ish faqat egasi aniq shunday
> yozganda boshlanadi:
>
> **`bot-factory ni boshla`**
>
> Navbat: bu loyiha **hr-bot MVP'dan keyin** boshlanadi (hr-bot keyinchalik
> shu platformaning premium shabloniga aylanadi).

---

## 0. Hozir nima qilasiz (tayyorgarlik fazasi)

1. O'qing: telegram-bots reposidagi `CLAUDE.md`, `docs/REJA.md`, `bots.json`,
   shablon bo'ladigan botlar: `bots/anonim-bot/`, `bots/killspam-bot/`,
   `bots/quiz-bot/`, `bots/idfinder-bot/`, `bots/atoyo-rag-bot/` (lid oqimi),
   va (bo'lsa) `bots/hr-bot/`.
2. **Telegram'ning "managed bots" imkoniyatini rasmiy Bot API hujjatidan
   o'rganing** — bot foydalanuvchi nomidan yangi bot yaratishi ("X would like
   you to create and manage a chatbot on your behalf", bot profilida
   "Created and managed by @...") . Qaysi metodlar, qaysi update'lar, yaratilgan
   botning tokeni qanday olinadi, cheklovlari. **Taxmin qilmang — hujjatdan
   iqtibos bilan yozing.** Egasining `@Yovuzhackerbot` boti bu imkoniyatni
   allaqachon ishlatadi — kodi qayerdaligini egasidan so'rang va o'qing.
3. Egasiga qisqa javob (15–20 qator): tushunganingiz, managed bots bo'yicha
   topilgan faktlar (havola bilan), ochiq savollar (5 tadan ko'p emas).
4. Kuting.

---

## 1. Mahsulot

**Muammo.** Kichik biznes va oddiy odamga Telegram bot kerak (ariza qabul
qilish, guruhni spamdan himoya, anonim savollar, test). AI bilan kod
yozdirish mumkin, lekin: sifat past, eng qiyini — **serverga joylash va
ishlatib turish**. Ko'pchilik shu joyda to'xtaydi.

**Yechim.** Bitta bot — `bot-factory` (nom keyin tanlanadi). Foydalanuvchi
start bosadi → tayyor shablonni tanlaydi → bir necha savolga javob beradi
(salomlashuv matni, admin guruh va h.k.) → bot yaratiladi va **darhol
ishlaydi**, server bizda. Kod yozish, server, deploy — kerak emas.

**Daromad.** Bepul sinov muddati → keyin oylik obuna (Telegram Stars).
Shablonga qarab narx: oddiy shablonlar arzon, AI'li shablonlar qimmatroq.

**Raqobat.** Shunga o'xshash konstruktorlar bor (masalan @GenesisCreatorBot).
Farqimiz: **o'zbek va rus tilida**, mahalliy biznesga mos shablonlar
(do'kon arizasi, o'quv markaz, HR), Telegram orqali tez yordam.

---

## 2. Qat'iy arxitektura qarorlari

### 2.1. Alohida repo
Bu platforma — **telegram-bots ichida emas**, alohida repo (`bot-factory`).
Sabab: telegram-bots qoidasi — har bot mustaqil, bir-biridan import yo'q.
Platforma esa umumiy runtime + shablonlar. telegram-bots'dagi asl botlarga
**tegilmaydi** — shablonlar ulardan o'rganib, qayta yoziladi.

### 2.2. Bitta jarayon — ko'p bot (har foydalanuvchiga alohida server YO'Q)
- Har yaratilgan bot uchun Railway'da alohida servis ochish — qimmat va
  boshqarib bo'lmaydi (100 bot = 100 servis).
- O'rniga: **bitta servis, webhook rejimi.** Har bolalar boti webhook'i
  `https://<domen>/tg/<bot_id>` ga o'rnatiladi, har biriga alohida
  `secret_token`. Bitta aiohttp server keladigan update'ni `bot_id` bo'yicha
  to'g'ri shablon handler'iga yo'naltiradi.
- Natija: xarajat botlar soniga emas, umumiy yuklamaga bog'liq.

### 2.3. Foydalanuvchi KOD yuklamaydi — faqat sozlama
- Shablon = bizning yozilgan va testlangan kodimiz + foydalanuvchi
  to'ldiradigan sozlamalar (JSON schema bilan tekshiriladi).
- Foydalanuvchi kodi bizning serverda **hech qachon** bajarilmaydi.

### 2.4. Shablon interfeysi
Har shablon — bitta Python paketi:
- `META`: nomi (uz/ru), tavsif, narx toifasi, kerakli huquqlar (guruh admini va h.k.);
- `CONFIG_SCHEMA`: yaratishda so'raladigan savollar va validatsiya;
- `build_router(config) -> Router`: aiogram handler'lari;
- ma'lumotlar — umumiy bazada, **har yozuvda `bot_id`** (izolyatsiya).
Yangi shablon qo'shish = yangi paket + testlar; runtime'ga tegilmaydi.

### 2.5. Bot yaratish usuli
- Asosiy: Telegram **managed bots** (0-fazada o'rganilgan rasmiy oqim) —
  foydalanuvchi BotFather'ga kirmaydi.
- Zaxira: foydalanuvchi BotFather'dan token olib yuboradi; token `getMe`
  bilan tekshiriladi.

### 2.6. Tokenlar va xavfsizlik
- Bolalar botlari tokenlari bazada **shifrlangan** (AES-GCM / Fernet), kalit —
  faqat `.env` (`MASTER_KEY`). Token log'ga **hech qachon** chiqmaydi.
- Webhook `secret_token` har so'rovda tekshiriladi.
- Foydalanuvchi o'z botini o'chirsa — webhook o'chiriladi, token o'chiriladi.

### 2.7. Suiiste'mol (abuse)
Platformada kimdir firibgarlik yoki spam bot yasasa — Telegram **bizning
asosiy botimizni** ham bloklashi mumkin.
- Yaratishda foydalanish shartlariga rozilik (ToS).
- Har botga limit: kunlik xabar, ommaviy xabar tezligi.
- Platforma admini (`ADMIN_IDS`): istalgan botni bir tugma bilan to'xtatish,
  egasini bloklash.
- Shikoyat qabul qilish (`/report`).

### 2.8. Shablonlar
**MVP (uchta):**
1. **Ariza / lid bot** — biznes uchun: forma savollari → javoblar admin
   guruhiga (atoyo-rag-bot'dagi lid oqimidan o'rganib).
2. **Anonim savol-javob** — anonim-bot'dan (Node → Python qayta yoziladi).
3. **Guruh himoyachisi** — killspam-bot'dan (spam, reklama, havola filtri).

**Keyin:** test (quiz) bot, ID topuvchi (bepul "ilmoq" shablon), katalog/do'kon
bot, **HR bot (premium)**, AI FAQ bot (foydalanuvchi matni asosida, platforma
AI kaliti va kvota bilan — premium).

**Qo'shilmaydi:**
- video yuklovchi — mualliflik huquqi, YouTube/Instagram qoidalari, og'ir
  ffmpeg va trafik;
- virus tekshiruvchi — VirusTotal ochiq API tijorat maqsadida taqiqlangan;
- userbotlar (Telethon) — boshqa odamning akkaunt sessiyasini saqlash yo'q.

### 2.9. To'lov
- Bepul sinov (masalan 7 kun) → Telegram Stars obunasi. Stars'ning obuna
  imkoniyatini amaldagi hujjatdan tekshiring.
- Obuna tugasa: bot "to'xtatilgan" xabarini beradi (yoki webhook pauza),
  ma'lumot 30 kun saqlanadi, keyin o'chadi.
- Zaxira karta + chek usuli hr-bot'dagi kabi (admin tasdiqlaydi, idempotent).

### 2.10. Texnologiya va deploy
- Python, aiogram 3, aiohttp (webhook server), SQLAlchemy 2 async,
  **PostgreSQL** (Railway plugin), Alembic migratsiyalar.
- Railway: bitta servis (Dockerfile) + PostgreSQL. `/health` endpoint.
  Kunlik baza zaxirasi.
- Lokal ishlab chiqish: polling rejimi (webhook'siz) — bitta bot bilan test.
- Matnlar uz/ru, lug'at faylda.

---

## 3. Ma'lumotlar modeli (boshlang'ich)

| Jadval | Maydonlar |
|---|---|
| `owners` | tg_id, til, holat (`active`/`banned`), created_at |
| `bots` | id, owner_id, template, username, token_enc, webhook_secret, holat (`active`/`paused`/`disabled`), created_at |
| `bot_configs` | bot_id, config (JSON, schema bilan tekshirilgan), version |
| `subscriptions` | owner_id yoki bot_id, plan, active_until, trial_used |
| `payments` | id, owner_id, method, amount, status, telegram_charge_id, receipt_file_id |
| `reports` | id, bot_id, reporter_id, sabab, holat |
| shablon jadvallari | har birida `bot_id` majburiy (masalan `leads`, `anon_threads`, `spam_rules`) |

---

## 4. Foydalanuvchi oqimi

`/start` → nima qila olishi va narxlar → **"Bot yaratish"** → shablonlar
ro'yxati (har birida qisqa demo/rasm) → shablon tanlash → sozlama savollari
(har javob tekshiriladi) → bot yaratish (managed bots yoki token) →
"Botingiz tayyor: @username" + qisqa yo'riqnoma.

**"Mening botlarim":** ro'yxat → har bot: holat, statistika (xabarlar soni),
`Sozlamalarni o'zgartirish` / `To'xtatish` / `Davom ettirish` / `O'chirish`
(tasdiqlash bilan), obuna muddati va "Uzaytirish".

---

## 5. Bosqichlar

Har faza oxirida: testlar yashil, kalit skaneri toza, egasiga qisqa hisobot.
**Keyingi fazaga egasi "davom" degandan keyin o'tiladi.**

- **Faza 1 — Spec va skelet:** README (shu fayl asosida), ToS qoralamasi,
  repo tuzilishi, `.env.example`, shablon interfeysi, test karkasi.
  *To'xtash nuqtasi: egasi tasdiqlaydi.*
- **Faza 2 — Runtime yadro:** asosiy bot, bot yaratish (managed bots +
  token zaxirasi), tokenni shifrlash, webhook marshrutlash, **bitta shablon**
  (ariza/lid bot), admin "to'xtatish" tugmasi. Lokal polling bilan test.
- **Faza 3 — Yana 2 shablon + "Mening botlarim"** boshqaruvi.
- **Faza 4 — To'lov:** sinov muddati, Stars obunasi, muddat tugashi, limitlar.
- **Faza 5 — Railway deploy:** Dockerfile, health, migratsiyalar, zaxira,
  monitoring (xato va yuklama log'i).
- **Faza 6 — Premium shablonlar:** HR bot, AI FAQ bot, katalog bot.

---

## 6. Qoidalar

- Har jiddiy o'zgarish: MUAMMO → SABAB → YECHIM → XAVF → TEKSHIRUV.
- `except: pass` yo'q; xato log + foydalanuvchiga nima bo'lgani aytiladi.
- Token, kalit, karta raqami — faqat `.env`; log'da yo'q.
- Har so'rovda `bot_id` va egalik tekshiriladi — bir egasi boshqasining
  botini hech qanday yo'l bilan boshqara olmaydi (test bilan).
- `callback_data` qisqa, tekshiriladi, maxfiy ma'lumotsiz.
- Testlar tez, Telegram mock qilinadi; har bug — regressiya testi.
- Python bog'liqliklari — Python 3.14 uchun wheel borligi tekshirilib pin qilinadi.
- So'ralmagan narsa yo'q: web panel, WhatsApp, Click/Payme — hozir yo'q.

---

## 7. "Tayyor" ta'rifi (MVP = 1–4 fazalar)

- [ ] Yangi foydalanuvchi 3 daqiqa ichida kod yozmasdan ishlaydigan bot yaratadi
- [ ] Uchta shablon ishlaydi, har biri testlangan
- [ ] 50 ta bolalar boti bitta servisda muammosiz ishlaydi (yuklama testi)
- [ ] Bir egasi boshqasining botiga hech qanday yo'l bilan kira olmaydi
- [ ] Token hech qayerda ochiq ko'rinmaydi (baza, log, xato xabari)
- [ ] Sinov muddati tugaganda bot to'xtaydi, to'lovdan keyin qayta ishlaydi
- [ ] Admin istalgan botni bir tugma bilan to'xtata oladi
