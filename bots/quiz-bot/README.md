# Quiz Bot

IT yo'nalishlari va maktab fanlari bo'yicha Telegram test boti (Node.js, `node-telegram-bot-api`).
**2007 ta savol, 13 yo'nalish, 72 bo'lim.**

**Asosiy imkoniyatlar:**

- Yakka test: yo'nalish → bo'lim → savol soni → har savolga vaqt → taymerli quiz poll'lar → natija va statistika
- Guruh testi: bot guruhga e'lon tashlaydi, ishtirokchilar qatnashadi, reyting chiqadi
- Yo'nalish va bo'limlar 6 tadan (3 qator x 2) sahifalab ko'rsatiladi, ⬅️ 1/3 ➡️ bilan varaqlanadi
- Savol soni: 5 / 10 / 20 yoki «✍️ Boshqa son» — istalgan son (1–100) yoziladi; bo'limda kamroq bo'lsa, bori beriladi
- Har savolda qaysi yo'nalish va bo'limdanligi ko'rinadi (masalan «🎨 Frontend › React») — Aralash'da ayniqsa kerak
- 🔀 **Aralash** — tanlangan yo'nalishning barcha bo'limlaridan tasodifiy savollar
- Majburiy kanal obunasi (admin paneldan boshqariladi)
- Welcome rasm + tanishtiruv matni (yangi foydalanuvchi `/start` bosganda)
- 3 tilli emoji-menyu, slash buyruqlar, har bosqichda orqaga qaytish

**Foydalanuvchi vakolatlari:**

| Imkoniyat | Oddiy foydalanuvchi | Admin |
| --- | :---: | :---: |
| Test ishlash, guruhda test, statistika | ✅ | ✅ |
| Savol qo'shish (umumiy bazaga) | ✅ | ✅ |
| Yangi bo'lim yaratish | ✅ | ✅ |
| **Yangi yo'nalish qo'shish** | ✅ | ✅ |
| Yo'nalishlar va bo'limlar ro'yxati (ko'rish) | ✅ | ✅ |
| Savol tahrirlash / o'chirish | ❌ | ✅ |
| Majburiy kanallarni boshqarish | ❌ | ✅ |
| Foydalanuvchilar va guruhlar ro'yxatini ko'rish | ❌ | ✅ |

> Foydalanuvchi qo'shgan savol/bo'lim/yo'nalishni hammasi ko'radi va ishlata oladi (umumiy baza).

---

## Tuzilma

```
quiz-bot/
├── index.js              # kirish nuqtasi (node index.js)
├── config.js             # yo'nalishlar, savol soni/vaqt variantlari, .env o'qish
├── src/
│   ├── storage.js        # JSON saqlash: users, results, groups, channels
│   ├── questions.js      # savollar bazasi (data/questions/ runtime, questions/ seed)
│   ├── quiz.js           # yakka test (quiz poll + taymer + ball)
│   ├── groupQuiz.js      # guruh testi (e'lon, qatnashish, reyting)
│   ├── admin.js          # admin panel + savol qo'shish (hamma uchun ochiq)
│   └── handlers.js       # ro'yxat, obuna, menyu, slash buyruqlar
├── questions/            # boshlang'ich savollar (seed; runtime'da o'qilmaydi)
│   ├── frontend/  backend/  mobile/  design/  devops/  security/  general/
│   └── til-adabiyot/  aniq-fanlar/  tabiiy-fanlar/  ijtimoiy-fanlar/  xorijiy-tillar/  mantiq/
├── test/                 # npm test — menyu sahifalash va savollar validatori
├── assets/
│   └── welcome.png       # 640×360 banner (xush kelibsiz ekranida)
├── data/                 # RUNTIME (.gitignore'da): users, results, groups, channels, questions
├── .env.example          # sozlamalar namunasi
├── .gitignore
├── package.json
└── README.md
```

---

## Savollar bazasi

| Yo'nalish | Bo'limlar |
| --- | --- |
| 🎨 Frontend | HTML, CSS, JavaScript, TypeScript, React, Vue, Angular, Next.js, Nuxt, Svelte, Tailwind, Sass, Redux, Vite/Webpack |
| ⚙️ Backend | Python, Django, FastAPI, Flask, Node.js, Express, NestJS, Java, Spring Boot, Go, PHP, Laravel, C#/.NET, SQL, PostgreSQL, MongoDB, Redis, REST API |
| 📱 Mobile | Flutter, Dart, Kotlin/Android, Swift/iOS, React Native |
| 🖌 Dizayn | UI/UX, Figma, Rang va tipografika |
| 🐳 DevOps | Git, Docker, Linux, CI/CD, Kubernetes |
| 🔐 Kiberxavfsizlik · 💡 Umumiy IT | Xavfsizlik asoslari · Algoritmlar, Tarmoqlar, Umumiy IT |
| 📝 Ona tili va adabiyot | Ona tili, Adabiyot |
| 📐 Aniq fanlar | Matematika, Algebra, Geometriya, Fizika, Informatika |
| 🧪 Tabiiy fanlar | Kimyo, Biologiya, Geografiya, Astronomiya, Ekologiya |
| 🏛 Ijtimoiy fanlar | O'zbekiston tarixi, Jahon tarixi, Huquq, Iqtisodiyot |
| 🌍 Xorijiy tillar · 🧩 Mantiq | Ingliz tili, Rus tili · Mantiqiy savollar, Umumiy bilim |

Fayl formati — `questions/<yo'nalish>/<bo'lim>.json`:

```json
{ "direction": "frontend", "directionLabel": "Frontend", "directionEmoji": "🎨", "directionOrder": 1,
  "key": "html", "label": "HTML", "order": 1,
  "questions": [ { "q": "Savol?", "options": ["To'g'ri", "Xato", "Xato", "Xato"], "correct": 0 } ] }
```

Variantlar test paytida aralashtiriladi. `npm test` har faylni Telegram chegaralariga
(savol ≤ 284, variant ≤ 100 belgi, 2–10 variant, `callback_data` ≤ 64 bayt) va takrorlarga tekshiradi.

> Savollar AI yordamida tuzilgan va qayta ko'rib chiqilgan. Xato topsangiz —
> admin paneldan tahrirlang yoki xabar bering.

> **Railway'da:** seed faqat volume'da **yo'q** fayllarni ko'chiradi — yangi bo'limlar
> avtomatik qo'shiladi, mavjud fayllar (siz qo'shgan savollar bilan) tegilmaydi.

## Lokal'da o'rnatish

**Talab:** Node.js 18+ (Termux, Linux, Mac yoki Windows).

```bash
git clone https://github.com/USERNAME/quiz-bot.git
cd quiz-bot
cp .env.example .env
nano .env                    # BOT_TOKEN va ADMIN_IDS ni to'ldiring
npm install
npm start
```

**`.env` ichida:**

- `BOT_TOKEN` — BotFather tokeni (talab qilinadi)
- `ADMIN_IDS` — admin Telegram ID'lari, vergul bilan (kamida bittasi tavsiya). O'z ID'ingizni bilish uchun botga `/id` yuboring.
- `REQUIRED_CHANNELS` — majburiy obuna kanallari (ixtiyoriy). Bo'sh qoldiring → obuna talab qilinmaydi. Bot **har bir kanalda admin bo'lishi shart**.
- `QUESTIONS_DIR` — lokal ishlab chiqishda **bo'sh qoldiring**. Railway uchun pastga qarang.

Bot ishga tushgach Telegram'da `/start` bosing.

---

## Buyruqlar (`/`)

| Buyruq | Vazifa |
| --- | --- |
| `/start` | Boshlash / ro'yxatdan o'tish |
| `/menu` | Asosiy menyu |
| `/test` | Yakka test ishlash |
| `/group` | Guruhda test o'tkazish |
| `/stats` | Statistikam |
| `/qush` | Savol qo'shish (hamma uchun ochiq) |
| `/bolim` | Yangi bo'lim yaratish (hamma uchun ochiq) |
| `/yunalish` | Yangi yo'nalish qo'shish (hamma uchun ochiq) |
| `/adminpanel` (yoki `/admin`) | Admin panel (faqat adminlar) |
| `/id` | Mening Telegram ID raqamim |
| `/bekor` | Joriy kiritish bosqichini bekor qilish |

> Buyruqlar Telegram'ning "/" menyusiga avtomatik qo'shiladi (`setMyCommands`). Reply-keyboard tugmalari bilan bir xil ishlaydi.

---

## Guruhda test o'tkazish

1. Botni guruhga qo'shing va **admin qiling** (poll yuborishi uchun shart).
2. Botga shaxsiy chatda `/group` yoki "👥 Guruhda test" tugmasini bosing.
3. Guruh → yo'nalish → bo'lim → savol soni → vaqt → boshlanish vaqtini tanlang.
4. Bot guruhga e'lon tashlaydi, a'zolar "✅ Men ham qatnashaman" bosadi.
5. Belgilangan vaqtda taymerli savollar boshlanadi.
6. Yakunda guruhda reyting + sizga (egaga) to'liq natija keladi.

> Eslatma: ball sanaladigan test **faqat guruhda** ishlaydi (kanalda poll anonim). Rejalashtirilgan test bot ishlab turganda bajariladi; bot qayta ishga tushsa, kutilayotgan test bekor bo'ladi.

---

## GitHub'ga yuklash

`.env` va `data/` allaqachon `.gitignore` ichida — token va shaxsiy ma'lumotlar yuklanmaydi.

```bash
cd quiz-bot
git init
git branch -M main
git add .
git status                   # tekshiring: .env va data/ chiqmasligi shart
git commit -m "Initial: quiz bot"
# GitHub'da yangi private repo yarating, keyin:
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

Push avtorizatsiyasi uchun GitHub paroli **ishlamaydi** — Personal Access Token (PAT) kerak yoki `gh auth login` orqali. GitHub: Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new → `repo` ruxsatini bering.

---

## Railway'ga deploy qilish (24/7)

### 1. Loyihani Railway'ga ulang

1. [railway.app](https://railway.app) → GitHub bilan kiring.
2. **New Project → Deploy from GitHub repo** → ushbu repo'ni tanlang.
3. Railway avtomatik `npm install` + `npm start` qiladi.

### 2. Environment Variables

Railway loyihangiz → **Variables** bo'limi → quyidagilarni qo'shing:

| Kalit | Qiymat |
| --- | --- |
| `BOT_TOKEN` | BotFather tokeni |
| `ADMIN_IDS` | Sizning Telegram ID'ingiz (vergul bilan ko'p) |
| `REQUIRED_CHANNELS` | `@kanal1,@kanal2` yoki bo'sh |
| `QUESTIONS_DIR` | `/app/data/questions` |

### 3. ⚠️ Volume yaratish (MAJBURIY)

Railway diski har deploy'da tozalanadi. Foydalanuvchilar, natijalar, savollar va guruhlar Volume bo'lmasa **yo'qoladi**.

1. Loyiha → **Settings** → pastga tushib **Volumes** bo'limi
2. **+ New Volume**
3. **Mount Path** = `/app/data`
4. **Add** → Railway avtomatik redeploy qiladi

Endi `data/` papkasidagi hamma narsa (foydalanuvchilar, natijalar, guruhlar, kanallar va savollar) doimiy saqlanadi.

### 4. Lokal botni to'xtatish

Bir token bilan faqat **bitta polling sessiyasi** ishlay oladi (`409 Conflict` xatosi bo'lmasligi uchun). Railway'ga deploy qilingach, lokal botni `Ctrl+C` bilan to'xtating.

### 5. Yangilanishlarni deploy qilish

```bash
git add .
git commit -m "fix: ..."
git push
```

Railway avtomatik yangi commit'ni sezadi va qayta deploy qiladi.

---

## BotFather sozlamalari (tavsiya)

**`/setdescription` uchun:**

```
🎯 Quiz Bot — IT bilimingizni sinaydigan test boti. Frontend, Backend, Mobile va boshqa yo'nalishlar bo'yicha taymerli testlar. Do'stlaringiz bilan guruhda musobaqalashing, reyting va statistikangizni kuzating. Boshlash uchun /start bosing!
```

**`/setabouttext` uchun:**

```
IT yo'nalishlari bo'yicha taymerli test boti. Yakka va guruh testlari, reyting, statistika.
```

**`/setuserpic` uchun:** loyiha `assets/` papkasidagi rasmni ishlatishingiz mumkin (yoki o'zingiznikini yuklang).

---

## Texnik tafsilotlar

- **Node:** 18+
- **Bot library:** `node-telegram-bot-api@0.66.0` (CommonJS-mos)
- **Saqlash:** JSON fayllar (`data/` papkasida)
- **Quiz mexanizmi:** Telegram'ning `sendPoll` (type: 'quiz') — bot tomonidan ball hisoblanmaydi, Telegram poll natijasi ishlatiladi
- **Rejalashtirilgan testlar:** Node.js `setTimeout` (jarayon o'lsa — yo'qoladi)

---

**Muallif:** [@Abdulloh_77700](https://t.me/Abdulloh_77700)
