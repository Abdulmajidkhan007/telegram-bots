# telegram-bots — repo holati

> Faqat shu repo haqida: nima bor, nima ishlaydi, nima qolgan.
> Umumiy reja, navbat va «yangi loyiha yo'q» qoidasi — profil repoda:
> https://github.com/Abdulmajidkhan007/Abdulmajidkhan007/blob/main/docs/REJA.md
>
> Oxirgi tekshiruv: 2026-10-22 (koddan). Oxirgi kod o'zgarishi: 2026-10-22 (countlist-ts-node).

## Umumiy

- **16 ta bot**: Node 8 · Python 7 · TypeScript monorepo 1 (`bots.json`).
- `npm run start` — `autoStart: true` bo'lgan 9 tasini birdan ishga tushiradi;
  qolgan 6 tasi qo'shimcha xizmat (baza, userbot sessiyasi, Docker) talab qiladi.
- CI (`.github/workflows/ci.yml`): har push'da testlar + kalit skaneri.
- Repo **public** — kalitlar faqat env'da (`CLAUDE.md` → Xavfsizlik).

## Botlar

| Bot | Runtime | `start all` | Holat / izoh |
|---|---|---|---|
| `save-video-downloader-bot` | Node | ✅ | Ochiq: @Uzb_saver_007_bot. `railway.toml` bor |
| `anonim-bot` | Node | ✅ | Ochiq: @Anonim_007_bot. `railway.toml` bor |
| `arxiv-topadi-bot` | Node | ✅ | Ochiq: @arxiv_topadi_bot |
| `insta-avtojavob-bot` | Node | — | 2026-10-22: karkas, to'lov oqimi, admin panel, testlar tayyor. Pullik qo'llanma matni NAMUNA (`Chatplace.txt` kutilmoqda). Hali ishga tushirilmagan/e'lon qilinmagan |
| `gemini-qa-bot` | Node | ✅ | E'lon qilinmagan |
| `idfinder-bot` | Node | ✅ | Ochiq: @IDFINDER007BOT |
| `malware-bot` | Node | ✅ | Ochiq: @Tekshiruvchi_07_bot (VirusTotal) |
| `quiz-bot` | Node | ✅ | Ochiq: @SavolJavob_007_bot |
| `kino-bot` | Python | ✅ | Railway'da Volume shart (`DATA_DIR=/data`). `railway.toml` bor |
| `killspam-bot` | Python | — | Ochiq: @KillSpam_007_Bot. Baza kerak |
| `xulosa-ai-bot` | Python | — | Userbot (`STRING_SESSION`) — shaxsiy |
| `countlist-ts-node` | TS | — | Ochiq: @COUNTLIST_BOT. PostgreSQL/Redis; 2026-10-13: Mini App «Tarix», hisoblar, daromad, tezkor kiritish. 2026-10-22: bir xabardan ko'p tranzaksiya, hisoblar orasida transfer, Plus/Pro/Max + Stars/karta to'lovi — kodda bor, `BILLING_ENABLED` o'chiq, Telegram'da sinalmagan (`docs/COUNTLIST-TAHLIL.md`) |
| `atoyo-ai-bot` | Python | — | Userbot — ichki guruh |
| `atoyo-rag-bot` | Python | — | Ochiq: @Atoyo_service_bot. Docker + n8n |
| `hr-bot` | Python | ✅ | MVP (1–3 fazalar) + to'lov (4), Business (5), deploy fayllari (6) — 2026-10-12. `railway.toml` bor |
| `ovoz-bot` | Python | ✅ | 1-faza (STT + TTS). 2-faza `/myvoice` boshlanmagan. `railway.toml` bor |

## Deploy

- 5 ta botda Railway konfigi bor: `save-video-downloader-bot`, `anonim-bot`,
  `kino-bot`, `hr-bot`, `ovoz-bot`. Qo'llanma — `docs/DEPLOY.md` (telefondan).
- **Railway'da haqiqatan ishlayotgani repoda qayd etilmagan.** Egasi chiqargach
  shu jadvalga "Railway'da ✅ (sana)" deb yoziladi.

## Shu repodan chiqqanlar

- `bot-factory` — alohida private repo (2026-10-12, Faza 1+2). Bu yerda faqat
  `docs/BOT-FACTORY-REJA.md` va `docs/BOT-FACTORY-PROMPT.md` qoladi.

## Hujjatlar

`docs/DEPLOY.md` (Railway) · `docs/COUNTLIST-TAHLIL.md` (countlist: raqobatchi, paketlar) · `docs/BOT-TARIFLARI.md` (Bepul/Plus/Pro/Max) ·
`docs/HR-BOT-PROMPT.md`, `docs/OVOZ-BOT-PROMPT.md`, `docs/BOT-FACTORY-*.md`
(fazalar) · `docs/KALI-LINUX.md` · `docs/ARXITEKTURA-TARIXI.md` (qarorlar tarixi).
