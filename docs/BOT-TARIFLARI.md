# Bot tariflari — Bepul / Plus / Pro / Max

> Bu hujjatda **narx yo'q** — narxlar har botning Railway Variables'ida turadi
> (repo public). Bu yerda: qaysi botda qaysi imkoniyat qaysi tarifda,
> to'lov qanday ishlaydi, admin nimani sozlaydi.

---

## 1. Maqsad va chegaralar

- Botlar bepul qoladi — **asosiy foydalanish hamma uchun**. Pullik tarif
  «ko'proq / tezroq / cheklovsiz» beradi, bepulni sindirmaydi.
- Daromad maqsadi: **server xarajatini** (Railway, AI API) yopish, keyin foyda.
- Qamrov: 11 bot. Tashqarida qoladi:
  - `atoyo-ai-bot`, `atoyo-rag-bot` — Atoyo biznesining ichki vositalari.
  - `xulosa-ai-bot` — userbot, faqat egasining akkauntida ishlaydi; tashqi
    foydalanuvchisi yo'q, sotiladigan narsa yo'q (alohida mahsulot qilish —
    «G'oyalar qutisi» ga).

---

## 2. Tariflar

| Tarif | Kimga | Umumiy qoida |
|-------|-------|--------------|
| **Bepul** | hamma | Asosiy funksiya, kunlik chegara bilan, majburiy obuna bor |
| **Plus** | doimiy foydalanuvchi | Chegaralar ~3–5 barobar katta, majburiy obuna yo'q |
| **Pro** | faol / kichik biznes | Chegaralar ~10 barobar, qo'shimcha funksiyalar |
| **Max** | eng faol | **Bir oy davomida cheklovsiz** + hamma funksiya + navbatsiz yordam |

- Muddat: **30 kun** sotib olingan paytdan. Uzaytirilsa — qolgan kunlar ustiga qo'shiladi.
- Yuqoriroq tarifga o'tilsa — qolgan kunlar yangi tarifga o'tkaziladi (pul qaytarilmaydi,
  farq to'lanadi; hisob formulasi kodda va testda).
- Muddat tugashidan **3 kun** va **1 kun** oldin eslatma; tugagach — avtomatik Bepul.
- «Cheklovsiz» ham suiiste'moldan himoyalangan: texnik yuqori chegara (masalan, soatiga N)
  bor — bitta foydalanuvchi serverni yoki API kvotasini yutib yubormasin. Bu chegara
  foydalanuvchiga ko'rsatilmaydi, faqat suiiste'molda ishga tushadi va adminga xabar beradi.

---

## 3. Har bot: qaysi imkoniyat qaysi tarifda (boshlang'ich taklif)

Bu — **standart**. Admin panelda har birini o'zgartirish mumkin (4-bo'lim).
«—» — bu tarifda yo'q; raqam — kunlik chegara.
Ba'zi imkoniyatlar (pleylist, ommaviy qidiruv, guruhda avto-tekshiruv, o'z savollar
bazasi, Excel natija) botlarda **hali yo'q** — ular pullik tarif uchun keyin yoziladi.
Pilotda faqat mavjud imkoniyatlar va chegaralar bilan boshlanadi.

### save-video-downloader-bot
| Imkoniyat | Bepul | Plus | Pro | Max |
|---|---|---|---|---|
| Video yuklash / kun | 5 | 30 | 100 | cheksiz |
| MP3 (audio ajratish) | ✅ | ✅ | ✅ | ✅ |
| Eng yuqori sifat (1080p+) | — | ✅ | ✅ | ✅ |
| Katta fayl (local Bot API bo'lsa) | — | — | ✅ | ✅ |
| Pleylist / bir nechta havola birdan | — | — | ✅ | ✅ |
| Majburiy obuna | bor | yo'q | yo'q | yo'q |

### anonim-bot
| Imkoniyat | Bepul | Plus | Pro | Max |
|---|---|---|---|---|
| Savol qabul qilish | cheksiz | cheksiz | cheksiz | cheksiz |
| Savol yuborish / kun | 20 | 100 | 300 | cheksiz |
| Shaxsiy havola nomi (`?start=ism`) | — | ✅ | ✅ | ✅ |
| Rasm/ovozli savol | — | ✅ | ✅ | ✅ |
| Statistika (nechta savol, qachon) | — | — | ✅ | ✅ |

> Yuboruvchini «oshkor qilish» hech qaysi tarifda **yo'q** — botning va'dasi anonimlik.

### arxiv-topadi-bot
| Imkoniyat | Bepul | Plus | Pro | Max |
|---|---|---|---|---|
| Qo'llanma bosqichlari | ✅ | ✅ | ✅ | ✅ |
| Video qo'llanma / tayyor buyruqlar | — | ✅ | ✅ | ✅ |
| Shaxsiy yordam (admin bilan chat) | — | — | ✅ | ✅ (navbatsiz) |

### gemini-qa-bot
| Imkoniyat | Bepul | Plus | Pro | Max |
|---|---|---|---|---|
| Savol / kun | 10 | 50 | 200 | cheksiz |
| Suhbat xotirasi (kontekst) | qisqa | o'rta | uzun | uzun |
| Rasm bo'yicha savol | — | ✅ | ✅ | ✅ |
| Ovozli savol | — | — | ✅ | ✅ |
| Kuchliroq model | — | — | — | ✅ |

> AI API pullik — bu botda chegaralar API xarajatidan hisoblanadi (6-bo'lim).

### idfinder-bot
| Imkoniyat | Bepul | Plus | Pro | Max |
|---|---|---|---|---|
| ID topish | cheksiz | cheksiz | cheksiz | cheksiz |
| Majburiy obuna | bor | yo'q | yo'q | yo'q |
| Ommaviy (ro'yxat bilan) qidiruv | — | — | ✅ | ✅ |
| Natijani fayl (CSV) qilib olish | — | — | ✅ | ✅ |

> Bu bot arzon ishlaydi — asosiy daromad emas; Plus'ning qiymati «obunasiz».

### malware-bot
| Imkoniyat | Bepul | Plus | Pro | Max |
|---|---|---|---|---|
| Tekshiruv / kun | 5 | 30 | 100 | cheksiz* |
| Fayl hajmi | kichik | o'rta | katta | eng katta |
| Batafsil hisobot | — | ✅ | ✅ | ✅ |
| Tekshiruvlar tarixi | 5 ta | 50 ta | cheksiz | cheksiz |
| Guruhda avtomatik tekshirish | — | — | ✅ | ✅ |

> *VirusTotal bepul kaliti daqiqasiga 4 so'rov — «cheksiz» shu chegara ichida.
> Ko'p obunachi bo'lsa — VirusTotal pullik kaliti kerak bo'ladi.

### quiz-bot
| Imkoniyat | Bepul | Plus | Pro | Max |
|---|---|---|---|---|
| Yakka test / kun | 5 | 20 | cheksiz | cheksiz |
| Savol soni (bir testda) | 20 gacha | 50 gacha | 100 gacha | 100 gacha |
| Guruh testi o'tkazish | — | ✅ | ✅ | ✅ |
| O'z savollar bazasi (yopiq bo'lim) | — | — | ✅ | ✅ |
| Natijalarni Excel'da olish | — | — | ✅ | ✅ |

### kino-bot
| Imkoniyat | Bepul | Plus | Pro | Max |
|---|---|---|---|---|
| Kino / soat | 2 | 5 | 15 | cheksiz |
| Majburiy obuna | bor | yo'q | yo'q | yo'q |

> Diqqat: bot mualliflik huquqi himoyasidagi filmlarni tarqatsa, ularga **pul olish**
> huquqiy xavfni ko'paytiradi. Pullik qilishdan oldin kontent manbasini aniqlang.

### killspam-bot (guruh adminlari uchun)
| Imkoniyat | Bepul | Plus | Pro | Max |
|---|---|---|---|---|
| Guruhlar soni | 1 | 3 | 10 | cheksiz |
| Asosiy filtr (havola, APK) | ✅ | ✅ | ✅ | ✅ |
| Behayo kontent filtri | — | ✅ | ✅ | ✅ |
| O'z so'zlar ro'yxati | — | ✅ | ✅ | ✅ |
| Hisobot (kim, nima o'chirildi) | — | — | ✅ | ✅ |

> Bu yerda tarif **guruh egasiga** bog'lanadi, oddiy a'zoga emas.

### countlist-ts-node (Xarajat hisobchi)
| Imkoniyat | Bepul | Plus | Pro | Max |
|---|---|---|---|---|
| Guruhlar soni | 1 | 3 | 10 | cheksiz |
| Xarajat yozish | cheksiz | cheksiz | cheksiz | cheksiz |
| Ovozli xarajat | — | ✅ | ✅ | ✅ |
| Eksport (Excel/CSV/PDF) | — | ✅ | ✅ | ✅ |
| Limit va takroriy xarajat | — | — | ✅ | ✅ |
| Dashboard tahlili (grafiklar) | asosiy | asosiy | to'liq | to'liq |

---

## 4. Admin panel: tarifni sozlash

Har bot o'z admin panelida (mavjud admin menyusiga yangi bo'lim):

1. **💳 Tariflar** — har imkoniyat uchun qaysi tarifdan boshlab ochiq, va har tarifda
   chegara (son yoki «cheksiz»). O'zgarish darhol kuchga kiradi, bot qayta ishga tushmaydi.
2. **🧾 To'lovlar** — kutilayotgan cheklar ro'yxati: ✅ Tasdiqlash / ❌ Rad etish (sabab bilan).
3. **👤 Foydalanuvchi tarifi** — ID bo'yicha qo'lda tarif berish / muddat uzaytirish /
   bekor qilish (sovg'a, xato tuzatish uchun). Har amal audit log'ga yoziladi.
4. **📊 Hisobot** — oylik tushum (tasdiqlangan cheklar), faol obunachilar har tarifda.

Sozlamalar bot bazasida saqlanadi (JSON botlarda — atomik yozuv, `.tmp` + rename;
countlist'da — PostgreSQL). Standart qiymatlar — 3-bo'limdagi jadval.

**Narx admin panelda emas, Railway Variables'da** — o'zgartirish deploy talab qiladi,
tasodifan tugma bilan narx o'zgarib ketmaydi.

---

## 5. To'lov: karta raqami + chek

### Oqim
```
Foydalanuvchi: /tarif → tarifni tanlaydi (Plus / Pro / Max)
Bot: narx, karta raqami, karta egasi, izoh: "To'lov izohiga ID ni yozing: 123456789"
Foydalanuvchi: kartaga o'tkazadi → chek skrinshotini yuboradi
Bot: "Chek qabul qilindi, tekshirilmoqda (odatda 1–12 soat)"
Admin: chekni ko'radi (foydalanuvchi, tarif, summa, vaqt) → ✅ / ❌
  ✅ → tarif 30 kunga yoqiladi, foydalanuvchiga xabar
  ❌ → foydalanuvchiga sabab ("summa mos emas", "chek eski" ...)
```

### Xavfsizlik (cheklar soxtalashtiriladi — bu eng ko'p uchraydigan firibgarlik)
- **Avtomatik tasdiqlash yo'q.** Admin pul **bank ilovasida** kelganini ko'rgandan keyin bosadi.
- Chek skrinshoti — dalil emas, faqat qidiruvga yordam (summa, vaqt).
- Bitta foydalanuvchida bir vaqtda faqat **bitta** kutilayotgan chek; spamga chegara.
- Bir xil rasm (hash) ikkinchi marta yuborilsa — admin ogohlantiriladi.
- Tasdiqlash/rad etish callback'i faqat ADMIN_ID'dan qabul qilinadi; `callback_data`
  dagi ID va tarif tekshiriladi.
- Karta raqami kodda yoki repoda **yo'q** — faqat env.

### Muhim: Telegram qoidasi
Telegram'ning bot platforma qoidalari raqamli tovar va xizmatlar uchun to'lovni
**Telegram Stars** orqali qabul qilishni talab qiladi. Karta + chek usuli keng
tarqalgan, lekin qoidaga zid — shikoyat bo'lsa bot cheklanishi mumkin.
Tavsiya: **ikkalasi ham** bo'lsin — Stars (rasmiy, avtomatik) va karta (mahalliy
foydalanuvchiga qulay). Stars to'lovi `successful_payment` bilan keladi, admin
tasdiqlashi kerak emas.

### Soliq
Shaxsiy kartaga muntazam tushum — daromad. Rasmiylashtirish (o'zini o'zi band
qilgan shaxs, YaTT) bo'yicha mutaxassisdan aniqlang — bu kod masalasi emas.

---

## 6. Narxni qanday hisoblash (raqamlarsiz — usul)

1. **Xarajat:** oylik Railway hisobi (Billing → Usage) + AI API (Gemini) + VirusTotal.
2. **Zararsizlik nuqtasi:** xarajat ÷ Plus narxi = nechta Plus obunachi kerak.
   Maqsad: bu son **10 dan kam** bo'lsin.
3. **Pog'onalar:** Pro ≈ Plus × 2, Max ≈ Plus × 4. Ko'pchilik o'rtadagini oladi —
   Pro asosiy daromad tarifi, Max — «langar» (Pro'ni arzon ko'rsatadi).
4. **AI botlar** (gemini-qa) qimmatroq: bir foydalanuvchining oylik API xarajati ×3
   dan arzon bo'lmasin.
5. **Psixologik narx:** yaxlit emas, «…900».
6. Har 1–2 oyda qayta ko'rish: konversiya (bepul → pullik) < 1% bo'lsa — narx yoki
   bepul chegara noto'g'ri.

---

## 7. Railway Variables (har bot o'zida)

| O'zgaruvchi | Ma'nosi |
|---|---|
| `TARIF_PLUS_NARX` | Plus, so'm / 30 kun |
| `TARIF_PRO_NARX` | Pro, so'm / 30 kun |
| `TARIF_MAX_NARX` | Max, so'm / 30 kun |
| `TOLOV_KARTA` | Karta raqami (to'liq) |
| `TOLOV_KARTA_EGASI` | Karta egasi ismi |
| `TOLOV_STARS` | `1` bo'lsa Stars ham taklif qilinadi |
| `TARIF_PLUS_STARS`, `TARIF_PRO_STARS`, `TARIF_MAX_STARS` | Stars narxi |

Narx o'zgaruvchisi bo'sh bo'lsa — o'sha tarif **sotilmaydi** (tugma ko'rinmaydi).
Hammasi bo'sh — bot to'liq bepul, hozirgidek ishlaydi. Yangi o'zgaruvchilar har
botning `.env.example` iga (qiymatsiz) qo'shiladi.

---

## 8. Texnik reja

**Har bot mustaqil** (CLAUDE.md: botlar o'rtasida `require` yo'q). Shuning uchun:

- Node botlari uchun bitta namuna modul `billing/` (tariflar, chegara hisobi,
  to'lov oqimi, admin ekranlari) — **toza mantiq alohida faylda, testlar bilan**.
  Har botga nusxa ko'chiriladi, keyin moslashtiriladi.
- Python (kino, killspam) — o'sha mantiqning Python nusxasi.
- countlist — NestJS/Prisma ichida, alohida jadval.

**Ma'lumot:**
- `subscriptions`: user_id, tarif, boshlangan, tugaydi, manba (karta/stars/admin)
- `payments`: id, user_id, tarif, summa, chek file_id, holat (kutilmoqda/tasdiq/rad), admin, vaqt
- `usage`: user_id, imkoniyat, sana, soni — kunlik chegara uchun
- `tariff_config`: imkoniyat → {minimal tarif, har tarif chegarasi}

**Testlar (majburiy):** chegara hisobi, muddat qo'shish/o'tish, kun almashuvi
(Toshkent vaqti), «cheksiz» + texnik chegara, rad etilgan chek tarif bermaydi,
admin bo'lmagan callback rad etiladi.

**Bosqichlar:**
1. **Pilot — bitta bot** (`quiz-bot` yoki `save-video-downloader-bot`): to'liq oqim,
   haqiqiy 1–2 ta to'lov. Shu yerda xatolar chiqadi.
2. Natija bo'yicha modulni tuzatish → qolgan Node botlarga.
3. Python botlar, keyin countlist.
4. Har botda: README va `.env.example` yangilanadi.

**«Tugallandi»:** pilot botda kamida 1 ta haqiqiy (o'zingiz emas) tasdiqlangan to'lov.
