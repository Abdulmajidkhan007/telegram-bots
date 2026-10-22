# Instagram AI avto-javob — B yo'li (o'z mahsulotimiz) rejasi

> **Holat: faqat REJA. Kod yozilmaydi.** Sana: 2026-10-22.
> A yo'li (qo'llanma + «o'zim sozlab beraman») — avval. B kodi **A tugagach**
> boshlanadi va `docs/REJA.md` (profil repo) dagi «Cheklovdan istisnolar» jadvaliga
> egasi qarori bilan yoziladi (cheklov 2026-12-11 gacha). Quyidagi **F0** (Meta
> hisoblari, tasdiqlash) kod emas — hoziroq boshlash mumkin, chunki eng sekin qismi shu.
>
> **Ishonch belgisi:** `[T]` = «tekshirilishi kerak». Meta hujjat sahifalari bu
> sessiyadan ochilmadi (tarmoq cheklovi); ma'lumot veb-qidiruv natijalaridan olindi,
> ba'zilari uchinchi manba. `[T]` bor joyni egasi Meta dashboard'da / rasmiy hujjatda
> **o'z ko'zi bilan** tekshirgach qaror qilinadi. Meta tez-tez nomlarni o'zgartiradi.

---

## 1. Maqsad va chegara

Instagram Direct'ga kelgan mijoz savoliga **AI avtomatik javob beradi**, har javob
haqida egasiga **Telegram'da hisobot** boradi, xavfli mavzu bo'lsa **odamga uzatiladi**.
Ko'p mijozli (multi-tenant): har biznes — o'z Instagram akkaunti, o'z shabloni.

**Qilmaydi (MVP):** izohlarga javob, story javoblari, ommaviy xabar yuborish (spam),
to'lov qabul qilish, buyurtmani o'zi tasdiqlash, rasm/ovoz tushunish.

## 2. Nega rasmiy Meta yo'li — va norasmiy kutubxonalar nega yo'q

`instagrapi`, `instagram-private-api` va shunga o'xshash kutubxonalar Instagram'ning
yopiq (mobil ilova) API'sini taqlid qiladi. **Ishlatilmaydi:**

1. **Shartnoma buzilishi:** Meta shartlariga zid → mijozning akkaunti bloklanadi.
   Biz o'zimizni emas, **mijozning biznes akkauntini** xavfga qo'yamiz.
2. **Login = parol:** mijozdan parol so'rash kerak; 2FA/«shubhali kirish» tekshiruvlari
   tez-tez chalkashtiradi. Rasmiy yo'lda parol bizga umuman berilmaydi (OAuth).
3. **Barqaror emas:** yopiq API istalgan kuni o'zgaradi; mahsulot to'satdan to'xtaydi.
4. **Ishonch va sotuv:** «Meta tasdiqlagan» ilova bo'lish — mijozga sotish argumenti;
   norasmiy yo'lni sotib bo'lmaydi (javobgarlik bizda).
5. **Repo qoidasi:** `CLAUDE.md` xavfsizlik — begona akkaunt kalitlarini saqlamaymiz.

Qoida: **faqat Instagram Messaging API (webhook), OAuth orqali.**

## 3. Meta rasmiy yo'li — qadamlab (egasi telefondan)

### 3.0 Ikkita yo'l — qaysi birini tanlaymiz `[T]`

| | Instagram API **with Instagram Login** | Instagram API with **Facebook Login** |
|---|---|---|
| Ruxsat nomi | `instagram_business_manage_messages` `[T]` | `instagram_manage_messages` + `pages_messaging` `[T]` |
| Facebook sahifa | shart emas (`[T]`) | **shart** (IG ↔ Page bog'langan) |
| Mijoz ulanishi | Instagram'ga kirib ruxsat beradi | Facebook orqali sahifani tanlaydi |
| Host | `graph.instagram.com` | `graph.facebook.com` |

**Tavsiya: Instagram Login yo'li** (yangi, mijoz uchun sodda: Facebook sahifa
shart emas). Zaxira — Facebook Login yo'li; shuning uchun mijozlarga baribir
**Facebook sahifa ochib, Instagram bilan bog'lashni** tavsiya qilamiz (F0.2).
Qaysi yo'l hozirgi Meta'da «Instagram Messaging» uchun to'liq qo'llab-quvvatlanishini
dashboard'da **birinchi tekshiring** `[T]`.

### 3.1 Instagram akkauntni Professional qilish (har biznes — o'zi, telefondan)

1. Instagram ilovasi → profil → ☰ → **Sozlamalar va maxfiylik** → **Akkaunt turi va
   asboblar** → **Professional akkauntga o'tish**.
2. Turi: **Biznes** (tavsiya) yoki Creator → toifa tanlanadi → «Tayyor».
3. Akkaunt **ochiq (public)** bo'lishi tavsiya `[T]`.
4. **Xabarlarga ruxsat:** Sozlamalar → **Xabarlar va hikoyaga javoblar** → **Xabarlarni
   boshqarish** → «**Ulangan asboblarga xabarlarga kirishga ruxsat**» yoqiladi `[T]`
   (nomi/joyi versiyaga qarab o'zgaradi). Yoqilmasa API xabarlarni ko'rmaydi.

### 3.2 Facebook sahifa (zaxira yo'l uchun tavsiya)

1. Facebook ilovasi → ☰ → **Sahifalar** → **Sahifa yaratish** (biznes nomi, toifa).
2. Instagram → Profilni tahrirlash → **Sahifa** → Facebook sahifani bog'lash
   (yoki Accounts Center orqali) `[T]`.
3. Bir kishi ikkalasining ham adminligi bo'lishi kerak.

### 3.3 Meta Developer akkaunt va ilova (faqat EGASI — bir marta)

1. Brauzer (telefon «Desktop site» rejimida qulay): `developers.facebook.com` →
   Facebook bilan kirish → **telefon raqam va email tasdiqlash** → «Developer» sifatida ro'yxat.
2. **My Apps → Create App** → use case: **Other** → turi: **Business** `[T]`
   (yangi interfeysda «Messaging on Instagram» use case ko'rinishi mumkin).
3. App Dashboard → **Add product → Instagram** → **API setup with Instagram login**.
4. **Sozlamalar → Basic:** App icon, **Privacy Policy URL** (maxfiylik siyosati
   sahifasi — F5 da yoziladi), **Data deletion** URL/callback, kategoriya, kontakt email.
5. **App ID** va **App Secret** — faqat env'ga (`.env` — repoga hech qachon).
6. Sinov: o'z Instagram akkauntini **Add account** qilib, token yaratish; o'z akkauntiga
   o'zga akkauntdan xabar yozib sinash. App'da **roli bor** akkauntlar (admin/developer/
   tester) uchun **App Review kerak emas** (Standard Access) `[T]` — bu F1–F4 sinovi uchun yetadi.

### 3.4 Webhook ulash

1. Dashboard → Instagram → **Webhooks**: **Callback URL** (HTTPS, ommaviy — Railway domeni),
   **Verify token** (o'zimiz o'ylab topgan tasodifiy qator).
2. Meta `GET ...?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...` yuboradi;
   servis tokenni solishtirib `hub.challenge` ni qaytarishi shart.
3. Obuna maydonlari: `messages` (shart), qolganlari kerak bo'lsa: `messaging_postbacks`,
   `messaging_seen`, `messaging_reactions` `[T]` (aniq ro'yxat dashboard'da).
4. Har akkaunt uchun alohida **obuna** qilinadi (`POST .../subscribed_apps`) `[T]`.
5. Ilova **Live** rejimida bo'lishi kerak, aks holda rolsiz begonalardan webhook kelmaydi `[T]`.
6. Har POST'da `X-Hub-Signature-256` (HMAC-SHA256, App Secret bilan) tekshiriladi.

### 3.5 Business Verification (biznes tasdiqlash) — **ehtimol eng katta to'siq**

Boshqa biznesga xizmat qiluvchi ilova (Tech Provider) uchun Advanced Access odatda
Business Verification talab qiladi `[T]`.

1. `business.facebook.com` (Meta Business Suite) → **Business settings** → **Security
   centre** → **Start verification** `[T]`.
2. Kerak bo'ladi: yuridik shaxs nomi, manzil, telefon, **rasmiy hujjat** (guvohnoma /
   YaTT yoki MChJ hujjati, kommunal to'lov va h.k.), domen emaili `[T]`.
3. **O'zbekiston hujjatlari qabul qilinishi — `[T]`** (Meta Business Help Center'da
   «accepted documents» ro'yxati). Jismoniy shaxs/YaTT rasmiylashtirilmagan bo'lsa,
   **bu qadam to'xtatishi mumkin** — shuning uchun hoziroq (F0) boshlanadi.
4. Muddat: kunlardan haftagacha, rad bo'lsa qayta `[T]`.

### 3.6 App Review va Advanced Access

- **Nega kerak:** App rolida bo'lmagan **begona mijozlar** akkauntiga ruxsat so'rash
  uchun **Advanced Access** kerak; u App Review orqali beriladi. Faqat o'z (yoki
  o'zi boshqaradigan) akkaunt uchun odatda kerak emas `[T]`.
- **So'raladigan ruxsatlar (Instagram Login yo'li) `[T]`:**
  `instagram_business_basic`, `instagram_business_manage_messages`.
  (Facebook yo'lida: `instagram_basic`, `instagram_manage_messages`, `pages_messaging`,
  `pages_manage_metadata`, `business_management` — hammasi birga.)
- **Yuboriladi:** har ruxsat uchun foydalanish tavsifi + **ekran yozuvi (screencast)**:
  mijoz ulanishi (OAuth) → ruxsat berish → Instagram'dan xabar yuborish → ilova javobi
  → Telegram hisobot. Yozuv **xuddi shu ilova**dan bo'lishi shart (aks holda rad).
- **Reviewer uchun:** test kirish ma'lumotlari, ilovaning ishlayotgan (Live, sinab
  ko'riladigan) holati, ochiq Privacy Policy, data deletion.
- **Muddat:** rasmiy kafolat yo'q; uchinchi manbalar 3–7 ish kuni (yaxshi holat) va
  ~2–3 hafta (rad bo'lib qayta yuborilganda) deydi `[T]`. **Rejada 3–6 hafta zaxira.**
- **Tez-tez rad sababi:** screencast ruxsatni aniq ko'rsatmaydi; tavsif noaniq; ilova
  ishlamaydi; bog'liq ruxsat yetishmaydi; privacy policy ochilmaydi.
- **Data Use Checkup:** Advanced Access bo'lsa yiliga qayta tasdiqlash so'raladi `[T]`.

### 3.7 24 soatlik javob oynasi va qoidalar

- Foydalanuvchi yozgandan keyin biznes **24 soat** ichida erkin javob bera oladi.
  Oyna **foydalanuvchining har yangi xabari** bilan qayta ochiladi.
- Oyna yopilgach, oddiy javob yuborib bo'lmaydi. **Human Agent tegi** — inson
  operator uchun 7 kungacha uzaytiradi; reklama/targ'ibot mumkin emas `[T]`.
  **Bizning AI javoblari uchun ishlatilmaydi** (teg faqat haqiqiy odam javobi uchun
  mo'ljallangan — suiiste'mol akkauntni cheklashi mumkin). Oyna yopilsa: javob **yuborilmaydi**,
  egasiga Telegram'da «oyna yopildi» deb xabar beriladi.
- **Odamga uzatish yo'li shart:** Instagram Messaging API ishlatuvchi ilovalar
  foydalanuvchiga insonga chiqish imkonini berishi kerak `[T]` → bizda har javobda
  «operator bilan bog'lanish» yo'li bor (7-bo'lim).
- **Chegaralar** (manbalar zid — `[T]`): matn yuborish soniyasiga ~100–300 ta,
  audio/video ~10/soniya, izohga «private reply» soatiga ~750. Bizning yuk bundan
  ancha past; baribir xato 613 (rate limit) uchun qayta urinish bor.
- **Token:** mijoz tokeni qisqa muddatli → uzoq muddatli (~60 kun) almashtiriladi va
  muddati tugashidan oldin yangilanadi `[T]`; yangilash ishlamasa — egasiga Telegram'da «akkauntni qayta ulang».

### 3.8 Mijozni ulash (F4 da) — mijoz ham telefondan

Biz mijozga **havola** yuboramiz (Telegram bot ichida). Havola → «Business Login for
Instagram» OAuth oynasi → mijoz o'z akkauntiga kirib «Ruxsat berish» bosadi → biz kod
olib token almashtiramiz → webhook obunasi yoqiladi. Parol bizga umuman kelmaydi.
Ulash sharti: akkaunt Professional va 3.1 (4) yoqilgan. Bot buni bosqichma-bosqich
tekshiradi va xatoni o'zbekcha tushuntiradi.

## 4. Arxitektura

```
Instagram Direct ──(webhook POST)──▶ [webhook servis, TypeScript]
                                         │ 1. imzo tekshir, 200 OK darhol
                                         │ 2. dedupe (message id)
                                         │ 3. navbatga qo'y
                                         ▼
                              [ishchi: tenant yukla → xavfsizlik filtri →
                               AI javob → chiqish filtri → Instagram'ga yubor]
                                         │
                       ┌─────────────────┴──────────────────┐
                       ▼                                    ▼
                [PostgreSQL]                     [Telegram hisobot → guruh/egasi]
```

- **Til/stack:** TypeScript (qat'iy `strict`), Node 22+ LTS, Fastify, Zod (webhook va
  env validatsiyasi), `node:test` (repo qoidasiga mos). Telegram uchun grammY.
  Kutubxona versiyalari yaratish kunida eng oxirgisi.
- **Baza:** PostgreSQL (Railway). Dastlab navbat ham Postgres'da (`SELECT … FOR UPDATE
  SKIP LOCKED`) — Redis kerak emas; yuk oshsa BullMQ.
- **Jadvallar (qisqa):** `tenants` (biznes, til, shablon id, hisobot chat id, tarif,
  holat), `ig_accounts` (tenant, IG id, **shifrlangan** token, muddati), `conversations`
  (tenant, IG user id, oxirgi xabar vaqti → 24h oyna, `paused`/`handoff` bayrog'i),
  `messages` (id, yo'nalish, matn, flag'lar, token sarfi), `templates` (versiyali),
  `audit` (kim nima o'zgartirdi).
- **Sirlar:** mijoz tokenlari AES-256-GCM bilan shifrlanib saqlanadi, kalit faqat env'da;
  log'ga token/xabar matni to'liq yozilmaydi. Repo qoidasi: `.env.example` — namuna qiymat.
- **Webhook ishonchliligi:** Meta javobni kutadi → handler faqat tekshiradi va saqlaydi;
  AI chaqiruvi alohida ishchida. Meta qayta yuborsa (retry) — `message id` bo'yicha
  dedupe (regressiya testi bilan).
- **Deploy:** Railway (repoda tajriba bor, `docs/DEPLOY.md`), HTTPS domen shart (Meta talabi).
- **Kuzatuv:** health endpoint, xato — Telegram'da egasiga (jim yutilmaydi, `CLAUDE.md` oltin qoida 2).

## 5. AI qatlami va narx

- **Model:** arzon «Haiku» sinfi — `claude-haiku-5-5` (2026-10-07 chiqqan). Narx
  (1 mln token, ≤100k kontekst; ikkinchi darajali manbalar, rasmiy sahifada `[T]`):
  kirish **$0.10**, chiqish **$0.50**, kesh o'qish $0.01. Yangi tokenizer ~30% ko'proq
  token beradi.
- **Hisob (taxminiy):** bir javob ≈ 2 600 kirish + 200 chiqish token ≈ **$0.00036**.
  1 000 javob ≈ **$0.36 ≈ 4–5 ming so'm** (kurs ~12–13 ming so'm/$ `[T]`). Tasnif qadami
  (xavfsizlik) qo'shilsa ham 1 000 javobga ≤ ~10 000 so'm. Prompt keshi (shablon
  o'zgarmas qismi) narxni yana tushiradi. Mijozdan 100 000 so'm/oy olinsa marja katta;
  asosiy xarajat — **mening vaqtim va Railway (~$5–10/oy umumiy)**.
- **Kontekst:** oxirgi ~10 xabar + shablon + FAQ. Uzun suhbat qisqartiriladi.
- **Oqim:** (1) qoida asosli tez filtr (kalit so'zlar uz/ru/en) → (2) model-tasnif
  (JSON: `intent`, `risk`) → (3) xavfsiz bo'lsa javob generatsiyasi → (4) chiqish
  filtri → (5) yuborish. Model xatosi/timeout → **odamga uzatish**, jim emas.
- **Til:** o'zbek (lotin asosiy, kirill ham tushunadi), ruscha va inglizcha — mijoz
  qaysi tilda yozsa shunda. Mijoz «u/r/e» ni aralash yozishi — shablon testlariga kiradi.
- **Mijoz xabari — ishonchsiz kirish:** prompt injection («oldingi ko'rsatmalarni unut»)
  — AI'da **hech qanday vosita yo'q** (buyurtma/pul/baza yozmaydi); faqat matn
  qaytaradi, matn chiqish filtridan o'tadi. Bu xavfni asosiy darajada yopadi.

## 6. Biznes turlari bo'yicha shablon «miya»

Har tenant `template_id` + o'z maydonlarini (JSON, Zod bilan tekshiriladi) to'ldiradi:

```
{ business_name, tone, languages, hours, address, phone,
  faq: [{q, a}], services/prices (FAQAT egasi kiritgan), booking: handoff|link,
  forbidden: [...], handoff_triggers: [...], greeting, disclosure }
```

| Shablon | Yadro | Qo'shimcha xavfsizlik |
|---|---|---|
| Do'kon | mahsulot, narx, mavjudlik (egasi kiritganicha), yetkazish | narxni o'zi o'ylab topmaydi |
| Go'zallik saloni | xizmat, narx oralig'i, **vaqt band qilish → odamga** | |
| Restoran/kafe | menyu, ish vaqti, joy band qilish → odamga | allergiya savoli → odam |
| Ta'lim markazi | kurslar, jadval, sinov darsi → odamga | natija/ish kafolati — yo'q |
| Klinika/tibbiyot | faqat manzil, ish vaqti, yozilish | **tashxis/dori/davolash — doim odam** |
| Umumiy xizmat | FAQ + lid yig'ish (ism, telefon, nima kerak) | |

Qoida: AI **faqat shablondagi ma'lumotdan** javob beradi; bilmasa — «Bu haqda
operator javob beradi» deb uzatadi (o'ylab topmaydi). Shablonlar kodda versiyalanadi;
tenant o'zgartirishlari bazada (`audit`).

## 7. Xavfsizlik: odamga uzatish va oshkor qilish

**AI o'zini tanishtiradi:** har yangi suhbatning birinchi javobida (yoki tenant
`disclosure` matni): *«Salom! Men [Biznes] ning avtomatik yordamchisiman (sun'iy
intellekt). Savolingizga javob beraman; kerak bo'lsa operatorga ulayman.»* «Operator»
so'ralsa — darhol uzatiladi. AI o'zini odam deb ko'rsatmaydi.

**Doim odamga uzatiladigan mavzular** (AI javob **bermaydi**, faqat «Operatorga uzatdim,
tez orada javob beradi» + egasiga Telegram'da qizil belgi):

1. **Pul / xayriya / to'lov:** karta raqami, pul o'tkazish, xayriya, qaytarish (refund),
   qarz, «pul yuboring», to'lov tasdiqi, shubhali to'lov so'rovi.
2. **Tibbiy:** tashxis, dori, doza, davolash, homiladorlik, shoshilinch holat
   (jiddiy belgi — «103/tez yordam»ga yo'naltirish matni).
3. **Va'da / kafolat:** narxni qat'iy belgilash, chegirma va'dasi, muddat/natija
   kafolati, shartnoma, huquqiy mas'uliyat.
4. **Shikoyat, g'azab, tahdid**, o'zini zararlash haqida gap, voyaga yetmaganlar bilan
   bog'liq xavf.
5. **Shaxsiy ma'lumot so'rovi** (parol, kod, pasport) — AI ham so'ramaydi, ham qabul qilmaydi.
6. AI **ishonchi past** (tasnif `risk=high` yoki javob shablondan tashqari).

**Chiqish filtri:** javobda summa/karta/telefon/«kafolat»/«albatta» kabi so'zlar — shablonda
yo'q bo'lsa — javob bloklanadi va odamga o'tadi. **Yagona istisno yo'q:** pul mavzusida AI
hech qachon summa aytmaydi (narx — faqat egasi kiritgan ro'yxatdan, «taxminan» siz).

**Egasi nazorati:** Telegram'da har hisobotda tugma: «⏸ Shu suhbatni men olaman» (AI
to'xtaydi), «▶️ Qaytarish», «🛑 Hamma suhbat uchun o'chirish» (kill switch).
**Maxfiylik:** mijoz xabarlari 90 kun saqlanadi (taklif), so'rov bo'yicha o'chiriladi;
Privacy Policy'da Telegram'ga nusxa ketishi aytiladi.

## 8. Telegram hisobot

- **Egasi guruh ochib botni admin qilsa — hisobot guruhga** (bir nechta xodim ko'radi);
  aks holda egasining shaxsiy chatiga.
- **Ulash (telefondan):** Telegram → yangi guruh → bizning botni qo'shish → **admin**
  qilish → guruhda `/ulash <kod>` (kod botning shaxsiy chatida beriladi). Bot
  `chat_id` ni saqlaydi va faqat shu kod bilan ulanadi (begona guruhga hisobot ketmasin).
  Guruh admin emasligida bot xabarni ko'rmaydi/yubora olmaydi — bot buni tekshirib o'zbekcha aytadi.
- **Har javobga xabar:** `📩 @mijoz: «…» → 🤖 «…» · mavzu · ishonch · ⚠️ belgi` +
  tugmalar (3.7-bo'limdagi). Tanbehli (uzatilgan) xabarlar 🔴 bilan, alohida.
- **Shovqin:** kuniga 200+ javob bo'lsa — yig'ma (soatlik) rejim, lekin 🔴 doim darhol.
- **Kunlik xulosa:** javoblar soni, uzatilganlar, xarajat.
- Botning o'zi `telegram-bots` kodiga o'xshash grammY; token env'da.

## 9. Ko'p mijozli (multi-tenant) va tariflar

- Izolyatsiya: har so'rov `tenant_id` bilan (bazada qator darajasida tekshiruv; test
  «A tenant B ma'lumotini ko'rmaydi» majburiy).
- Egasi paneli — **Telegram bot menyusi** (veb-panel keyinroq): shablon tanlash, FAQ
  tahriri, ish vaqti, pauza, hisobot.
- **Tariflar (A narxlariga mos; `docs/REJA.md` 0-bo'lim):**

| | A (qo'llanma/xizmat) | B (taklif — egasi qaror qiladi) |
|---|---|---|
| Qo'llanma | 49 000 so'm | — |
| Sozlash (bir martalik) | 300 000 so'm | 300 000 so'm (shablon + ulash) |
| Oylik | 100 000 so'm/oy | **Start 100 000 so'm/oy** (~1 000 javobgacha) |
| Yuqori | — | **Plus 200 000 so'm/oy** (~5 000 javob, bir nechta akkaunt) `[taklif]` |

  Mantiq: mijoz uchun A va B bir xil narx bosqichida; B'da biz o'zimiz ishlatamiz
  (platformasiz), shuning uchun mijozga sarflanadigan vaqt oz. **Qoida: bir narx
  o'zgarsa A va B birga qayta ko'riladi.** Narx botdagi admin paneldan o'zgaradi.
  To'lov dastlab qo'lda (karta/Click/Payme o'tkazma) → tasdiq → `tenants.plan`; avtomat — keyin.
- Limit: tarifdan oshsa AI to'xtamaydi, egasiga ogohlantirish (jim kesilmaydi).

## 10. Repo qayerda bo'lsin — tavsiya (qaror egasida)

**Tavsiya: alohida PRIVATE repo** (masalan `insta-avtojavob`).

Sabablar:
1. `telegram-bots` — **PUBLIC**; B'da mijoz shablonlari, prompt'lar, narx mantig'i —
   ochiq turmasligi kerak. Mijoz tokenlari kodda bo'lmasa ham, tijorat mantig'i ochiq bo'lmasin.
2. `telegram-bots` modeli: har bot **mustaqil**, polling, `bots.json`, `tools/run.js`.
   B esa **webhook + baza + navbat + multi-tenant** — boshqa hayot sikli, boshqa CI
   (Postgres bilan integratsiya testi), boshqa deploy.
3. Meta App Review uchun ommaviy **Privacy Policy** va domen kerak; alohida repo/domen bilan toza.
4. `bot-factory` shu sabab alohida repoga chiqarilgan (2026-10-12) — o'sha pretsedent.
5. Xavf izolyatsiyasi: Meta akkauntga cheklov qo'ysa, bu 15 botga ta'sir qilmaydi.

Qarshi tomon: alohida repo = «yangi repo yo'q» cheklovi (2026-12-11 gacha) istisnosi
kerak; egasi `docs/REJA.md` istisnolar jadvaliga yozadi. Muqobil: `telegram-bots/bots/
insta-avtojavob/` — qisqa, lekin yuqoridagi 1–2-sabab tufayli tavsiya etilmaydi
(faqat **hisobot boti** kichik bo'lsa ham u servisning ichida qoladi).

## 11. Fazalar, «tayyor» mezoni, taxminiy hajm

Token/vaqt — qo'pol baho (sessiya = bitta ishchi sessiya; token — Sonnet sinfi modelda,
Opus kerak bo'lsa ~1.5–2×). «Kalendar» — Meta kutish vaqtini ham hisobga oladi.

| Faza | Mazmuni | «Tayyor» mezoni | Token | Kalendar |
|---|---|---|---|---|
| **F0** (kod emas, **hoziroq**) | Egasi: Professional IG, FB sahifa, Meta Developer, ilova, **Business Verification boshlash**; 2–3 pilot mijoz topish | Test IG akkauntga ilova ulangan; Verification «ko'rib chiqilmoqda»; 2 mijoz rozi | ~50–100k (hujjat yordami) | egasi 2–3 soat; kutish 1–4 hafta |
| **F1** Skelet | Webhook (GET tekshiruv, POST imzo, dedupe), yuborish, o'z akkauntda «echo» | O'z IG'ga yozilgan xabarga ilova javob beradi; imzo noto'g'ri → 401; dedupe testi | 300–500k | 1–2 sessiya |
| **F2** AI + shablon | Tasnif, javob, 6 shablon, chiqish filtri, uz/ru/en | Xavfsizlik test to'plami (≥60 holat: pul/tibbiy/va'da/injection) 100% to'g'ri uzatadi; mock model | 600k–1M | 2–3 sessiya |
| **F3** Hisobot + uzatish | Telegram guruh/chat ulash, tugmalar (pauza/kill), kunlik xulosa, 24h oyna mantig'i | Guruhga har javob keladi; «⏸» AI'ni to'xtatadi; oyna yopiq → yuborilmaydi + ogohlantirish | 400–700k | 1–2 sessiya |
| **F4** Multi-tenant | Postgres, OAuth ulash, token shifrlash/yangilash, tenant izolyatsiyasi, tarif/limit, Telegram menyu | 2 test tenant bir-birini ko'rmaydi; token yangilanadi; ulash telefondan 5 daqiqada | 0.8–1.5M | 3–4 sessiya |
| **F5** Review | Privacy Policy, data deletion, screencast, App Review so'rovi, Live rejim | Advanced Access **berilgan**; begona akkaunt ulanadi | 200–400k | **kutish 3–6 hafta `[T]`** |
| **F6** Pilot → ochiq | 2–3 haqiqiy mijoz (chegirma evaziga sharh), kuzatuv, qo'lda to'lov, keyin ommaviy sotuv | **5-shartli «tugallandi»** (REJA 0-bo'lim): deploy, README, `.env.example`, begona odam ishga tushira oladi, ≥1 haqiqiy foydalanuvchi | 300–600k | 2–4 hafta |

Jami kod: ~**2.5–4.5M token**, ~**10–14 ishchi sessiya**; kalendar jihatdan **~2–3 oy**
(asosiy kutish — Verification va App Review). F0 va F5 hujjat/kutish qismi kod bilan
parallel yuradi, shuning uchun F0 ni A tugashini kutmay boshlash foydali.

Har fazadan oldin: `CLAUDE.md` — `npm test`, kalit skaneri, o'zgargan yo'lni haqiqatan
bosib ko'rish; jiddiy o'zgarishda MUAMMO → SABAB → YECHIM → XAVF → TEKSHIRUV.

## 12. Xavflar

| Xavf | Ta'sir | Chora |
|---|---|---|
| Business Verification o'tmaydi (O'zbekiston hujjatlari) `[T]` | Begona mijoz ulanmaydi | F0 da boshlash; YaTT/MChJ rasmiylashtirish; muqobil — **Tech Provider** hamkor orqali yoki A yo'li |
| App Review rad / uzoq | Sotuv kechikadi | Aniq screencast, kuchli tavsif, 3–6 hafta zaxira; pilot rolli akkauntlarda |
| Meta siyosati/ruxsat nomi o'zgaradi | Qayta ishlash | Meta API'ni bitta modulga ajratish (`ig-client`) |
| AI noto'g'ri javob (pul/tibbiy) | Mijoz obro'si, javobgarlik | 7-bo'lim: uzatish, chiqish filtri, test to'plami, egasi nazorati |
| Mijoz akkauntiga cheklov (spam deb) | Mijoz yo'qotadi | Faqat javob (ommaviy yuborish yo'q), sekin tezlik, Human Agent tegini suiiste'mol qilmaslik |
| Token muddati tugaydi | Jimgina to'xtaydi | Muddatdan oldin yangilash + egasiga ogohlantirish |
| Maxfiylik (mijoz xabarlari Telegram'ga) | Shikoyat | Privacy Policy, saqlash muddati, o'chirish so'rovi |
| Meta AI/bot siyosati: WhatsApp'da umumiy maqsadli chatbotlar taqiqlandi (2026-01-15); Instagram uchun alohida qoida topilmadi `[T]` | Rad etilishi | Bizniki — biznes-xizmat boti (savol-javob), «umumiy ChatGPT» emas; shartlarni F5 dan oldin o'qish |

## 13. Ochiq savollar (egasi hal qiladi)

1. Repo: alohida private (tavsiya) yoki `telegram-bots` ichida? Istisno REJA'ga yozilsinmi?
2. B tariflari 9-bo'limdagi taklifdagidek bo'ladimi (Start 100k, Plus 200k)?
3. Business Verification uchun qaysi yuridik shakl bor (YaTT / MChJ / hech biri)?
4. Pilot uchun 2–3 biznes kim? (Atoyo o'zi birinchi sinov bo'la oladi.)
5. Instagram Login yo'li yoki Facebook Login yo'li — F0 da dashboard'da tekshirilgach.
