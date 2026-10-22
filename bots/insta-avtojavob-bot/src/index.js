'use strict';

// Instagram avto-javob qo'llanma-boti. Polling rejimi; holat data/db.json da.
// MUHIM: bot Instagram parolini, kod yoki karta ma'lumotini HECH KIMDAN so'ramaydi.

const TelegramBot = require('node-telegram-bot-api');
const { loadConfig } = require('./config');
const { Store } = require('./store');
const { createHandlers } = require('./handlers');
const { IS_PLACEHOLDER } = require('./guide-text');

let config;
try {
  config = loadConfig();
} catch (err) {
  console.error('Xato:', err.message);
  console.error('Ishga tushirish: BOT_TOKEN=... node src/index.js  (.env.example ga qarang)');
  process.exit(1);
}

if (!config.adminIds.length) console.warn('Ogohlantirish: ADMIN_IDS bo‘sh — to‘lovni tasdiqlovchi yo‘q.');
if (!config.channel) console.warn('Ogohlantirish: CHANNEL_USERNAME bo‘sh — majburiy obuna o‘chiq.');
if (IS_PLACEHOLDER) console.warn('Ogohlantirish: pullik qo‘llanma matni NAMUNA (src/guide-text.js).');

const store = new Store(config.dataFile);
const bot = new TelegramBot(config.token, { polling: true });
const h = createHandlers({ bot, store, config });

// Handler xatosi jim yutilmasin va polling'ni yiqitmasin.
const safe = (fn) => (...args) =>
  fn(...args).catch((err) => console.error('handler xato:', err.stack || err));

bot.onText(/^\/start\b/, safe(h.onStart));
bot.onText(/^\/admin\b/, safe(h.onAdmin));
bot.on('callback_query', safe(h.onCallback));
bot.on('message', safe(h.onMessage));
bot.on('polling_error', (err) => console.error('polling_error:', err.message || err));

console.log('Bot ishga tushdi (polling). To‘xtatish: Ctrl+C');
