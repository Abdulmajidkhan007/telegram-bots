# 🎬 Kino Kod Bot

Foydalanuvchi kino **kodini** yuboradi — bot videoni tavsifi bilan qaytaradi.
Admin kinolarni, adminlarni, majburiy obuna kanallarini bot ichidan boshqaradi.

**Muallif:** [@Abdulloh_77700](https://t.me/Abdulloh_77700) · Litsenziya: MIT

## ✨ Imkoniyatlar

- 🔢 Kod bo'yicha kino (istalgan matn = kod, yoki `/kino`)
- 📢 Majburiy kanal obunasi — «📡 Kanal boshqaruv» paneli: ro'yxat, har kanal
  yonida bot admin ekani (✅/⚠️), 🗑 o'chirish, ➕ qo'shish (`@kanal`, `t.me/kanal`
  yoki yopiq kanaldan **forward**). Bot admin bo'lmagan kanal qo'shilmaydi.
  Obunani tekshirib bo'lmasa (bot kanaldan chiqarilgan) foydalanuvchi bloklanmaydi — log'ga yoziladi
- 🎬 Kino qo'shish / o'chirish — bosqichma-bosqich, video bilan
- 👑 Adminlar ro'yxati (bosh adminni o'chirib bo'lmaydi)
- 📣 Reklama — foydalanuvchilarga yoki guruhlarga (istalgan format)
- 📊 Statistika: foydalanuvchilar, yuklab olishlar, top kinolar
- 💾 `/backup` va `/restore` — faqat bosh admin

## 🗂 Tuzilma

```
main.py            kirish nuqtasi (python main.py)
config.py          .env dan sozlamalar
database.py        JSON baza (atomik yozuv)
common.py          holatlar, IsAdmin filtri, yordamchilar
handlers_admin.py  admin paneli — butun router IsAdmin bilan o'ralgan
handlers_channels.py majburiy obuna kanallari paneli
handlers_backup.py /backup, /restore (faqat bosh admin)
handlers_user.py   foydalanuvchi qismi
buttons.py         klaviaturalar
tests/             pytest (Telegram mock, internetsiz)
```

## 🚀 Lokal ishga tushirish

```bash
cd bots/kino-bot
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # BOT_TOKEN va SUPER_ADMIN_ID ni yozing
python main.py
```

## ☁️ Railway

1. Servis: Root Directory `bots/kino-bot`, Watch Paths `bots/kino-bot/**`.
2. **Volume qo'shing** (Mount path `/data`) va Variables'ga `DATA_DIR=/data`.
   Volume'siz baza konteyner ichida turadi va **har deploy'da o'chadi**.
3. Variables: `BOT_TOKEN`, `SUPER_ADMIN_ID`, `DATA_DIR`.
4. Eski bazani ko'chirish: botga bosh admin sifatida `/restore` yozing va
   `database.json` faylini yuboring. Noto'g'ri kodli yozuvlar (masalan,
   adashib saqlangan menyu tugmasi) tashlab yuboriladi va ro'yxati ko'rsatiladi.

> ⚠️ `database.json` ichida foydalanuvchilar ID va ismlari bor — u repoga
> tushmaydi (`.gitignore`) va hech kimga yuborilmaydi.

## 🧪 Testlar

```bash
pip install pytest
python -m pytest -q
```

## 🛠 Eski versiyadan nima tuzatildi

| Muammo | Oqibat | Endi |
|---|---|---|
| Token `config.py` ga yozilgan edi | Repo ochiq — token hammaga ko'rinardi | Faqat `.env` |
| Inline tugmalarda admin tekshiruvi yo'q edi | `del_movie_yes_<kod>` yuborgan oddiy foydalanuvchi kino/admin/kanalni o'chira olardi | Admin router'i butunlay `IsAdmin` bilan o'ralgan |
| Kino qo'shish bosqichida menyu tugmasi javob deb olinardi | Bazada kodi `🎬 Kino qo'shish` bo'lgan kino paydo bo'lgan | Menyu matni rad etiladi; kod: 1–32 belgi, `A-Z a-z 0-9 _ -` |
| Ism, kod, kino nomi HTML'ga ochiq qo'yilardi | `<` bo'lsa Telegram xabarni rad etardi — javob kelmasdi | `html.escape` |
| JSON to'g'ridan-to'g'ri yozilardi | Jarayon o'rtada to'xtasa butun baza yo'qolardi | `.tmp` + `os.replace` |
| Obuna tekshiruvi xatosi jim yutilardi | Bot kanaldan chiqarilsa hamma "obuna bo'ling" da qolardi, sabab ko'rinmasdi | Log'ga yoziladi |
| Guruhga reklama yetmasa `deactivate_user` chaqirilardi | Guruh hech qachon o'chirilmasdi | `deactivate_group` |
| "Tark etganlar" har reklamada qayta sanalardi | Statistika oshib ketardi | Faqat birinchi marta |
| Stiker/rasm kelsa `message.text` None | Handler yiqilardi | Matn so'raladi |
| Yuklab olish xato bo'lsa ham sanalardi | Statistika noto'g'ri | Faqat yetib borgani |
| Obunani tekshirib bo'lmasa foydalanuvchi bloklanardi | Yangi token bilan bot eski kanalda admin bo'lmagani uchun **hamma** «obuna bo'ling» da qoldi | Boshqa botlardagi kabi bloklanmaydi, log + panelda ⚠️ |
| `/restore` kabi buyruq kino kodi deb izlanardi | Oddiy foydalanuvchiga «obuna bo'ling» chiqardi | «Bunday buyruq yo'q» |
