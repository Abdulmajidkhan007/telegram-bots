#!/bin/bash
set -e

echo "========================================"
echo "   XarajatBot - Manual Start (Linux/Mac)"
echo "========================================"

# .env faylini tekshirish
if [ ! -f ".env" ]; then
    echo "XATO: .env fayli topilmadi!"
    echo "cp .env.example .env && nano .env"
    exit 1
fi

# Virtual muhitni tekshirish
if [ ! -f "venv/bin/activate" ]; then
    echo "Virtual muhit yaratilmoqda..."
    python3 -m venv venv
    source venv/bin/activate
    echo "Kutubxonalar o'rnatilmoqda..."
    pip install -r api/requirements.txt
    pip install -r bot/requirements.txt
else
    source venv/bin/activate
fi

# Dashboard node_modules
if [ ! -d "dashboard/node_modules" ]; then
    echo "npm install ishga tushmoqda..."
    cd dashboard && npm install && cd ..
fi

cleanup() {
    echo ""
    echo "To'xtatilmoqda..."
    kill $API_PID $BOT_PID $DASH_PID 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

echo "API ishga tushmoqda (localhost:8000)..."
cd api && PYTHONPATH=.. uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
API_PID=$!
cd ..

sleep 3

echo "Bot ishga tushmoqda..."
cd bot && PYTHONPATH=.. python main.py &
BOT_PID=$!
cd ..

echo "Dashboard ishga tushmoqda (localhost:5173)..."
cd dashboard && npm run dev &
DASH_PID=$!
cd ..

echo ""
echo "========================================"
echo "    Hammasi ishga tushdi!"
echo "========================================"
echo "    Dashboard:  http://localhost:5173"
echo "    API Docs:   http://localhost:8000/api/docs"
echo "========================================"
echo "To'xtatish: Ctrl+C"

wait
