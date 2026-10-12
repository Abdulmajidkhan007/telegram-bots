# 👔 HR Bot (`@hr_ai_007_bot`)

Istalgan kompaniya ishlata oladigan **umumiy (multi-tenant) HR bot**: nomzod CV
yuboradi, AI uni vakansiya talablari bilan solishtiradi, HR qaror qiladi va
vakansiya yopilganda **qaror qilinmagan har bir nomzod** xushmuomala javob oladi.

**Muallif:** [@Abdulloh_77700](https://t.me/Abdulloh_77700) · Litsenziya: MIT ·
Holat: **MVP (1–3 fazalar)** — to'lov (4) va Telegram Business (5) hali yo'q.
To'liq spec: [`docs/HR-BOT-PROMPT.md`](../../docs/HR-BOT-PROMPT.md).

## Muammo

HR'ga 100 kishi yozadi, 5 tasi tanlanadi, qolgan 95 tasi **javobsiz** qoladi.
Bu bot har biriga javob yuborishni bitta tugmaga aylantiradi.

## Oqimlar

**Nomzod** — e'londagi havola: `https://t.me/hr_ai_007_bot?start=v_<slug>`
→ vakansiya kartochkasi → rozilik → PDF CV (≤ 10 MB, ≤ 10 sahifa) → havolalar
(yoki «Havola yo'q») → «Natija <sana> gacha». Muddat ichida CV'ni almashtirish mumkin.

**Kompaniya egasi** — `/start` → «Kompaniya egasi» → nom → platforma admini
faollashtiradi (pilot — bepul) → `/panel`: vakansiya ochish (nom, talablar,
muddat kunlarda, rad xati) → tayyor deep link; «HR taklif qilish» → bir martalik
havola (`?start=join_<token>`, 7 kun).

**HR** — `/panel` → vakansiyalar → arizalar **AI ball bo'yicha** → ariza: CV fayli +
ball + 3 sabab + mos/mos emas ko'nikmalar → `✅ Suhbatga` / `❌ Rad etish` /
`⏸ Keyinroq` → «🔒 Vakansiyani yopish» (oldin soni ko'rsatiladi) → qaror
qilinmaganlarning **hammasiga** rad xati.

**Platforma admini** (`ADMIN_IDS`) — `/admin`: statistika, kutayotgan
kompaniyalarni faollashtirish/bloklash. Yangi kompaniya haqida darhol xabar keladi.

**Muddat** — deadline o'tgach HR'ga bir marta eslatma. Avtomatik rad **yo'q**:
AI ham, taymer ham hech kimni o'zi rad etmaydi — faqat HR.

## Xavfsizlik va shaxsiy ma'lumot

- Har HR amalida kompaniya a'zoligi `repo.py` ichida tekshiriladi — handler
  unutsa ham boshqa kompaniya ma'lumoti ko'rinmaydi (testlar: `test_repo.py`).
- Deep link parametri har kirishda regex bilan tekshiriladi (≤ 64 belgi, `A-Z a-z 0-9 _ -`).
- `callback_data` — aiogram `CallbackData` (pydantic), ichida faqat ID; huquq har safar qayta tekshiriladi.
- PDF: hajm, haqiqiy `%PDF` sarlavhasi, sahifa soni, parol — tekshiriladi.
  Skanerlangan (matnsiz) PDF — HR'ga belgi, AI ball hisoblanmaydi.
- **Prompt injection:** CV — ma'lumot, ko'rsatma emas. Ko'rsatma `system_instruction`
  da, CV `<cv>` teglari ichida, CV'dagi soxta teglar o'chiriladi (`test_ai.py`).
- Vakansiya yopilgach `CV_RETENTION_DAYS` kun o'tib CV matni va fayl havolasi
  o'chiriladi (soatlik vazifa). Log'ga faqat ID'lar yoziladi — ism, CV matni yo'q.
- HR yozgan rad xati HTML sifatida talqin qilinmaydi (escape).

## AI

Gemini (`google-genai`, async), javob — JSON schema bilan. AI ishlamasa (kalit
yo'q, kunlik limit, tarmoq, buzuq JSON) — bot ishlayveradi, ball «hisoblanmadi».
Xarajat nazorati: `AI_DAILY_LIMIT` (kunlik chaqiruvlar), token soni bazada.
Ishga tushganda model va kalit tekshiriladi — xato bo'lsa aniq sabab bilan to'xtaydi.

## O'rnatish

```bash
cd bots/hr-bot
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # BOT_TOKEN, ADMIN_IDS, GEMINI_API_KEY ni to'ldiring
python -m hr_bot.main
```

| O'zgaruvchi | Majburiy | Izoh |
|---|---|---|
| `BOT_TOKEN` | ✅ | @BotFather |
| `ADMIN_IDS` | ✅ | platforma adminlari (vergul bilan) |
| `DATABASE_URL` | — | bo'sh: `hr_bot.db` (SQLite). PostgreSQL: `postgresql+asyncpg://...` |
| `GEMINI_API_KEY` | — | bo'sh bo'lsa AI o'chiq |
| `GEMINI_MODEL` | — | standart `gemini-2.5-flash` |
| `AI_DAILY_LIMIT` | — | standart 200, `0` — AI o'chiq |
| `CV_RETENTION_DAYS` | — | standart 30 |

Repo ildizidan: `npm run bot hr-bot`.

## Testlar

```bash
pip install pytest
python -m pytest -q
```

Internetga chiqmaydi: Telegram (soxta sessiya bilan haqiqiy Dispatcher) va Gemini mock.
`test_flow.py` — to'liq oqim: kompaniya → faollashtirish → vakansiya → nomzod CV →
HR → yopish → rad xati.

## Tuzilma

```
hr_bot/
  main.py        kirish, DI, soatlik vazifa (CV o'chirish, muddat eslatmasi)
  config.py      env
  db.py          SQLAlchemy modellari
  repo.py        ma'lumot + huquq tekshiruvi (kompaniya izolyatsiyasi)
  status.py      ariza holatlari va o'tishlari
  links.py       deep link, slug, token
  cv.py          PDF tekshiruvi va matn
  ai.py          Gemini baholash, prompt, JSON parse
  notify.py      ommaviy xabar (20/s, 403 → undeliverable)
  texts.py       uz/ru matnlar
  handlers/      start, owner, hr, candidate, admin
```
