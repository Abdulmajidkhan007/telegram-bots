'use strict';

// Ishga tushirish: npm test (apps/api ichida) — avval tsc qiladi.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash, createHmac } = require('node:crypto');
const { verifyTelegramLogin, MAX_AUTH_AGE_SECONDS } = require('../dist/modules/auth/telegram-auth');

const BOT_TOKEN = '123456:TEST_ONLY_not_a_real_token';
const NOW = 1_790_000_000;

// Telegram widget'i qanday imzolasa, xuddi shunday imzolaymiz.
function sign(fields, token = BOT_TOKEN) {
  const dcs = Object.keys(fields).sort().map((k) => `${k}=${fields[k]}`).join('\n');
  const secret = createHash('sha256').update(token).digest();
  return { ...fields, hash: createHmac('sha256', secret).update(dcs).digest('hex') };
}

const base = { id: 222, first_name: 'Vali', username: 'vali', auth_date: NOW - 10 };

test("to'g'ri imzo qabul qilinadi", () => {
  const r = verifyTelegramLogin(sign(base), BOT_TOKEN, NOW);
  assert.deepEqual(r, { ok: true, user: { id: '222', firstName: 'Vali', lastName: undefined, username: 'vali' } });
});

// Regressiya: avval /auth/telegram faqat { telegramId, firstName } olib,
// hech narsani tekshirmasdan token berardi — istalgan odam boshqaning
// ID si bilan kira olardi.
test("imzosiz so'rov rad etiladi (eski hujum)", () => {
  const r = verifyTelegramLogin({ telegramId: '222', firstName: 'Hacker' }, BOT_TOKEN, NOW);
  assert.equal(r.ok, false);
});

test("imzodan keyin ID almashtirilsa rad etiladi", () => {
  const signed = sign(base);
  const r = verifyTelegramLogin({ ...signed, id: 111 }, BOT_TOKEN, NOW);
  assert.deepEqual(r, { ok: false, reason: 'Telegram imzosi mos kelmadi' });
});

test('boshqa bot tokeni bilan imzolangan maʼlumot rad etiladi', () => {
  const r = verifyTelegramLogin(sign(base, '999:OTHER_BOT'), BOT_TOKEN, NOW);
  assert.equal(r.ok, false);
});

test('eskirgan va kelajakdagi auth_date rad etiladi', () => {
  const old = sign({ ...base, auth_date: NOW - MAX_AUTH_AGE_SECONDS - 1 });
  assert.match(verifyTelegramLogin(old, BOT_TOKEN, NOW).reason, /eskirgan/);
  const future = sign({ ...base, auth_date: NOW + 3600 });
  assert.match(verifyTelegramLogin(future, BOT_TOKEN, NOW).reason, /kelajakda/);
});

test("Telegram qo'shgan qo'shimcha maydonlar ham imzoga kiradi", () => {
  const r = verifyTelegramLogin(sign({ ...base, photo_url: 'https://t.me/i/u.jpg', last_name: 'V' }), BOT_TOKEN, NOW);
  assert.equal(r.ok, true);
  assert.equal(r.user.lastName, 'V');
});

test("buzilgan hash formati — xato otmaydi, rad etadi", () => {
  for (const hash of ['', 'abc', 'zz'.repeat(32), 123]) {
    assert.equal(verifyTelegramLogin({ ...base, hash }, BOT_TOKEN, NOW).ok, false);
  }
});
