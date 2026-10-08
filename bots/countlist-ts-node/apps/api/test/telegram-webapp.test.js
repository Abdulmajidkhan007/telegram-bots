'use strict';

// Ishga tushirish: npm test (apps/api ichida) — avval tsc qiladi.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const { verifyTelegramWebApp, MAX_AUTH_AGE_SECONDS } = require('../dist/modules/auth/telegram-auth');

const BOT_TOKEN = '123456:TEST_ONLY_not_a_real_token';
const NOW = 1_790_000_000;

// Telegram Mini App initData'ni qanday imzolasa, xuddi shunday (hujjatdagi algoritm).
function initData(fields, token = BOT_TOKEN) {
  const dcs = Object.keys(fields).sort().map((k) => `${k}=${fields[k]}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  const hash = createHmac('sha256', secret).update(dcs).digest('hex');
  return new URLSearchParams({ ...fields, hash }).toString();
}

const user = JSON.stringify({ id: 222, first_name: 'Vali', username: 'vali' });
const base = { query_id: 'AAH', user, auth_date: String(NOW - 10), signature: 'abc' };

test("Mini App: to'g'ri imzo qabul qilinadi", () => {
  const r = verifyTelegramWebApp(initData(base), BOT_TOKEN, NOW);
  assert.deepEqual(r, { ok: true, user: { id: '222', firstName: 'Vali', lastName: undefined, username: 'vali' } });
});

test("Mini App: user almashtirilsa rad etiladi", () => {
  const forged = initData(base).replace(encodeURIComponent('"id":222'), encodeURIComponent('"id":111'));
  assert.notEqual(forged, initData(base));
  assert.deepEqual(verifyTelegramWebApp(forged, BOT_TOKEN, NOW), { ok: false, reason: 'Telegram imzosi mos kelmadi' });
});

test('Mini App: boshqa bot tokeni bilan imzolangan rad etiladi', () => {
  const r = verifyTelegramWebApp(initData(base, '999:OTHER'), BOT_TOKEN, NOW);
  assert.equal(r.ok, false);
});

// Widget algoritmi (sha256(token)) bilan imzolangan ma'lumot Mini App sifatida o'tmasin.
test("Mini App: hash yo'q / bo'sh / satr emas — rad", () => {
  for (const bad of ['', 'user=%7B%7D', undefined, { user }, 'hash=zz']) {
    assert.equal(verifyTelegramWebApp(bad, BOT_TOKEN, NOW).ok, false, String(bad));
  }
});

test('Mini App: eskirgan va kelajakdagi auth_date rad etiladi', () => {
  const old = initData({ ...base, auth_date: String(NOW - MAX_AUTH_AGE_SECONDS - 1) });
  assert.equal(verifyTelegramWebApp(old, BOT_TOKEN, NOW).ok, false);
  const future = initData({ ...base, auth_date: String(NOW + 3600) });
  assert.equal(verifyTelegramWebApp(future, BOT_TOKEN, NOW).ok, false);
});
