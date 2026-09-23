'use strict';

// bots.json ustidagi TOZA (I/O siz) mantiq. Shu sabab test qilish oson —
// tools/registry.test.js faqat shu modulni sinaydi.

const VALID_RUNTIMES = ['node', 'python'];

/**
 * bots.json tarkibini tekshiradi. Xato bo'lsa — throw (jim yutilmaydi).
 * @param {unknown} raw JSON.parse natijasi
 * @returns {Array<object>} tekshirilgan botlar ro'yxati
 */
function validateRegistry(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.bots)) {
    throw new Error('bots.json noto\'g\'ri: yuqori darajada "bots" massivi kutilgan');
  }
  const seen = new Set();
  for (const bot of raw.bots) {
    if (!bot || typeof bot.id !== 'string' || !bot.id) {
      throw new Error('bots.json: har bir botda bo\'sh bo\'lmagan "id" bo\'lishi shart');
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(bot.id)) {
      throw new Error(`bots.json: "${bot.id}" — id faqat kichik harf, raqam va "-" dan iborat bo'lsin`);
    }
    if (seen.has(bot.id)) throw new Error(`bots.json: "${bot.id}" id takrorlangan`);
    seen.add(bot.id);
    if (!VALID_RUNTIMES.includes(bot.runtime)) {
      throw new Error(`bots.json: "${bot.id}" — runtime "${bot.runtime}" noma'lum (${VALID_RUNTIMES.join('/')})`);
    }
    assertSteps(bot.id, 'install', bot.install);
    assertSteps(bot.id, 'start', bot.start);
    if (bot.start.length === 0) {
      throw new Error(`bots.json: "${bot.id}" — "start" bo'sh bo'lmasligi kerak`);
    }
  }
  return raw.bots;
}

function assertSteps(id, field, steps) {
  if (!Array.isArray(steps)) {
    throw new Error(`bots.json: "${id}" — "${field}" massiv bo'lishi kerak`);
  }
  for (const step of steps) {
    if (!Array.isArray(step) || step.length === 0 || step.some((a) => typeof a !== 'string')) {
      throw new Error(`bots.json: "${id}" — "${field}" ichidagi har qadam bo'sh bo'lmagan satrlar massivi bo'lsin`);
    }
  }
}

/**
 * Foydalanuvchi bergan nishonni (target) botlar ro'yxatiga aylantiradi.
 * "all" → autoStart:true bo'lganlar (--all bilan hammasi).
 * @param {string} target bot id yoki "all"
 * @param {Array<object>} bots
 * @param {{includeManual?: boolean}} [opts]
 */
function resolveTargets(target, bots, opts = {}) {
  if (target === 'all') {
    const chosen = opts.includeManual ? bots : bots.filter((b) => b.autoStart !== false);
    if (chosen.length === 0) {
      throw new Error('Avtomatik ishga tushadigan bot yo\'q (--all bilan urinib ko\'ring)');
    }
    return chosen;
  }
  const bot = bots.find((b) => b.id === target);
  if (!bot) {
    throw new Error(`"${target}" nomli bot yo'q. Mavjudlari: ${bots.map((b) => b.id).join(', ')}`);
  }
  return [bot];
}

/** Log satrlarini tekislash uchun eng uzun id uzunligi. */
function padWidth(bots) {
  return bots.reduce((max, b) => Math.max(max, b.id.length), 0);
}

// .env dagi qaysi kalitlar hali to'ldirilmagan.
//
// Faqat fayl borligini tekshirish yetarli emas edi: `setup` .env.example dan
// nusxa oladi, shuning uchun fayl DARROV paydo bo'ladi. Ichida esa namuna
// qiymat turadi — idfinder-bot da u hatto HAQIQIY tokenga o'xshaydi
// (`123456:ABC-DEF...`). Bot 401 Unauthorized berardi, sababi esa
// hech qayerda ko'rinmasdi.
//
// Shuning uchun uch xil belgi tekshiriladi:
//   1. qiymat bo'sh
//   2. qiymat ochiq-oydin joy egallovchi (BU_YERGA..., your_key_here, ...)
//   3. qiymat .env.example dagisi bilan AYNAN bir xil — ya'ni tegilmagan.
//      Bu faqat maxfiy ko'rinishli kalitlarga qo'llanadi, aks holda
//      DATA_DIR=/app/data kabi to'g'ri standart qiymatlar ham ogohlantirardi.
const PLACEHOLDER = /^(BU_YERGA|your_|YOUR_|sizning_|SIZNING_|xxx|XXX|<|CHANGE|REPLACE)/;
const MAXFIY_KALIT = /(TOKEN|KEY|SECRET|PASSWORD|PASS|HASH|SESSION|DATABASE_URL|WEBHOOK|API_ID)/i;

function parseEnv(text) {
  const map = new Map();
  for (const line of String(text || '').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    map.set(key, value);
  }
  return map;
}

function unfilledKeys(envText, exampleText) {
  const example = parseEnv(exampleText);
  const bosh = [];

  for (const [key, value] of parseEnv(envText)) {
    if (value === '' || PLACEHOLDER.test(value)) {
      bosh.push(key);
      continue;
    }
    // Namunadagi qiymat o'zgarmagan — maxfiy kalitlar uchun bu xato belgisi.
    if (MAXFIY_KALIT.test(key) && example.has(key) && example.get(key) === value) {
      bosh.push(key);
    }
  }
  return bosh;
}

// .env matnidagi bitta kalit qiymatini almashtiradi.
//
// Izohlar, tartib va boshqa qatorlar tegilmaydi — .env.example dagi
// tushuntirishlar foydalanuvchiga keyin ham kerak bo'ladi. Kalit topilmasa,
// oxiriga qo'shiladi.
function setEnvValue(text, key, value) {
  const lines = String(text || '').split('\n');
  const re = new RegExp(`^\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=`);
  let topildi = false;

  const yangi = lines.map((line) => {
    if (topildi || !re.test(line)) return line;
    topildi = true;
    return `${key}=${value}`;
  });

  if (!topildi) {
    // Oxirida bo'sh qator bo'lsa, kalitni o'sha bo'shliqdan oldin qo'yamiz.
    while (yangi.length && yangi[yangi.length - 1].trim() === '') yangi.pop();
    yangi.push(`${key}=${value}`, '');
  }
  return yangi.join('\n');
}

module.exports = {
  setEnvValue,
  unfilledKeys, validateRegistry, resolveTargets, padWidth, VALID_RUNTIMES };
