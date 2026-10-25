'use strict';

// Muhit o'zgaruvchilarini o'qish va tekshirish. Noto'g'ri qiymat jim o'tkazilmaydi.

const fs = require('fs');
const path = require('path');
const { parseEnv } = require('util');

// README «cp .env.example .env → npm start» deydi: .env ni bot papkasidan o'qiymiz
// (cwd qayerda bo'lishidan qat'i nazar). Railway'da fayl yo'q — env tayyor, mavjudi
// ustidan yozilmaydi. Node'ning o'z parseEnv'i (20.12+): root CI bot testlarini
// `npm install` siz ishga tushiradi, tashqi paket bo'lsa test yiqiladi.
const ENV_FILE = path.join(__dirname, '..', '.env');

function loadEnvFile(file = ENV_FILE, env = process.env) {
  if (!fs.existsSync(file)) return false;
  let parsed;
  try {
    parsed = parseEnv(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`.env o'qilmadi (${file}): ${err.message}`);
  }
  for (const [key, value] of Object.entries(parsed)) {
    if (env[key] === undefined) env[key] = value;
  }
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
