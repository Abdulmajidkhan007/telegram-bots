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

## Qo'llanma matnini almashtirish

Pullik qism hozircha **NAMUNA** matn. Haqiqiy matn (`Chatplace.txt`) `src/guide-text.js`
dagi `PAID_PAGES` ga qo'yiladi, so'ng `IS_PLACEHOLDER = false`. Har bo'lim Telegram
chegarasiga (4096 belgi) sig'ishi testda tekshiriladi.

## Test

`npm test` — service, kontent va soxta bot bilan handler oqimlari (internetsiz).
