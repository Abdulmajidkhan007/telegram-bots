@echo off
chcp 65001 >nul
echo ========================================
echo    XarajatBot - Manual Start (Windows)
echo ========================================
echo.

REM Virtual muhitni tekshirish
if not exist "venv\Scripts\activate.bat" (
    echo Virtual muhit topilmadi. Yaratilmoqda...
    python -m venv venv
    call venv\Scripts\activate.bat
    echo API kutubxonalari o'rnatilmoqda...
    pip install -r api\requirements.txt
    echo Bot kutubxonalari o'rnatilmoqda...
    pip install -r bot\requirements.txt
) else (
    call venv\Scripts\activate.bat
)

REM .env faylini tekshirish
if not exist ".env" (
    echo XATO: .env fayli topilmadi!
    echo .env.example faylini .env ga nusxalang va to'ldiring.
    pause
    exit /b 1
)

echo API ishga tushmoqda (localhost:8000)...
start "XarajatBot API" cmd /k "call venv\Scripts\activate.bat && cd api && set PYTHONPATH=.. && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo 3 soniya kutilmoqda...
timeout /t 3 /nobreak >nul

echo Bot ishga tushmoqda...
start "XarajatBot Bot" cmd /k "call venv\Scripts\activate.bat && cd bot && set PYTHONPATH=.. && python main.py"

echo Dashboard ishga tushmoqda (localhost:5173)...
start "XarajatBot Dashboard" cmd /k "cd dashboard && npm run dev"

echo.
echo ========================================
echo    Hammasi ishga tushdi!
echo ========================================
echo    Dashboard:  http://localhost:5173
echo    API Docs:   http://localhost:8000/api/docs
echo ========================================
echo.
echo Oynalarni yopish uchun har birida Ctrl+C bosing
pause
