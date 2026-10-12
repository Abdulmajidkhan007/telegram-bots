# Railway (yoki istalgan Docker xosti) uchun. JSON ma'lumotlar Volume'da (DATA_DIR=/data).
FROM node:22-slim

ENV NODE_ENV=production \
    DATA_DIR=/data

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .

CMD ["node", "index.js"]
