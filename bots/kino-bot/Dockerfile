# Railway (yoki istalgan Docker xosti) uchun. Baza konteyner ichida emas —
# Volume'da turadi (DATA_DIR=/data), aks holda har deploy'da kinolar o'chadi.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    DATA_DIR=/data

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .

CMD ["python", "main.py"]
