# 🛒 Atoyo RAG Bot — AI savdo maslahatchisi

Santexnika do'koni uchun **Telegram bot**. Mijoz savolini tushunadi,
Firestore katalogidan **semantik qidiruv** bilan mos tovarni topadi,
kanaldagi mahsulot postini forward qiladi va Gemini orqali narx-navo bilan
javob beradi. Mijoz telefon qoldirsa — buyurtma admin guruhiga va **n8n** ga
avtomatik ketadi.

> Bu `atoyo-ai-bot` dan farq qiladi: u **userbot**, rasmdan katalog kartochkasi
> yasaydi. Bu esa oddiy **bot** — katalog ustidan savol-javob qiladi.

## ✨ Imkoniyatlar

- **RAG** — ChromaDB vektor bazasi ustida semantik qidiruv, javob faqat
  katalogdagi haqiqiy narxlarga tayanadi
- **Ko'p tilli embedding** — so'rov o'zbekcha yozilsa ham topadi
- **Multimodal** — matn, **ovozli xabar** va **rasm** qabul qiladi
- **Post forward** — topilgan tovarning kanaldagi asl posti mijozga yuboriladi
- **Lid integratsiyasi** — buyurtma → admin guruh + n8n webhook
- **Docker Compose** — bot va n8n bitta buyruq bilan ko'tariladi

## 🧱 Tuzilishi

```
main.py            kirish nuqtasi — aiogram handlerlari
config.py          .env dan sozlamalar (kodda kalit yo'q)
rag_service.py     ChromaDB semantik qidiruv
sync_db.py         Firestore -> ChromaDB (faqat o'qish)
crm_tool.py        lid -> admin guruh + n8n
history_store.py   suhbat tarixi (SQLite)
text_utils.py      LEAD parsing, telefon tekshiruvi, xabar bo'lish
test_text_utils.py testlar
```

## ⚙️ O'rnatish

### Docker bilan (tavsiya etiladi)

```bash
cp .env.example .env          # to'ldiring
# serviceAccountKey.json ni shu papkaga qo'ying
docker compose run --rm bot python sync_db.py    # katalogni yuklash
docker compose up -d
docker compose logs -f bot
```

n8n panel: http://localhost:5678 — u yerda `atoyo-lead` webhook oqimini yarating.

### Qo'lda

```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # to'ldiring
python3 sync_db.py            # katalogni vektor bazaga yuklash
python3 main.py
```

> **Katalog o'zgarsa** `sync_db.py` ni qayta ishlating — u eski kolleksiyani
> o'chirib, yangisini yozadi (dublikat bo'lmaydi).

## 🔑 Kerakli kalitlar

| O'zgaruvchi | Qayerdan |
|---|---|
| `TELEGRAM_BOT_TOKEN` | [@BotFather](https://t.me/BotFather) |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |
| `serviceAccountKey.json` | Firebase Console → Project settings → Service accounts |
| `ADMIN_GROUP_ID` | `idfinder-bot` orqali topiladi |

## 🧪 Testlar

```bash
python3 -m unittest discover bots/atoyo-rag-bot
```

Testlar LLM javobi ustidagi parsing mantiqini qoplaydi — tashqi xizmat
chaqirilmaydi, internet kerak emas.

## 📐 Asosiy qarorlar

**Nega ko'p tilli embedding?** `all-MiniLM-L6-v2` faqat inglizcha. Katalog
o'zbekcha bo'lgani uchun qidiruv ishlamasdi va har toifa uchun qo'lda kalit
so'z yozishga to'g'ri kelardi. `paraphrase-multilingual-MiniLM-L12-v2` bu
tayoqni keraksiz qildi.

**Nega ball chegarasi?** `similarity_search()` doim `k` ta natija qaytaradi —
so'rov katalogga aloqasiz bo'lsa ham. Chegarasiz bot "assalomu alaykum" ga
javoban tasodifiy mahsulot postini forward qilardi.

**Nega `asyncio.to_thread`?** Chroma qidiruvi va embedding — CPU ishi, Gemini
SDK ning `generate_content()` esa sinxron. Ularni to'g'ridan-to'g'ri
chaqirish event loop'ni bloklaydi: bitta mijoz kutayotganda hammasi kutardi.

**Nega telefon regex bilan tekshiriladi?** `[LEAD: ...]` belgisini model
yozadi, ya'ni mijoz uni suhbatda o'zi yozib, adminga soxta buyurtma
yuborishga urinishi mumkin. Formatga tushmagan raqam o'tmaydi.

**Nega tarix SQLite da?** Xotiradagi dict restartda yo'qoladi va
foydalanuvchilar ortgani sari cheksiz o'sadi.

**Nega model startda tekshiriladi?** Noto'g'ri model nomi har so'rovda 404
beradi, bot esa "ishlayotgandek" turaveradi. Xato birinchi mijozda emas,
startda ko'rinishi kerak.

## ⚠️ Eslatma

`serviceAccountKey.json` — Firebase **admin** kaliti, u bilan butun bazaga
kirish mumkin. `.gitignore` uni bloklaydi; hech qachon commit qilmang.

---

**Muallif:** [@Abdulloh_77700](https://t.me/Abdulloh_77700)
