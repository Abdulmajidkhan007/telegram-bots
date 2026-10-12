# Railway (yoki istalgan Docker xosti) uchun. ffmpeg — TTS PCM/WAV → OGG/Opus (voice) uchun.
# Limit bazasi Volume'da (DATA_DIR=/data), aks holda har deploy'da kunlik hisob nolga tushadi.
FROM python:3.14-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    DATA_DIR=/data

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .

CMD ["python", "-m", "ovoz_bot.main"]
