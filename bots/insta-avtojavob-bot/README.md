# insta-avtojavob-bot

Telegram **qo'llanma-bot**: Instagram'ga **AI avto-javobni** tayyor xizmat (Chatplace,
ManyChat kabi) orqali ulashni bosqichma-bosqich o'rgatadi. Muallif: @Abdulloh_77700.

## Nima qiladi

| Qism | Narx | Izoh |
|---|---|---|
| Bepul qadamlar (3 ta) | 0 | Xizmat kanaliga **majburiy obuna** (`CHANNEL_USERNAME`) |
| To'liq qo'llanma + AI «miya» shablonlari | 49 000 so'm | Obuna shart emas. 7 ta biznes turi: blogger, do'kon, restoran, xizmat, ta'lim, salon, boshqa |
| «O'zim sozlab beraman» | 300 000 + 100 000/oy | Ariza egasining Telegramiga tushadi (bot ichida to'lov yo'q) |

**To'lov (MVP, qo'lda):** karta/o'tkazma → chek rasmi → admin ✅/❌ → qo'llanma ochiladi.
Click/Payme — keyingi bosqich.

**Admin panel** (`/admin`, faqat `ADMIN_IDS`): narxlarni o'zgartirish (bog'liq narxlar
haqida eslatma bilan), kutilayotgan to'lovlarni ko'rish/tasdiqlash, statistika.

**Shablonlardagi xavfsizlik qoidalari** (har shablonga avtomatik qo'shiladi, test bilan
tekshiriladi): AI o'zini «avtomatik javob» deb tanishtiradi; pul/xayriya, tibbiy maslahat
va va'da berish savollariga javob bermaydi — odamga uzatadi.

## Ishga tushirish

```bash
cd bots/insta-avtojavob-bot
cp .env.example .env     # BOT_TOKEN, ADMIN_IDS, CHANNEL_USERNAME, CARD_* ni to'ldiring
npm install
npm start
```

Botni majburiy obuna kanalida **admin** qiling (aks holda obuna tekshirib bo'lmaydi).
Holat `DATA_DIR/db.json` da (atomik yoziladi); Railway'da `DATA_DIR=/data` + Volume kerak.

## Qo'llanma matni

Pullik qism (7 bo'lim, `src/guide-text.js` → `PAID_PAGES`) egasining `Chatplace.txt`
faylidan yozilgan (2026-10-25): ChatPlace zanjiri, Instagram'ni tayyorlash, ulash, kalit
so'z boti, AI «miya», leadlarni Telegram guruhga yuborish, sinash. Har bo'lim Telegram
chegarasiga (4096) sig'ishi va faqat ruxsat etilgan HTML teglari testda tekshiriladi.
ChatPlace menyu nomlari interfeysi o'zgarsa — shu faylda yangilanadi.

## Test

`npm test` — service, kontent va soxta bot bilan handler oqimlari (internetsiz).

## Ishga tushirishgacha qolgan ishlar (2026-10-25)

Kod va testlar tayyor; **haqiqiy Telegram'da hali sinalmagan** (sessiya konteyneridan
Telegram API yopiq). Egasi qiladi:

- [x] Haqiqiy qo'llanma matni (`Chatplace.txt`) → `PAID_PAGES` (2026-10-25)
- [ ] @BotFather'dan token; kanal tayyor va bot unda **admin**
- [ ] `ADMIN_IDS`, `CARD_NUMBER`, `CARD_HOLDER` — `.env` (lokal) yoki Railway Variables
- [ ] Railway: Volume `/data` + `DATA_DIR=/data`
- [ ] Qo'lda sinov (2 akkaunt: admin + oddiy):
  1. `/start` → bepul qadam → obunasiz «Tekshirish» rad etadi, obunadan keyin ochadi
  2. Sotib olish → karta ko'rinadi → chek rasmi → adminga keladi → ✅ → qo'llanma va shablonlar ochiladi
  3. ❌ rad etish → foydalanuvchiga xabar, qayta sotib olish ishlaydi
  4. «O'zim sozlab beraman» → ariza adminga keladi; 10 daqiqa ichida qayta ariza — rad
  5. `/admin` → narx o'zgartirish → menyuda yangi narx; statistika to'g'ri
  6. Botni qayta ishga tushirish → holat (`db.json`) saqlangan
