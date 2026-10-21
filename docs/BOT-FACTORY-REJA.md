# bot-factory — reja va skelet (repo hali ochilmagan)

> Topshiriq: [`BOT-FACTORY-PROMPT.md`](BOT-FACTORY-PROMPT.md). Holat (2026-10-12):
> **faqat reja.** Platforma alohida repoda yoziladi — reponi egasi ochadi (§5).
> Asosiy bot — **`@Yovuzhackerbot`**, kodi noldan. Skelet pastda fayl daraxti va
> interfeys sifatida turibdi; yangi repo'da shu fayldan boshlanadi.
>
> Navbat: hr-bot MVP'dan keyin (hr-bot keyin premium shablonga aylanadi).

---

## 1. Managed bots — tekshirilgan faktlar

**Manba.** `core.telegram.org` bu muhitdan ochilmadi (DNS bloklangan). Shuning
uchun quyidagi iqtiboslar **aiogram 3.31.0** kodidan olindi — u rasmiy Bot API
sahifasidan avtomatik generatsiya qilinadi (`__api_version__ = "10.3"`, har
docstring'da `Source: https://core.telegram.org/bots/api#...`). Repo ochilganda
rasmiy sahifa bilan bir marta solishtirib chiqing.

| Narsa | Rasmiy matn (iqtibos) |
|---|---|
| Yoqish | `KeyboardButton.request_managed_bot`: «If specified, pressing the button will ask the user to create and share a bot that will be managed by the current bot. **Available for bots that enabled management of other bots in the @BotFather Mini App. Available in private chats only**» |
| Tugma parametrlari | `KeyboardButtonRequestManagedBot`: `request_id` (int32, xabar ichida noyob), `suggested_name`, `suggested_username` (ixtiyoriy). «Information about the created bot will be shared with the bot using the update *managed_bot* and a Message with the field *managed_bot_created*» |
| Update | `Update.managed_bot: ManagedBotUpdated` — «A new bot was created to be managed by the bot, or token or owner of a managed bot was changed» |
| Update tarkibi | `ManagedBotUpdated`: `user` — «User that created the bot», `bot` — «Information about the bot» |
| Xizmat xabari | `Message.managed_bot_created: ManagedBotCreated` (`bot`) — «user created a bot that will be managed by the current bot» |
| Token olish | `getManagedBotToken(user_id)` — «Use this method to get the token of a managed bot. Returns the token as String on success.» |
| Token almashtirish | `replaceManagedBotToken(user_id)` — «revoke the current token of a managed bot and generate a new one» |
| Kirish cheklovi | `setManagedBotAccessSettings(user_id, is_access_restricted, added_user_ids≤10)`; `getManagedBotAccessSettings` → `BotAccessSettings` |
| Flag | `User.can_manage_bots` — «True, if other bots can be created to be controlled by the bot. Returned only in getMe» |

**Xulosa (bizga):**
1. Asosiy bot BotFather Mini App'da bot boshqaruvini yoqadi → `getMe().can_manage_bots == True` ni ishga tushishda tekshiramiz.
2. «Bot yaratish» — **reply-klaviatura** tugmasi (`request_managed_bot`, faqat shaxsiy chatda), inline emas.
3. Foydalanuvchi tasdiqlagach `managed_bot` update keladi → `getManagedBotToken(bot.id)` → token shifrlanib bazaga.
4. Token almashsa ham `managed_bot` update keladi — har safar tokenni qayta olib yangilaymiz.
5. Egasi o'chirsa/obuna tugasa: webhook o'chiriladi, kerak bo'lsa `replaceManagedBotToken` (eski token yaroqsiz bo'ladi).

**Tekshirib bo'lmagan (taxmin qilinmaydi):**
- Deep link orqali yaratish (`t.me/newbot/{manager}/{username}` ko'rinishi) — faqat uchinchi tomon
  maqolalarida uchradi, aiogram/Bot API'da bunday maydon yo'q. Rasmiy
  [features](https://core.telegram.org/bots/features) sahifasidan tekshirilsin.
- Bitta boshqaruvchi botga nechta bola bot mumkinligi (kvota) — manbalar har xil.
- «Created and managed by @...» profil yozuvi — rasmiy matnda ko'rmadim.

**Stars obunasi** (`createInvoiceLink.subscription_period`, iqtibos): «The currency must be
set to 'XTR'… Currently, it must always be 2592000 (30 days) if specified… Subscription
price must no exceed 10000 Telegram Stars» (asl matndagi xato bilan). Ya'ni oylik obuna — mavjud, faqat 30 kun.

---

## 2. Arxitektura (spec'dan, o'zgarishsiz)

- Bitta servis, webhook rejimi: `POST /tg/<bot_id>`, har bolaga alohida `secret_token`
  (`X-Telegram-Bot-Api-Secret-Token` sarlavhasi tekshiriladi).
- Foydalanuvchi kod yuklamaydi — faqat sozlama (JSON schema).
- Token — Fernet bilan shifrlangan (`MASTER_KEY` faqat env'da), log'da yo'q.
- Har shablon jadvalida `bot_id` majburiy; har so'rovda egalik tekshiruvi.
- Zaxira yaratish usuli: foydalanuvchi BotFather tokenini yuboradi → `getMe` bilan tekshiriladi.

## 3. Skelet (repo ochilganda shu tuzilma bilan)

```
bot-factory/
├── README.md  LICENSE  .env.example  .gitignore  Dockerfile  railway.toml
├── requirements.txt         # aiogram>=3.31 (managed bots), aiohttp, sqlalchemy[asyncio],
│                            # asyncpg, alembic, cryptography, jsonschema
├── alembic/                 # migratsiyalar
├── factory/
│   ├── main.py              # aiohttp app: /health, /tg/{bot_id}, asosiy bot (polling lokalda)
│   ├── config.py            # BOT_TOKEN, MASTER_KEY, DATABASE_URL, PUBLIC_URL, ADMIN_IDS
│   ├── crypto.py            # Fernet: encrypt_token / decrypt_token
│   ├── db.py                # owners, bots, bot_configs, subscriptions, payments, reports
│   ├── registry.py          # shablonlar ro'yxati (paket nomi → TEMPLATE)
│   ├── runtime.py           # bot_id → (Bot, Dispatcher) keshi; webhook o'rnatish/o'chirish
│   ├── webhook.py           # secret_token tekshiruvi, update'ni to'g'ri dispatcher'ga
│   ├── limits.py            # kunlik xabar / ommaviy xabar tezligi (har bot)
│   ├── texts.py             # uz/ru
│   └── handlers/            # asosiy bot: /start, yaratish oqimi, «Mening botlarim», admin, /report
├── templates/
│   ├── base.py              # Template protokoli (pastda)
│   ├── lead/                # 1. Ariza/lid bot
│   ├── anon/                # 2. Anonim savol-javob
│   └── guard/               # 3. Guruh himoyachisi
├── docs/TOS.md              # foydalanish shartlari qoralamasi
└── tests/                   # izolyatsiya, shifrlash, webhook secret, schema, har shablon
```

**Shablon interfeysi** (`templates/base.py`):

```python
from dataclasses import dataclass
from typing import Protocol
from aiogram import Router


@dataclass(frozen=True)
class TemplateMeta:
    key: str                 # "lead" — bazada saqlanadi, o'zgarmaydi
    title: dict[str, str]    # {"uz": ..., "ru": ...}
    description: dict[str, str]
    tier: str                # "basic" | "ai" — narx toifasi
    needs_group_admin: bool  # guruhda admin huquqi kerakmi


class Template(Protocol):
    META: TemplateMeta
    CONFIG_SCHEMA: dict      # JSON Schema; yaratishda savollar shundan yasaladi

    def build_router(self, config: dict, bot_id: int) -> Router:
        """Handler'lar. Ma'lumot faqat `bot_id` bilan filtrlangan so'rovlar orqali."""
        ...
```

## 4. Fazalar (spec bilan bir xil, har biri oxirida — testlar + scan + egasi «davom»)

| Faza | Natija | Tayanch |
|---|---|---|
| 1 | Repo, README, ToS qoralamasi, `.env.example`, shablon interfeysi, test karkasi | shu fayl |
| 2 | Asosiy bot + managed bots oqimi + token zaxirasi + shifrlash + webhook marshrut + **lid shablon** + admin «to'xtatish» | §1 faktlar |
| 3 | Anonim va guard shablonlari, «Mening botlarim» | anonim-bot, killspam-bot (qayta yoziladi, import yo'q) |
| 4 | Sinov muddati, Stars obunasi (30 kun), limitlar | §1 Stars iqtibosi; hr-bot karta+chek oqimi |
| 5 | Railway: Dockerfile, `/health`, Alembic, kunlik zaxira | `docs/DEPLOY.md` tajribasi |
| 6 | Premium: HR (hr-bot'dan), AI FAQ, katalog | `bots/hr-bot` |

## 5. Egasining qarorlari (2026-10-12)

1. **Alohida repo — egasi o'zi ochadi** va bot-factory o'sha yerda yoziladi.
   Shu repoda faqat shu reja qoladi. (Profil repo `docs/REJA.md` «Cheklovdan istisnolar» jadvalida.)
2. **`@Yovuzhackerbot` — bot-factory'ning asosiy (universal) boti.** Uning tayyor
   kodi yo'q — **noldan yoziladi**. Tokeni faqat yangi repo'ning `.env` / Railway
   Variables'ida. BotFather Mini App'da bot boshqaruvi (managed bots) yoqiladi.
3. **Ochiq qolgan:** webhook domeni (Railway domeni yoki o'z domeningiz) — 5-fazagacha
   hal qilinadi, lokal ishlab chiqish polling'da.

## 6. Hozirgi holat — nima bor, nima yo'q

**Bor (hujjat):** managed bots faktlari (§1), arxitektura (§2), fayl daraxti va
shablon interfeysi (§3), fazalar (§4), Stars obunasi qoidasi.

**Yo'q (hali kod yozilmagan):** ishlaydigan bot, bot yaratish, shablonlar, to'lov,
deploy. Ya'ni foydalanuvchi uchun hozircha **hech qanday imkoniyat ishlamaydi**.

**Qayta ishlatsa bo'ladigan tayyor tajriba shu repodan** (import emas — o'qib,
qayta yoziladi):
| Kerakli qism | Qayerdan o'rganiladi |
|---|---|
| Ko'p tenantli izolyatsiya, rollar, deep link tekshiruvi | `bots/hr-bot` (`repo.py`, `links.py`) |
| Soxta Telegram sessiyasi bilan to'liq oqim testi | `bots/hr-bot/tests/test_flow.py` |
| Gemini retry/zaxira model, ovoz | `bots/ovoz-bot/ovoz_bot/gemini.py` |
| Railway Dockerfile + Volume | `docs/DEPLOY.md` |
| Anonim savol-javob, guruh himoyasi mantiqi | `bots/anonim-bot`, `bots/killspam-bot` |
