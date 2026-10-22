'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseMultiEntry, MAX_MULTI_ENTRIES } = require('../dist');

const TODAY = { year: 2026, month: 10, day: 13 };
const ok = (text) => {
  const r = parseMultiEntry(text, TODAY);
  assert.ok(r && r.ok, `ko'p rejim kutilgan: ${text}`);
  return r.entries;
};

test('skrinshot misoli: 4 ta xarajat, jami 147000', () => {
  const e = ok("27000ga banan, 31000ga non, 48000ga kola, 41000ga go'sht");
  assert.equal(e.length, 4);
  assert.ok(e.every((x) => x.kind === 'expense'));
  assert.equal(e.reduce((s, x) => s + x.amount, 0), 147000);
  assert.deepEqual(e.map((x) => x.description), ['banan', 'non', 'kola', "go'sht"]);
});

test('"1,5 mln" dagi vergul bo\'luvchi emas — bitta yozuv, ko\'p rejim yo\'q', () => {
  assert.equal(parseMultiEntry('1,5 mln remont', TODAY), null);
  assert.equal(parseMultiEntry('remont 1,5 mln', TODAY), null);
});

test('vergulli summa boshqa bo\'lak bilan birga ham butun qoladi', () => {
  const e = ok('1,5 mln remont, 50 ming taksi');
  assert.deepEqual(e.map((x) => x.amount), [1_500_000, 50_000]);
});

test('kirim va chiqim aralash — har bo\'lak o\'z ishorasi bilan', () => {
  const e = ok('+200 ming oylik, 50 ming taksi');
  assert.deepEqual(e.map((x) => x.kind), ['income', 'expense']);
  assert.deepEqual(e.map((x) => x.amount), [200_000, 50_000]);
});

test('umumiy sana barcha bo\'lakka qo\'llanadi', () => {
  const e = ok('kecha 27000ga banan, 31000ga non');
  const yesterday = { year: 2026, month: 10, day: 12 };
  assert.deepEqual(e.map((x) => x.date), [yesterday, yesterday]);
});

test('bo\'lakning o\'z sanasi umumiydan ustun; sanasizlar umumiyni oladi', () => {
  const e = ok('bugun 10000 non; 20000 suv; 12.10 30000 go\'sht');
  assert.deepEqual(e[0].date, TODAY);
  assert.deepEqual(e[1].date, TODAY);
  assert.deepEqual(e[2].date, { year: 2026, month: 10, day: 12 });
});

test('sana alohida bo\'lakda turishi mumkin', () => {
  const e = ok('kecha, 27000 banan, 31000 non');
  assert.equal(e.length, 2);
  assert.deepEqual(e[0].date, { year: 2026, month: 10, day: 12 });
});

test('yangi qator, ";" va "va" ajratgich', () => {
  assert.equal(ok('10000 non\n20000 suv').length, 2);
  assert.equal(ok('10000 non; 20000 suv').length, 2);
  assert.equal(ok('10000 non va 20000 suv').length, 2);
  assert.equal(ok('10000 non и 20000 suv').length, 2);
});

test('summasiz bo\'lak e\'tiborsiz; bitta tanilsa — null', () => {
  assert.equal(ok('salom, 10000 non, 20000 suv').length, 2);
  assert.equal(parseMultiEntry('salom, 10000 non', TODAY), null);
  assert.equal(parseMultiEntry('hech narsa, yo\'q', TODAY), null);
});

test('21 bo\'lak → 20 ta', () => {
  const text = Array.from({ length: 21 }, (_, i) => `${(i + 1) * 1000} non${i}`).join(', ');
  assert.equal(ok(text).length, MAX_MULTI_ENTRIES);
  assert.equal(MAX_MULTI_ENTRIES, 20);
});

test('kelajak sanasi — xato', () => {
  assert.deepEqual(parseMultiEntry('25.12.2026 10000 non, 20000 suv', TODAY), { ok: false, error: 'future' });
});
