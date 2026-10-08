'use strict';
// Ishga tushirish: npm test (quiz-bot papkasida). Telegram'ga chiqmaydi.
const test = require('node:test');
const assert = require('node:assert');
const { grid } = require('../src/paging');
const { directionsRows, subsRows } = require('../src/menus');

const items = n => Array.from({ length: n }, (_, i) => ({ text: `b${i}`, callback_data: `x:${i}` }));

test("grid: 6 tadan, 2 qator x 3 ustun, navigatsiya faqat kerak bo'lsa", () => {
  const one = grid(items(5), 0, 'p');
  assert.deepStrictEqual(one.rows.map(r => r.length), [3, 2]);
  assert.strictEqual(one.pages, 1);

  const first = grid(items(14), 0, 'p');
  assert.deepStrictEqual(first.rows.slice(0, 2).map(r => r.length), [3, 3]);
  assert.deepStrictEqual(first.rows[2].map(b => b.callback_data), ['noop', 'p:1']);   // ⬅️ yo'q

  const last = grid(items(14), 2, 'p');
  assert.deepStrictEqual(last.rows[0].map(b => b.text), ['b12', 'b13']);
  assert.deepStrictEqual(last.rows[1].map(b => b.callback_data), ['p:1', 'noop']);    // ➡️ yo'q
});

test('grid: chegaradan tashqari va buzuq sahifa raqami yiqitmaydi', () => {
  assert.strictEqual(grid(items(14), 99, 'p').page, 2);
  assert.strictEqual(grid(items(14), -3, 'p').page, 0);
  assert.strictEqual(grid(items(14), 'abc', 'p').page, 0);
  assert.strictEqual(grid([], 0, 'p').rows.length, 0);
});

test("subsRows: aralash tugmasi 2+ bo'limda, jami savollar soni bilan", () => {
  const cb = { pick: k => `sub:f:${k}`, nav: 'dirp:f', mix: 'sub:f:__mix', back: 'back:dirs' };
  const rows = subsRows([{ key: 'a', label: 'A', count: 3 }, { key: 'b', label: 'B', count: 4 }], 0, cb);
  const flat = rows.flat();
  assert.ok(flat.some(b => b.callback_data === 'sub:f:__mix' && b.text.includes('7')));
  assert.strictEqual(flat[flat.length - 1].callback_data, 'back:dirs');

  const single = subsRows([{ key: 'a', label: 'A', count: 3 }], 0, cb).flat();
  assert.ok(!single.some(b => b.callback_data === 'sub:f:__mix'));
});

test("callback_data Telegram chegarasidan (64 bayt) oshmaydi", () => {
  // Real kalitlar uzunligi questions.test.js da cheklanadi (eng uzun: tm:<dir>:<sub>:20:60).
  const dk = 'k'.repeat(20), sk = 's'.repeat(30);
  const dirs = [{ key: dk, label: 'L', emoji: '📚' }];
  const subs = [{ key: sk, label: 'S', count: 1 }, { key: 't', label: 'T', count: 1 }];
  const all = [
    ...directionsRows(dirs, 0, { pick: k => `dir:${k}`, nav: 'dirs' }).flat(),
    ...subsRows(subs, 0, { pick: k => `sub:${dk}:${k}`, nav: `dirp:${dk}`, mix: `sub:${dk}:__mix`, back: 'b' }).flat(),
  ];
  for (const b of all) assert.ok(Buffer.byteLength(b.callback_data) <= 64, b.callback_data);
});
