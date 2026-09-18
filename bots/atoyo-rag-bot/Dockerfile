FROM python:3.11-slim

WORKDIR /app

# Avval requirements — kod o'zgarganda qatlam keshi buzilmasin.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Embedding modeli birinchi ishga tushishda yuklanadi; keshni volume'da
# saqlaymiz, aks holda har restartda ~100 MB qayta yuklanadi.
ENV HF_HOME=/app/.cache

CMD ["python", "main.py"]
