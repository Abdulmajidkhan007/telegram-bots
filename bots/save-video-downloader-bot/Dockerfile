# Railway (yoki istalgan Docker xosti) uchun.
# ffmpeg — apt'dan (barqaror); yt-dlp va gallery-dl — postinstall (scripts/fetch-tools.mjs)
# eng yangi relizni bin/ ga yuklaydi: YouTube tez-tez o'zgaradi, eski yt-dlp tez sinadi.
FROM node:22-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg curl ca-certificates xz-utils \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    DATA_DIR=/data \
    DOWNLOADS_DIR=/tmp/downloads

WORKDIR /app
COPY package.json package-lock.json ./
COPY scripts ./scripts
RUN npm ci --omit=dev
COPY . .

CMD ["node", "src/bot.js"]
