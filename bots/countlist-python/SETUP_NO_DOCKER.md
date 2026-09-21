# Docker siz o'rnatish (Manual Setup)

## Kerakli dasturlar

| Dastur | Versiya | Yuklab olish |
|--------|---------|--------------|
| Python | 3.12+ | https://www.python.org/downloads/ |
| Node.js | 18+ | https://nodejs.org/ |
| PostgreSQL | 16 | https://www.postgresql.org/download/ |
| Redis | 7 | https://redis.io/download (Windows: https://github.com/tporadowski/redis/releases) |

---

## 1. PostgreSQL o'rnatish va sozlash

### Windows
1. https://www.postgresql.org/download/windows/ dan yuklab o'rnating
2. O'rnatish paytida parol so'rasa `expensepass` deb yozing (yoki xohlaganingizni, keyin .env ga yozing)
3. SQL Shell (psql) ni oching:

```sql
CREATE DATABASE expensedb;
CREATE USER expenseuser WITH PASSWORD 'expensepass';
GRANT ALL PRIVILEGES ON DATABASE expensedb TO expenseuser;
```

### Ubuntu/Debian
```bash
sudo apt install postgresql postgresql-client
sudo -u postgres psql
```
```sql
CREATE DATABASE expensedb;
CREATE USER expenseuser WITH PASSWORD 'expensepass';
GRANT ALL PRIVILEGES ON DATABASE expensedb TO expenseuser;
\q
```

### macOS
```bash
brew install postgresql@16
brew services start postgresql@16
psql postgres
```
```sql
CREATE DATABASE expensedb;
CREATE USER expenseuser WITH PASSWORD 'expensepass';
GRANT ALL PRIVILEGES ON DATABASE expensedb TO expenseuser;
\q
```

---

## 2. Redis o'rnatish

### Windows
1. https://github.com/tporadowski/redis/releases dan `Redis-x64-*.msi` yuklab o'rnating
2. Service sifatida avtomatik ishga tushadi

Yoki Windows Service o'rniga oddiy ishga tushirish:
```cmd
redis-server
```

### Ubuntu/Debian
```bash
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

### macOS
```bash
brew install redis
brew services start redis
```

Redis ishlayotganini tekshirish:
```bash
redis-cli ping
# PONG deb javob berishi kerak
```

---

## 3. Loyihani yuklab olish

```bash
git clone https://github.com/abdulmajidkhan007/countlist.git
cd countlist
```

---

## 4. `.env` faylini yaratish

Loyiha papkasida `.env` fayli yarating:

```bash
# Windows
copy .env.example .env

# Linux/macOS
cp .env.example .env
```

`.env` faylini oching va quyidagicha to'ldiring:

```env
BOT_TOKEN=BU_YERGA_BOTFATHER_TOKENINGIZNI_YOZING

POSTGRES_DB=expensedb
POSTGRES_USER=expenseuser
POSTGRES_PASSWORD=expensepass

REDIS_PASSWORD=

SECRET_KEY=BU_YERGA_TASODIFIY_UZUN_SATR_YOZING  # openssl rand -hex 32

DATABASE_URL=postgresql+asyncpg://expenseuser:expensepass@localhost:5432/expensedb
REDIS_URL=redis://:@localhost:6379/0

ENVIRONMENT=development
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

> **Muhim**: `REDIS_PASSWORD` bo'sh qoldirilsa `REDIS_URL=redis://:@localhost:6379/0` deb yozing.
> Agar Redis parol bilan sozlangan bo'lsa: `REDIS_URL=redis://:PAROLINGIZ@localhost:6379/0`

---

## 5. API (FastAPI) ishga tushirish

```bash
# Loyiha papkasida (countlist/)

# Virtual muhit yaratish
python -m venv venv

# Aktivlashtirish
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Kutubxonalarni o'rnatish
pip install -r api/requirements.txt

# API ni ishga tushirish
cd api
PYTHONPATH=.. uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Windows uchun (PowerShell):**
```powershell
cd api
$env:PYTHONPATH=".."
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Windows uchun (CMD):**
```cmd
cd api
set PYTHONPATH=..
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API ishlayotganini tekshirish:
```
http://localhost:8000/health        → {"status": "ok"}
http://localhost:8000/api/docs      → Swagger UI
```

---

## 6. Bot (aiogram) ishga tushirish

**Yangi terminal oching** (API hali ishlayotgan bo'lsin):

```bash
cd countlist   # loyiha papkasiga qaytish

# Agar venv aktivlashtirilmagan bo'lsa:
# Windows: venv\Scripts\activate
# Linux/macOS: source venv/bin/activate

pip install -r bot/requirements.txt

# Bot ni ishga tushirish
cd bot
PYTHONPATH=.. python main.py
```

**Windows CMD:**
```cmd
cd bot
set PYTHONPATH=..
python main.py
```

**Windows PowerShell:**
```powershell
cd bot
$env:PYTHONPATH=".."
python main.py
```

Bot muvaffaqiyatli ishga tushsa:
```
INFO - Bot ishga tushdi: @YourBotUsername
```

---

## 7. Dashboard (React) ishga tushirish

**Yana bir yangi terminal oching**:

```bash
cd countlist/dashboard

npm install
npm run dev
```

Dashboard ochiladi:
```
http://localhost:5173
```

---

## 8. Loyihani ishlatish

Hammasi ishga tushgandan keyin:

| Servis | URL |
|--------|-----|
| **Dashboard** | http://localhost:5173 |
| **API Docs** | http://localhost:8000/api/docs |
| **Bot** | Telegram'da @YourBotUsername ga boring |

### Birinchi marta kirish

1. Telegram botga `/start` yuboring
2. Bot sizni ro'yxatdan o'tkazadi va dashboard uchun token beradi
3. Dashboard'da login sahifasida telegram ID ingizni kiriting

---

## Muammolar va yechimlar

### PostgreSQL ulanmayapti
```
asyncpg.exceptions.InvalidPasswordError
```
PostgreSQL parolini tekshiring. `pg_hba.conf` da autentifikatsiya `md5` yoki `scram-sha-256` bo'lishi kerak.

### Redis ulanmayapti
```
redis.exceptions.ConnectionError
```
Redis ishlayotganini tekshiring: `redis-cli ping` → `PONG` bo'lishi kerak.

### `ModuleNotFoundError: No module named 'api'`
`PYTHONPATH=..` qo'shishni unutmang. Bot va API `countlist/` papkasidan ishga tushirilishi kerak.

### Port band
```
OSError: [Errno 98] Address already in use
```
```bash
# 8000 portni kim ishlatayotganini ko'rish
# Windows:
netstat -ano | findstr :8000
# Linux/macOS:
lsof -i :8000
```

### Windows'da `venv\Scripts\activate` ishlamayapti
PowerShell'da:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## Avtomatik ishga tushirish skripti

### Windows (`start.bat`)
```bat
@echo off
echo Starting XarajatBot...

start "API" cmd /k "cd api && set PYTHONPATH=.. && uvicorn main:app --reload --port 8000"
timeout /t 3
start "Bot" cmd /k "cd bot && set PYTHONPATH=.. && python main.py"
start "Dashboard" cmd /k "cd dashboard && npm run dev"

echo All services started!
echo Dashboard: http://localhost:5173
echo API Docs:  http://localhost:8000/api/docs
```

### Linux/macOS (`start.sh`)
```bash
#!/bin/bash
source venv/bin/activate

echo "API ishga tushmoqda..."
cd api && PYTHONPATH=.. uvicorn main:app --reload --port 8000 &
API_PID=$!

sleep 2

echo "Bot ishga tushmoqda..."
cd ../bot && PYTHONPATH=.. python main.py &
BOT_PID=$!

echo "Dashboard ishga tushmoqda..."
cd ../dashboard && npm run dev &
DASH_PID=$!

echo "Hammasi ishga tushdi!"
echo "Dashboard: http://localhost:5173"
echo "API Docs:  http://localhost:8000/api/docs"
echo ""
echo "To'xtatish uchun Ctrl+C bosing"

wait
```
