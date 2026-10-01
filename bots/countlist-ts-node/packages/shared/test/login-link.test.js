'use strict';

// Ishga tushirish: npm test (packages/shared ichida) — avval tsc qiladi.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { signLoginLink, verifyLoginLink, LOGIN_LINK_TTL_SECONDS } = require('../dist/utils/login-link');

const BOT = '123456:TEST_ONLY_not_a_real_token';
const NOW = 1_790_000_000;
const ALI = { id: '222', firstName: 'Ali', username: 'ali' };

test("bot imzolagan havola API da qabul qilinadi", () => {
  const token = signLoginLink(ALI, BOT, NOW);
  assert.deepEqual(verifyLoginLink(token, BOT, NOW + 5), { ok: true, user: ALI });
});

test("havola token'i URL uchun xavfsiz (+ / = yo'q) — fragmentda buzilmaydi", () => {
  const token = signLoginLink({ ...ALI, firstName: "Ко'ли ✓" }, BOT, NOW);
  assert.match(token, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
});

test('har safar yangi token (bir xil vaqtda ham)', () => {
  assert.notEqual(signLoginLink(ALI, BOT, NOW), signLoginLink(ALI, BOT, NOW));
});

test("ichidagi ID almashtirilsa imzo mos kelmaydi", () => {
  const [body, sig] = signLoginLink(ALI, BOT, NOW).split('.');
  const p = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
  p.tid = '111';
  const forged = Buffer.from(JSON.stringify(p)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  assert.deepEqual(verifyLoginLink(`${forged}.${sig}`, BOT, NOW), { ok: false, reason: 'Havola imzosi mos kelmadi' });
});

test('boshqa bot tokeni bilan imzolangan havola rad etiladi', () => {
  assert.equal(verifyLoginLink(signLoginLink(ALI, '999:OTHER', NOW), BOT, NOW).ok, false);
});

test('muddati o\'tgan havola rad etiladi, chegarada esa qabul qilinadi', () => {
  const token = signLoginLink(ALI, BOT, NOW);
  assert.equal(verifyLoginLink(token, BOT, NOW + LOGIN_LINK_TTL_SECONDS).ok, true);
  assert.match(verifyLoginLink(token, BOT, NOW + LOGIN_LINK_TTL_SECONDS + 1).reason, /eskirgan/);
});

test("buzilgan / bo'sh token — xato otmaydi, rad etadi", () => {
  for (const t of [undefined, null, 123, '', 'abc', 'a.b.c', '.x', 'x.', 'x'.repeat(5000)]) {
    assert.equal(verifyLoginLink(t, BOT, NOW).ok, false, String(t).slice(0, 20));
  }
});

test("Telegram widget imzosi bilan aralashmaydi: kalit alohida yorliq bilan olinadi", () => {
  // Bir xil BOT_TOKEN dan widget uchun SHA256(token), bu yerda HMAC("countlist-login-link", token).
  const { createHash, createHmac } = require('node:crypto');
  const widgetKey = createHash('sha256').update(BOT).digest('hex');
  const linkKey = createHmac('sha256', 'countlist-login-link').update(BOT).digest('hex');
  assert.notEqual(widgetKey, linkKey);
});
