# countlist (@COUNTLIST_BOT) — raqobatchi bilan solishtirish va paketlar rejasi

> Manba: `bots/countlist-ts-node` kodi, 2026-10-22 (commit `8661971`). Har ✅/⚠️/❌
> fayl:qator bilan. Haqiqiy Telegram'da sinalmagan narsa «ishlaydi» deb yozilmaydi.
> Raqobatchi — guruhda ko'rilgan «Shaxsiy Moliya (Personal Finance)» boti (skrinshot).
>
> Qisqartma: `bot/` = `bots/countlist-ts-node/apps/bot/src/`,
> `shared/` = `bots/countlist-ts-node/packages/shared/src/`,
> `schema` = `bots/countlist-ts-node/packages/database/prisma/schema.prisma`.

## 1. Imkoniyatlar jadvali

| # | Imkoniyat (raqobatchida) | countlist | Kod qayerda | Nima qilish kerak | Hajm | Holat |
|---|---|---|---|---|---|---|
| 1 | Ovozli xabar → matn, «🎙 Eshitildi: «…»» | ✅ | `bot/handlers/message.handler.ts:122-166` (handler), `bot/services/voice.service.ts:61-113` (Gemini/Whisper), matn `message.handler.ts:157` (`🎙 <matn>`) | Ishlaydi, faqat API limiti tugagan (2-bo'lim). Kalit/billing — egasi. Ixtiyoriy: Gemini «thinking»ni o'chirish (narx ↓, 2-bo'lim) | kichik | egasidan kalit/billing |
| 2 | Bitta xabardan bir nechta tranzaksiya + «📊 Jami» | ❌ | Parser bitta summa oladi: `shared/utils/expense-parser.ts:182-188` (`parseTransactionText`), `:275-285` (`parseQuickEntry`); servis bitta yozuv yaratadi: `bot/services/expense.service.ts:27-69` | Xabarni bo'laklarga ajratish (`,` `;` yangi qator, «va»), har bo'lak — alohida yozuv, javobda ro'yxat + Jami + sana; «Bekor qilish» hammasini bekor qiladi. Ovozga ham ishlaydi (STT matni shu parserdan o'tadi) | katta | ✅ kod — PR #59 (2026-10-22), Telegram'da sinalmagan |
| 3 | Kirim va chiqim bitta xabarda | ⚠️ | Kirim bor, lekin faqat xabar boshidagi `+` bilan: `shared/utils/expense-parser.ts:173-188` (`SIGN_RE`); bitta xabarda bittasi | W1 bilan birga: har bo'lak o'z ishorasi bilan (`+200 ming oylik, 50 ming taksi`), Jami'da chiqim/kirim alohida | (W1 ichida) | ✅ kod — PR #59, Telegram'da sinalmagan |
| 4 | Bir nechta hisob, «❓ Qaysi hisobga?» | ⚠️ | Hisoblar bor: `schema:203-219` (`Account`), `/hisoblar`: `bot/commands/accounts.command.ts:72-73`. Yozuv avtomatik birinchi hisobga tushadi: `bot/services/expense.service.ts:71-78`; hisobni almashtirish tugmalari saqlangan xabarning o'zida: `bot/utils/entry-format.ts:61-72` (9 tagacha, `:32`) | Raqobatchi avval so'raydi (+1 bosish). Bizda avval saqlanadi, keyin tugma bilan o'zgaradi — tezroq. **Tavsiya: o'zgartirmaslik.** Agar egasi xohlasa — guruh sozlamasi «hisobni so'rab yoz» | kichik | egasi qarori |
| 4b | 🔄 Transfer (hisoblar orasida) | ❌ | `schema:195-198` — `TransactionType` faqat `EXPENSE`/`INCOME`; balans: `shared/utils/accounts.ts:26` (`computeBalances`) | Alohida `Transfer` modeli (statistikaga aralashmasin), balansga qo'shish, bot oqimi `/transfer` (hisob → hisob → summa) | katta | ✅ kod — PR #58 (2026-10-22), Telegram/DB'da sinalmagan; deploy'da `prisma db push` |
| 5 | «✅ Muvaffaqiyatli saqlandi!» + hisob + sana | ✅ | `bot/utils/entry-format.ts:47-59` — «✅ Xarajat/Daromad yozildi», summa, kategoriya, hisob, sana, muallif; «↩️ Bekor qilish» `:70` | Yo'q (bizda ko'proq ma'lumot) | — | bor |
| 6 | Asosiy reply-menyu (💰 Hisoblar · ➕ Tranzaksiya · 🔄 Transfer · ⚙️ Sozlamalar) | ❌ | Faqat inline menyu: `bot/keyboards/main.keyboard.ts:4-24`; `Markup.keyboard` hech qayerda yo'q. **Muhim:** bot faqat guruhda yozadi — `bot/middlewares/group.middleware.ts:24-35` (`dbGroup` faqat group/supergroup), `bot/handlers/message.handler.ts:90` | Guruhda reply-klaviatura hammaning ekranini egallaydi — guruh uchun yaramaydi. Raqobatchi shaxsiy chatda ishlaydi. Shaxsiy chat rejimi — yangi mahsulot yo'nalishi (shaxsiy «guruh»), cheklov davrida (CLAUDE.md) egasi qaror qiladi | katta | egasi qarori |
| 7 | Paketlar (Plus/Pro/Max) va limitlar | ❌ | Obuna/to'lov/usage modeli yo'q (`schema` da `Subscription`/`Payment` yo'q). Reja bor: `docs/BOT-TARIFLARI.md:139-147` | 3-bo'lim. Feature flag bilan, narx egasi tasdiqlamaguncha o'chiq | katta | ✅ kod — PR #60, `BILLING_ENABLED` ortida, O'CHIQ; narx egasi tasdig'ini kutadi |
| 8 | To'lov | ❌ | countlist'da yo'q. Repoda bor: `bots/hr-bot/hr_bot/billing.py`, `handlers/payment.py` (Telegram Stars obuna havolasi + karta/chek + admin tasdiq) | hr-bot mantig'ini TS'ga ko'chirish (4-bo'lim) | katta | ✅ kod — PR #60 (Stars + karta/chek), O'CHIQ; sinalmagan |

**Topilgan qo'shimcha muammo:** CI countlist testlarini ishga tushirmaydi —
`.github/workflows/ci.yml` faqat `npm test` (ildiz `package.json:20`:
`tools/registry.test.js` + insta-avtojavob). countlist testlari (shared 45, bot 43 —
2026-10-22 lokal yashil) faqat qo'lda. Shuning uchun countlist PR'larida «CI yashil»
yetarli emas — nazoratchi testlarni lokal ishga tushiradi. CI'ga qo'shish — alohida
kichik ish (yarn install ~90 s + `prisma generate`).

## 2. AI/STT: qaysi API, nega «limit tugadi», narx

**Kod:** `bot/services/voice.service.ts:28-38` — `GEMINI_API_KEY` bo'lsa Gemini
(standart model `gemini-2.5-flash`, `:34`), aks holda `OPENAI_API_KEY` bo'lsa
Whisper (`whisper-1`, `:101`). Ikkalasi ham yo'q — ovoz o'chiq (`message.handler.ts:125`).
Ovoz 60 s dan uzun bo'lsa yuborilmaydi (`voice.service.ts:11`, `message.handler.ts:128`).
Boshqa AI yo'q: matn tahlili (parser, kategoriya) — lokal, API'siz.

**«Bepul limit tugadi»:** API 429 qaytarsa bot «Ovozni tanish limiti tugagan» deydi
(`voice.service.ts:55-56`). Gemini bepul tarifi — Google Cloud loyihasi bo'yicha
daqiqalik/kunlik so'rov chegarasi (RPM/RPD); u kun boshida tiklanadi, lekin raqami
Google tomonidan o'zgartirib turiladi. Bu sessiyada `ai.google.dev` ochilmadi (DNS),
shuning uchun aniq RPD raqami **yozilmadi** — egasi AI Studio → *Usage / Rate limits*
sahifasida ko'radi. Yechim: loyihada billing yoqish (Paid tier) — keyin 429 faqat
yuqori RPM'da.

**1 so'rov narxi (taxminiy, USD):**

| Provayder | Narx (rasmiy narx sahifasi bo'yicha, 3-tomon manbalari bilan solishtirildi) | 15 s ovoz | 60 s ovoz (maks) |
|---|---|---|---|
| Gemini 2.5 Flash | audio kirish $1.00 / 1M token, chiqish $2.50 / 1M; audio ≈ 32 token/s | ~$0.0006 (thinking'siz) … ~$0.002 (thinking bilan) | ~$0.002 … ~$0.004 |
| OpenAI whisper-1 | $0.006 / daqiqa | $0.0015 | $0.006 |
| OpenAI gpt-4o-mini-transcribe | $0.003 / daqiqa | $0.00075 | $0.003 |

Eslatma: kod Gemini'ga `thinkingConfig` bermaydi (`voice.service.ts:76-87`) —
2.5 Flash standartda «o'ylaydi» va o'ylash tokenlari chiqish narxida hisoblanadi.
Transkripsiyaga o'ylash kerak emas; `thinkingBudget: 0` narxni ~2–3 barobar
kamaytiradi. Bu o'zgarish haqiqiy kalit bilan sinab ko'rilishi kerak (testlar
internetga chiqmaydi) — shuning uchun hali qilinmadi.

Manbalar: [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing),
[OpenAI pricing](https://openai.com/api/pricing/) (bu sessiyada to'g'ridan-to'g'ri
ochilmadi; raqamlar qidiruv natijalari va bir nechta 3-tomon sahifasidan
mos kelgani uchun olindi — yoqishdan oldin egasi rasmiy sahifadan tasdiqlasin).

## 3. Paketlar rejasi (TAKLIF — narxni egasi belgilaydi)

**Birlik — guruh.** countlist ma'lumoti guruhga bog'langan (`schema:49-77`), API
xarajati ham guruhdagi ovozlardan. Obunani guruhning istalgan a'zosi to'laydi,
guruhga yoziladi. (`docs/BOT-TARIFLARI.md:142` da «guruhlar soni / foydalanuvchi»
yozilgan — bu guruhga obuna bilan ziddiyat; egasi bittasini tanlaydi.)

| Imkoniyat (oyiga, guruhga) | Free | Plus | Pro | Max |
|---|---|---|---|---|
| Matnli yozuv (ko'p tranzaksiya ham) | cheksiz | cheksiz | cheksiz | cheksiz |
| Ovozli xabar | 30 | 300 | 1 000 | «cheksiz» (texnik chegara 3 000) |
| Hisoblar soni | 3 | 10 | 30 | «cheksiz» (texnik 100) |
| Transfer | ✅ | ✅ | ✅ | ✅ |
| Eksport (Excel/CSV/PDF) | — | ✅ | ✅ | ✅ |
| Limit va takroriy xarajat | — | — | ✅ | ✅ |

Matn va transfer API ishlatmaydi — ularni cheklash xarajatni qoplamaydi, faqat
foydalanuvchini qochiradi. Pul faqat ovozga ketadi.

**API xarajati / guruh / oy** (Gemini, thinking o'chiq ≈ $0.0006, eng yomon holat —
60 s Whisper $0.006):

| Paket | Odatiy (15 s Gemini) | Eng yomon (hammasi 60 s, Whisper) | Narxning pastki chegarasi (`BOT-TARIFLARI.md` 6-bo'lim: ≥ xarajat × 3) |
|---|---|---|---|
| Free | $0.02 | $0.18 | — (bepul; 100 faol guruh ≈ $2–18/oy) |
| Plus | $0.18 | $1.80 | ≥ $0.54 … $5.4 → kurs × shu |
| Pro | $0.60 | $6.00 | ≥ $1.8 … $18 |
| Max | $1.80 | $18.00 | ≥ $5.4 … $54 |

So'mga: `narx_so'm ≥ xarajat_usd × 3 × USD kursi`. Eng yomon holatni Whisper emas,
Gemini bilan hisoblasa (60 s ≈ $0.002) Plus'ning pastki chegarasi ≈ $1.8, ya'ni
taxminan bir necha o'n ming so'm. Aniq narx — egasi (profil `docs/REJA.md`
0-bo'lim: narx egasi ma'qullagandan keyin). Server (Railway, PostgreSQL, Redis)
xarajati bunga qo'shilmagan — Railway Billing'dan olinadi.

**Yoqilish qoidasi (feature flag):** `BILLING_ENABLED` bo'sh/`0` bo'lsa — hozirgidek,
hech qanday limit yo'q. Narx o'zgaruvchisi (`TARIF_PLUS_NARX` …) bo'sh bo'lsa o'sha
paket sotilmaydi (`BOT-TARIFLARI.md` 7-bo'lim). Limit raqamlari kodda standart,
admin buyrug'i bilan o'zgaradi.

## 4. To'lov usuli — repodagi mavjud yechim

| Variant | Repoda bormi | Afzallik | Kamchilik |
|---|---|---|---|
| **Telegram Stars** (obuna havolasi, 30 kun) | ✅ hr-bot: `bots/hr-bot/hr_bot/billing.py`, `handlers/payment.py:84-160` (`create_invoice_link` + `pre_checkout` + `successful_payment` + refund) | Telegram qoidasiga mos, avtomatik, admin kerak emas | Foydalanuvchi Stars sotib olishi kerak; Telegram komissiyasi |
| **Karta + chek + admin tasdiq** | ✅ hr-bot `handlers/payment.py:204-291`; Node'da `bots/insta-avtojavob-bot/src/handlers.js` | Mahalliy foydalanuvchiga qulay | Qo'lda tasdiq; Telegram qoidasiga zid (`BOT-TARIFLARI.md` 5-bo'lim) |
| Click / Payme | ❌ repoda yo'q | Avtomatik, so'm | Merchant shartnoma (YaTT/MChJ), yangi integratsiya — hozir tavsiya etilmaydi |

**Tavsiya:** ikkalasi (Stars + karta), hr-bot mantig'i TS'ga ko'chiriladi
(botlar orasida `require` yo'q — nusxa). Ikkalasi ham feature flag ortida.

## 5. Ishchilar va navbat

Bir faylni ikki ishchi bir vaqtda o'zgartirmaydi:

| Ishchi | Band | Asosiy fayllar | Bog'liqlik | Holat |
|---|---|---|---|---|
| W1 | Ko'p tranzaksiyali parser (2, 3) | `shared/utils/expense-parser.ts` (+ yangi fayl), `bot/services/expense.service.ts`, `bot/handlers/message.handler.ts`, `bot/handlers/entry.handler.ts`, `bot/utils/entry-format.ts` | — | ✅ merge #59 |
| W2 | Transfer (4b) | `schema` (`Transfer` modeli), `shared/utils/accounts.ts`, `bot/services/account.service.ts`, `bot/commands/accounts.command.ts`, `bot/utils/accounts.ts`, `apps/api/.../accounts.service.ts` | W1 bilan fayl kesishmaydi | ✅ merge #58 |
| W3 | Paketlar, limitlar, to'lov (7, 8) | `schema`, yangi `bot/services/billing*`, `message.handler.ts` (ovoz limiti) | W1 va W2 merge'dan keyin | ✅ merge #60 |

## 6. Yoqish tartibi (egasi uchun)

1. Railway'da `cd packages/database && npx prisma db push` (yangi jadvallar: `transfers`,
   `group_subscriptions`, `payments`, `usage_counters`).
2. Narx/to'lov env'lari (`bots/countlist-ts-node/.env.example`, README «Pullik paketlar»).
3. Oxirida `BILLING_ENABLED=1`. Bo'sh qoldirilsa bot avvalgidek bepul va limitsiz.

Ma'lum kamchilik: oylik ovoz limiti tugagach har ovozli xabarga «limit tugadi» javobi
beriladi (kuniga bir marta cheklash — keyingi kichik ish).

## 7. Egasidan kerak

1. Gemini: AI Studio'da limitni ko'rish va billing yoqish (yoki `OPENAI_API_KEY`).
2. Paket narxlari va limitlar (3-bo'lim taklifi) — tasdiq.
3. Obuna birligi: guruh (taklif) yoki foydalanuvchi.
4. To'lov: Stars narxlari; karta bo'lsa — karta raqami va egasi (faqat Railway Variables).
5. 4- va 6-band (hisob so'rash, reply-menyu / shaxsiy chat) — qaror.
