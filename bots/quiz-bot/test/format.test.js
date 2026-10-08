'use strict';
// Ishga tushirish: npm test (quiz-bot papkasida). Telegram'ga chiqmaydi.
const test = require('node:test');
const assert = require('node:assert');
const { parseCount, countPrompt, pollText, MAX_CUSTOM_COUNT, POLL_MAX } = require('../src/format');

test('parseCount: son, chegaralar va bo\'limdagi savollar soni', () => {
  assert.deepStrictEqual(parseCount('34', 300), { n: 34 });
  assert.deepStrictEqual(parseCount('  7 ', 300), { n: 7 });
  // 50 so'raldi, Aralash'da 34 ta bor — rad etilmaydi, bori beriladi
  const r = parseCount('50', 34);
  assert.strictEqual(r.n, 34);
  assert.match(r.note, /34/);
  for (const bad of ['', 'ellik', '5.5', '-3', '1e3', '12 ta']) assert.ok(parseCount(bad, 300).error, bad);
  assert.ok(parseCount('0', 300).error);
  assert.ok(parseCount(String(MAX_CUSTOM_COUNT + 1), 500).error);
  assert.deepStrictEqual(parseCount(String(MAX_CUSTOM_COUNT), 500), { n: MAX_CUSTOM_COUNT });
});

test('countPrompt: yuqori chegara bo\'limdagi savollardan oshmaydi', () => {
  assert.match(countPrompt(34), /1–34/);
  assert.match(countPrompt(500), new RegExp(`1–${MAX_CUSTOM_COUNT}`));
});

test("pollText: bo'lim nomi ko'rinadi va matn 300 belgidan oshmaydi", () => {
  const t = pollText(3, 20, '🎨 Frontend › React', 'useState nima?');
  assert.strictEqual(t, '❓ 3/20  •  🎨 Frontend › React\nuseState nima?');
  assert.strictEqual(pollText(1, 5, null, 'Savol'), '❓ 1/5  •  Savol');

  // Uzun savol: bo'lim nomi qisqaradi, savol butun qoladi
  const longQ = 'x'.repeat(260);
  const t2 = pollText(100, 100, 'B'.repeat(80), longQ);
  assert.ok(t2.length <= POLL_MAX, t2.length);
  assert.ok(t2.endsWith('\n' + longQ));
  assert.ok(t2.includes('…'));

  // Juda uzun (admin qo'shgan) savol ham Telegram chegarasidan oshmaydi
  const t3 = pollText(1, 5, 'Bo\'lim', 'y'.repeat(400));
  assert.ok(t3.length <= POLL_MAX);
});
