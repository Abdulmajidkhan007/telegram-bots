'use strict';

// Tezkor kiritish: summa + ishora + sana. Kompilyatsiya qilingan dist/ sinaladi.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseQuickEntry,
  splitTrailingAmount,
  extractDateToken,
  localDateInTz,
  localDateToStorage,
  addDays,
  parseIsoDate,
  formatIsoDate,
} = require('../dist');

const TODAY = { year: 2026, month: 10, day: 13 };
const entry = (text) => {
  const r = parseQuickEntry(text, TODAY);
  assert.ok(r && r.ok, `tahlil qilinmadi: ${text}`);
  return r.entry;
};

test("o'zbek summa yozuvlari: ming / k / mln / yalang son", () => {
  assert.equal(entry('- 10 ming taksiga').amount, 10_000);
  assert.equal(entry('50k ovqat').amount, 50_000);
  assert.equal(entry('10000 taksi').amount, 10_000);
  assert.equal(entry('+2 mln oylik').amount, 2_000_000);
  assert.equal(entry('1,5 mln kvartira').amount, 1_500_000);
  assert.equal(entry("15 000 so'm metro").amount, 15_000);
  assert.equal(entry('10 минг такси').amount, 10_000);
  assert.equal(entry('2 млн ойлик').amount, 2_000_000);
});

test('rus summa yozuvlari: тыс / тысяч / млн', () => {
  assert.equal(entry('10 тысяч такси').amount, 10_000);
  assert.equal(entry('5 тыс кофе').amount, 5_000);
  assert.equal(entry('- 2 млн ремонт').amount, 2_000_000);
  assert.equal(entry('300 рубль подарок').currency, 'RUB');
});

test('ishora: "-" xarajat, "+" daromad, ishorasiz xarajat', () => {
  assert.equal(entry('- 10 ming taksiga').kind, 'expense');
  assert.equal(entry('+2 mln oylik').kind, 'income');
  assert.equal(entry('+ 500 ming bonus').kind, 'income');
  assert.equal(entry('50k ovqat').kind, 'expense');
  assert.equal(entry('— 20k non').kind, 'expense');
});

test('izoh va kategoriya ajratiladi', () => {
  const e = entry('- 10 ming taksiga');
  assert.equal(e.description, 'taksiga');
  assert.equal(e.categoryHint, 'Transport');
  assert.equal(entry('+2 mln oylik').description, 'oylik');
  assert.equal(entry('50k ovqat').categoryHint, 'Oziq-ovqat');
});

test('sanasiz yozuv — date: null (hozirgi vaqt)', () => {
  assert.equal(entry('50k ovqat').date, null);
});

test('"kecha", "bugun", "o\'tgan kuni" — nisbiy sanalar, istalgan joyda', () => {
  assert.deepEqual(entry('kecha 50k taksi').date, { year: 2026, month: 10, day: 12 });
  assert.deepEqual(entry('- 10 ming taksiga kecha').date, { year: 2026, month: 10, day: 12 });
  assert.equal(entry('- 10 ming taksiga kecha').description, 'taksiga');
  assert.equal(entry('kecha - 10 ming taksi').kind, 'expense');
  assert.deepEqual(entry('bugun 20k non').date, TODAY);
  assert.deepEqual(entry("o'tgan kuni 30k dori").date, { year: 2026, month: 10, day: 11 });
  assert.deepEqual(entry('вчера 10 тысяч такси').date, { year: 2026, month: 10, day: 12 });
  assert.deepEqual(entry('позавчера 5 тыс кофе').date, { year: 2026, month: 10, day: 11 });
  assert.deepEqual(entry('кеча 10 минг такси').date, { year: 2026, month: 10, day: 12 });
});

test('"3 kun oldin" — N kun avvalgi sana', () => {
  assert.deepEqual(entry('3 kun oldin 50k ovqat').date, { year: 2026, month: 10, day: 10 });
  assert.equal(entry('3 kun oldin 50k ovqat').amount, 50_000);
  assert.deepEqual(entry('50k ovqat 2 дня назад').date, { year: 2026, month: 10, day: 11 });
});

test('raqamli sana: "12.10", "05.10.2026", "12/10"', () => {
  const e = entry('12.10 non 8000');
  assert.deepEqual(e.date, { year: 2026, month: 10, day: 12 });
  assert.equal(e.amount, 8000);
  assert.equal(e.description, 'non');
  assert.deepEqual(entry('- 50k taksi 05.10.2026').date, { year: 2026, month: 10, day: 5 });
  assert.deepEqual(entry('12/10 20k choy').date, { year: 2026, month: 10, day: 12 });
});

test('yilsiz kelajak sana — o\'tgan yil', () => {
  assert.deepEqual(entry('25.12 100k sovga').date, { year: 2025, month: 12, day: 25 });
});

test('yili bilan kelajak sana — xato, yozilmaydi', () => {
  assert.deepEqual(parseQuickEntry('25.12.2026 100k sovga', TODAY), { ok: false, error: 'future' });
});

// Regressiya xavfi: o'nlik summa sanaga aylanib qolmasin.
test("o'nlik summa sana emas: 1.5 mln, 2,5k, 1.10 mln", () => {
  assert.equal(entry('1.5 mln kiyim').amount, 1_500_000);
  assert.equal(entry('1.5 mln kiyim').date, null);
  assert.equal(entry('2,5k choy').amount, 2_500);
  assert.equal(entry('1.10 mln remont').amount, 1_100_000);
  assert.equal(entry('1.10 mln remont').date, null);
});

test("noto'g'ri sana matni o'zgartirilmaydi", () => {
  assert.deepEqual(extractDateToken('12.40 nimadir', TODAY), { text: '12.40 nimadir', date: null });
  // "kechasi" — "kecha" emas.
  assert.equal(extractDateToken('kechasi 50k taksi', TODAY).date, null);
});

test('xarajat bo\'lmagan matn — null', () => {
  assert.equal(parseQuickEntry('salom hammaga', TODAY), null);
  assert.equal(parseQuickEntry('kecha keldim', TODAY), null);
  assert.equal(parseQuickEntry('soat 5 da', TODAY), null);
});

test('Toshkent vaqti: UTC 20:00 — Toshkentda ertasi kun', () => {
  assert.deepEqual(localDateInTz(new Date('2026-10-12T20:00:00Z'), 'Asia/Tashkent'), TODAY);
  assert.deepEqual(localDateInTz(new Date('2026-10-12T18:00:00Z'), 'Asia/Tashkent'),
    { year: 2026, month: 10, day: 12 });
});

test("saqlash lahzasi o'sha kalendar kuni (UTC va Toshkentda)", () => {
  const d = localDateToStorage({ year: 2026, month: 10, day: 12 });
  assert.equal(d.toISOString(), '2026-10-12T12:00:00.000Z');
  assert.deepEqual(localDateInTz(d, 'Asia/Tashkent'), { year: 2026, month: 10, day: 12 });
});

test('addDays oy/yil chegarasidan o\'tadi', () => {
  assert.deepEqual(addDays({ year: 2026, month: 1, day: 1 }, -1), { year: 2025, month: 12, day: 31 });
  assert.deepEqual(addDays({ year: 2026, month: 3, day: 1 }, -1), { year: 2026, month: 2, day: 28 });
});

test('ISO sana callback uchun: tekshiriladi', () => {
  assert.equal(formatIsoDate({ year: 2026, month: 3, day: 5 }), '2026-03-05');
  assert.deepEqual(parseIsoDate('2026-03-05'), { year: 2026, month: 3, day: 5 });
  assert.equal(parseIsoDate('2026-02-30'), null);
  assert.equal(parseIsoDate('2026-3-5'), null);
});

test('hisob nomi va boshlang\'ich balans', () => {
  assert.deepEqual(splitTrailingAmount('Humo 1,5 mln'), { rest: 'Humo', amount: 1_500_000 });
  assert.deepEqual(splitTrailingAmount('Naqd pul 200 ming'), { rest: 'Naqd pul', amount: 200_000 });
  assert.deepEqual(splitTrailingAmount('Uzcard'), { rest: 'Uzcard', amount: null });
  assert.deepEqual(splitTrailingAmount('Kredit -500k'), { rest: 'Kredit', amount: -500_000 });
});
