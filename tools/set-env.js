#!/usr/bin/env node
'use strict';

// .env qiymatlarini papkama-papka yurmasdan o'rnatish.
//
//   node tools/set-env.js <bot-id|all> KEY=qiymat [KEY=qiymat ...]
//
// `all` — kalit qaysi botlarda mavjud bo'lsa, o'shalarning hammasida
// almashtiriladi. ADMIN_ID yoki GEMINI_API_KEY kabi umumiy qiymatlar uchun.

const fs = require('fs');
const path = require('path');
const { validateRegistry, setEnvValue } = require('./registry');

const ROOT = path.resolve(__dirname, '..');
const BOTS_DIR = path.join(ROOT, 'bots');

function loadBots() {
  const reestr = JSON.parse(fs.readFileSync(path.join(ROOT, 'bots.json'), 'utf8'));
  validateRegistry(reestr);
  return reestr.bots.map((b) => ({ ...b, dir: path.join(BOTS_DIR, b.id) }));
}

function main(argv) {
  const [target, ...pairs] = argv;

  if (!target || pairs.length === 0) {
    console.log(
      '\nQo\'llanish:\n' +
      '  npm run env -- <bot-id|all> KEY=qiymat [KEY=qiymat ...]\n\n' +
      'Misollar:\n' +
      '  npm run env -- idfinder-bot BOT_TOKEN=8199999999:AAH-token\n' +
      '  npm run env -- all ADMIN_ID=123456789\n',
    );
    process.exitCode = 1;
    return;
  }

  const juftliklar = pairs.map((p) => {
    const i = p.indexOf('=');
    if (i <= 0) throw new Error(`"${p}" KEY=qiymat shaklida emas`);
    return [p.slice(0, i), p.slice(i + 1)];
  });

  const bots = loadBots();
  const nishonlar = target === 'all' ? bots : bots.filter((b) => b.id === target);

  if (nishonlar.length === 0) {
    throw new Error(`"${target}" topilmadi. Ro'yxat: npm run list`);
  }

  let ozgarish = 0;

  for (const bot of nishonlar) {
    const envFile = path.join(bot.dir, '.env');
    if (!fs.existsSync(envFile)) {
      if (target !== 'all') console.log(`⚠️  ${bot.id}: .env yo'q — avval "npm run setup"`);
      continue;
    }

    let matn = fs.readFileSync(envFile, 'utf8');
    const qoshilgan = [];

    for (const [key, value] of juftliklar) {
      // "all" rejimida faqat mavjud kalitlarga tegamiz: har botga begona
      // o'zgaruvchi qo'shib chiqish chalkashlik keltiradi.
      const bormi = new RegExp(`^\\s*${key}\\s*=`, 'm').test(matn);
      if (target === 'all' && !bormi) continue;

      matn = setEnvValue(matn, key, value);
      qoshilgan.push(key);
    }

    if (qoshilgan.length === 0) continue;

    fs.writeFileSync(envFile, matn);
    console.log(`✅ ${bot.id}: ${qoshilgan.join(', ')}`);
    ozgarish += 1;
  }

  if (ozgarish === 0) {
    console.log('Hech nima o\'zgarmadi.');
  } else {
    console.log(`\n${ozgarish} ta .env yangilandi. Tekshirish: npm run doctor\n`);
  }
}

try {
  main(process.argv.slice(2));
} catch (err) {
  console.error(`\n❌ ${err.message}\n`);
  process.exitCode = 1;
}
