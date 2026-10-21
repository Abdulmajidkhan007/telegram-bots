# CLAUDE.md — ishlash qoidalari

> Har sessiyada o'qiladi — faqat qoidalar va xarita. «Nega shunday» —
> `docs/ARXITEKTURA-TARIXI.md`. Repo holati — `docs/HOLAT.md`.

## Cheklov (2026-09-11 → 2026-12-11)

**Yangi loyiha boshlanmaydi**, boshlanganlari tugatiladi. Navbat, «tugallandi»
ta'rifi, istisnolar va g'oyalar qutisi — profil repo `docs/REJA.md`
(github.com/Abdulmajidkhan007/Abdulmajidkhan007). Yangi g'oya o'sha yerga yoziladi.

## Ikkita oltin qoida

1. **Taxmin qilma — o'lchab ko'r.** Log, `--version`, test. Sabab aniqlanmaguncha tuzatish yozilmaydi.
2. **Xato jim yutilmaydi.** Bo'sh `catch {}` / `except: pass` taqiqlanadi; foydalanuvchiga nima bo'lganini ayt.

## Xarita

```
bots/<id>/          har bot MUSTAQIL: o'z package.json|requirements.txt, .env.example, README
bots.json           ro'yxat: id, runtime, install, start, autoStart, requires, note
tools/run.js        CLI: list / setup / install / start / doctor
tools/registry.js   bots.json ustidagi toza mantiq (+ registry.test.js)
tools/scan-secrets.js  kalit skaneri (repo PUBLIC)
docs/HOLAT.md       botlar holati, deploy holati
```

15 bot: Node — `save-video-downloader-bot`, `anonim-bot`, `arxiv-topadi-bot`, `gemini-qa-bot`,
`idfinder-bot`, `malware-bot`, `quiz-bot` · Python — `killspam-bot`, `xulosa-ai-bot`, `atoyo-ai-bot`,
`atoyo-rag-bot`, `kino-bot`, `hr-bot`, `ovoz-bot` · TS — `countlist-ts-node`.

## Xavfsizlik (repo PUBLIC)

- Telethon `*.session`, `.env` — hech qachon commit qilinmaydi; faqat `.env.example` (namuna qiymat).
- Kalit faqat env'da; kodga va log'ga yozilmaydi. Yangi env → darhol `.env.example` ga.
- Tashqi buyruq — `execFile`/`spawn` (shell:false), `exec` emas.
- `callback_data`, ID, yo'llar doim tekshiriladi.

## Tekshiruv (commit'dan oldin, hammasi yashil)

`npm test` → `npm run scan` → (`npm run doctor`) → o'zgargan botni haqiqatan ishga tushirib,
o'zgargan yo'lni bosib ko'r. Yiqilsa — sababni top, testni o'chirma.

## Test

Toza mantiqni test qil (parsing, limit, validatsiya); tashqi xizmatlar mock (test internetga
chiqmaydi). Har tuzatilgan bug — regressiya testi. Testlar sekundlarda; Node'da `node:test`.

## Kod uslubi

Node: CommonJS + `'use strict'`. Izohlar o'zbekcha, «nega» ni tushuntiradi. Atrofdagi kodga
o'xsha. Fayl 400–500 qatordan oshsa — bo'l. JSON — atomik yozuv (`.tmp` → `renameSync`).
`bots/x` dan `bots/y` ga `require` yo'q.

## Yangi bot

`bots/<id>/` (kod + `.env.example` + README + `.gitignore`) → `bots.json` yozuvi → `npm run check`.

## Jiddiy o'zgarish tartibi

MUAMMO → SABAB (o'lchov) → YECHIM → XAVF → TEKSHIRUV. Sabab topilmasa yechimga o'tilmaydi.

## Qilinmaydi

`.env`/kalit commit · bo'sh catch · `exec` ga foydalanuvchi matni · «ehtimol shu» tuzatish ·
testni o'chirib yashil qilish · botlar orasida bog'liqlik · so'ralmagan katta refaktor.

## Model

Arxitektura, chigal bug — eng kuchli model. README, kichik tuzatish, log saralash — arzonroq model.
