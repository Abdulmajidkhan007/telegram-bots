'use strict';

// Muhit o'zgaruvchilarini o'qish va tekshirish. Noto'g'ri qiymat jim o'tkazilmaydi.

const path = require('path');

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

module.exports = { loadConfig, parseAdminIds, parseChannel };
