# 💸 XarajatBot — Telegram Expense Management System

Production-ready Telegram bot + FastAPI backend + React dashboard for personal & group expense tracking in Uzbek language.

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Bot** | Python 3.12 · aiogram 3.28 · OpenAI Whisper |
| **API** | FastAPI 0.115 · SQLAlchemy 2.0 (async) · Pydantic 2.10 · PyJWT |
| **DB** | PostgreSQL 16 · Redis 7 |
| **Frontend** | React 18 · TypeScript 5.7 · Vite 6 · TailwindCSS 3.4 |
| **State** | Redux Toolkit 2.5 · TanStack Query 5.62 |
| **UI** | Framer Motion 11 · Recharts 2.15 · React Hot Toast |

## 🚀 Quick Start

### Option 1: Docker (eng oson)

```bash
git clone https://github.com/abdulmajidkhan007/countlist.git
cd countlist
cp .env.example .env
# .env faylida BOT_TOKEN ni o'zingizning tokeningizga almashtiring
docker-compose up -d
```

Servislar:
- **Dashboard**: http://localhost:3000
- **API Docs**: http://localhost:8000/api/docs
- **Bot**: Telegram'da ishlaydi

### Option 2: Manual (Python + Node)

```bash
# 1. PostgreSQL va Redis ni ishga tushiring (lokal)
# 2. Database yarating
createdb expensedb

# 3. .env yarating
cp .env.example .env
# Ichini to'ldiring

# 4. API
cd api
pip install -r requirements.txt
PYTHONPATH=.. uvicorn main:app --reload --port 8000

# 5. Bot (boshqa terminalda)
cd bot
pip install -r requirements.txt
PYTHONPATH=.. python main.py

# 6. Dashboard (boshqa terminalda)
cd dashboard
npm install
npm run dev
```

## 🤖 Bot Commands

| Buyruq | Tavsifi |
|--------|---------|
| `/start` | Botni boshlash + asosiy menyu |
| `/help` | Yordam |
| `/today` | Bugungi xarajatlar |
| `/week` | Haftalik xarajatlar |
| `/month` | Oylik xarajatlar |
| `/stats` | Umumiy statistika |

**Tabiiy til orqali xarajat qo'shish:**
```
500000 so'm telefonga
2 mln remontga
50k ovqat
1.5 million kiyim
```

## 📊 Dashboard Pages

1. **Overview** — 4 stat card + kunlik/oylik grafiklar + kategoriyalar
2. **Expenses** — Filtrlash, qidirish, qo'shish/o'chirish
3. **Analytics** — Kengaytirilgan grafiklar va jadvallar
4. **Categories** — Maxsus kategoriyalar yaratish (ikonka + rang)
5. **Groups** — Telegram guruhlar ro'yxati
6. **Limits / Recurring** — Oylik limitlar va takroriy xarajatlar
7. **Exports** — CSV / Excel yuklab olish
8. **Settings** — Mavzu (dark/light), profil

## 🗄 Database Schema

```
users           — Telegram foydalanuvchilar
groups          — Telegram guruhlar
group_members   — Guruh a'zolari (role: owner/admin/member)
categories      — Xarajat kategoriyalari (system + user)
expenses        — Xarajatlar (user/group/category/month/year)
monthly_limits  — Oylik limitlar
recurring_expenses — Takroriy xarajatlar
exports         — Export tarixi
audit_logs      — Audit log
```

## 🔧 Environment Variables

```bash
# .env
BOT_TOKEN=your_telegram_bot_token       # @BotFather'dan oling
POSTGRES_DB=expensedb
POSTGRES_USER=expenseuser
POSTGRES_PASSWORD=expensepass
SECRET_KEY=random_64_char_hex_string
OPENAI_API_KEY=optional_for_voice_ocr

# .env (development uchun)
BOT_DISABLE_SSL_VERIFY=1                # Faqat self-signed CA muhitida
```

## 🧪 Testing

```bash
# API health
curl http://localhost:8000/health

# Register
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"telegram_id": 123, "first_name": "Test"}'

# API docs
open http://localhost:8000/api/docs
```

## 📂 Project Structure

```
countlist/
├── docker-compose.yml      # 5 servis
├── bot/                    # aiogram 3 Telegram bot
│   ├── handlers/           # start, expenses, stats, callbacks
│   ├── middlewares/        # db, user
│   ├── services/           # parser, voice
│   ├── keyboards/          # inline keyboards
│   ├── database/models.py  # SQLAlchemy modellar
│   └── main.py
├── api/                    # FastAPI backend
│   ├── routers/            # auth, expenses, analytics, categories,
│   │                       # groups, exports, users
│   ├── schemas/            # Pydantic schemalar
│   ├── middleware/auth.py  # JWT + Telegram auth
│   ├── database/models.py  # SQLAlchemy modellar
│   └── main.py
└── dashboard/              # React + TypeScript
    ├── src/
    │   ├── pages/          # 11 sahifa
    │   ├── components/     # ui, charts, layout
    │   ├── store/          # Redux Toolkit slices
    │   ├── hooks/          # TanStack Query hooks
    │   ├── services/api.ts # Typed axios client
    │   └── types/          # TypeScript interfacelar
    └── vite.config.ts
```

## 📝 License

MIT

---

**Muallif:** [@Abdulloh_77700](https://t.me/Abdulloh_77700)
