# Bot logolari va rasmlari

Har bot papkasida `assets/` ichida ikkita rasm bor:

| Fayl | O'lcham | Qayerga |
|------|---------|---------|
| `logo.png` | 640×640 | Bot avatari — BotFather → `/setuserpic` |
| `description.png` | 640×360 | Bo'sh chatdagi «What can this bot do?» rasmi — BotFather → `/mybots` → bot → *Edit Bot* → *Edit Description Picture* |

Telegram avatarni doira qilib qirqadi — logolarda muhim narsa markazda.
Userbotlar (`xulosa-ai-bot`, `atoyo-ai-bot`) uchun logo — akkauntning profil rasmi.

## Joylash (har bot uchun 1 daqiqa)

1. Telefonga `bots/<id>/assets/logo.png` ni yuklab oling (GitHub → fayl → *Download raw*).
2. @BotFather → `/setuserpic` → botni tanlang → rasmni **foto** sifatida yuboring.
3. @BotFather → `/mybots` → bot → *Edit Bot* → *Edit Description Picture* → `description.png`.

## AI bilan chiroyliroq variant (ixtiyoriy)

Bu rasmlar kod bilan chizilgan (gradient + emoji). Midjourney / DALL·E / Ideogram /
Gemini'da professional logo kerak bo'lsa — umumiy uslub + botning qatori:

**Umumiy uslub (har promptga qo'shing):**
`minimal flat app icon, single centered symbol, bold simple shapes, smooth gradient background, soft long shadow, no text, no letters, high contrast, 1:1, works as a small circular avatar`

| Bot | Prompt (asosiy qism) | Ranglar |
|-----|----------------------|---------|
| save-video-downloader-bot | a download arrow merging into a film clapperboard | coral red → orange |
| anonim-bot | a theatre mask with a speech bubble, mysterious | charcoal → violet |
| arxiv-topadi-bot | an archive folder with a circular restore arrow | teal → deep blue |
| gemini-qa-bot | a friendly robot head with a sparkle star | Google blue → lavender |
| idfinder-bot | an ID card with a magnifying glass | cyan → ocean blue |
| malware-bot | a shield blocking a virus particle | emerald → lime green |
| quiz-bot | a target with a dart and a small brain icon | orange → yellow |
| kino-bot | a clapperboard with popcorn | dark navy → crimson |
| killspam-bot | a broom sweeping away spam envelopes, shield | navy → royal blue |
| xulosa-ai-bot | a long scroll condensing into a short note with sparkles | purple → teal |
| countlist-ts-node | a wallet with coins and a small bar chart | indigo → violet |
| atoyo-ai-bot | a camera with a product price tag | sky blue → light cyan |
| atoyo-rag-bot | a shopping cart with a chat bubble | dark teal → sage green |

**Description rasmi uchun:** xuddi shu prompt + `wide 16:9 banner, symbol on the left, empty space on the right for a title`.
Matnni AI'ga yozdirmang (harflar buziladi) — keyin Canva'da qo'shing.
