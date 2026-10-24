'use strict';

// Muhit o'zgaruvchilarini o'qish va tekshirish. Noto'g'ri qiymat jim o'tkazilmaydi.

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// README «cp .env.example .env → npm start» deydi: .env ni bot papkasidan o'qiymiz
// (cwd qayerda bo'lishidan qat'i nazar). Railway'da fayl yo'q — env tayyor, mavjudi
// ustidan yozilmaydi.
const ENV_FILE = path.join(__dirname, '..', '.env');

function loadEnvFile(file = ENV_FILE, env = process.env) {
  if (!fs.existsSync(file)) return false;
  const res = dotenv.config({ path: file, processEnv: env });
  if (res.error) throw new Error(`.env o'qilmadi (${file}): ${res.error.message}`);
  return true;
}

function parseAdminIds(raw) {
  const ids = [];
  for (const part of String(raw || '').split(',')) {
    const s = part.trim();
    if (!s) continue;
    if (!/^\d{1,15}$/.test(s)) {
      throw new Error(`ADMIN_IDS da noto'g'ri qiymat: "${s}" (faqat raqamlar, vergul bilan)`);
    }
    ids.push(Number(s));
  }
  return ids;
}

// "@kanal", "kanal" -> "@kanal"; bo'sh -> null (obuna tekshirilmaydi).
function parseChannel(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  const name = s.replace(/^@/, '');
  if (!/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(name)) {
    throw new Error(`CHANNEL_USERNAME noto'g'ri: "${s}" (masalan: @kanal_nomi)`);
  }
  return '@' + name;
}

function loadConfig(env = process.env) {
  const token = env.BOT_TOKEN;
  if (!token) throw new Error('BOT_TOKEN muhit o‘zgaruvchisi berilmagan.');
  return {
    token,
    channel: parseChannel(env.CHANNEL_USERNAME),
    adminIds: parseAdminIds(env.ADMIN_IDS),
    cardNumber: (env.CARD_NUMBER || '').trim(),
    cardHolder: (env.CARD_HOLDER || '').trim(),
    dataFile: path.join(env.DATA_DIR || path.join(__dirname, '..', 'data'), 'db.json'),
  };
}

module.exports = { loadConfig, loadEnvFile, ENV_FILE, parseAdminIds, parseChannel };
