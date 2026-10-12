# Railway (yoki istalgan Docker xosti) uchun. SQLite baza konteyner ichida emas —
# Volume'da turadi (DATA_DIR=/data), aks holda har deploy'da kompaniyalar va CV'lar o'chadi.
FROM python:3.14-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    DATA_DIR=/data

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .

CMD ["python", "-m", "hr_bot.main"]
