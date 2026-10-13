'use strict';

// Mini App «Tarix»: kunlar bo'yicha guruhlash va kun nomi.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { groupByDay, historyDayLabel, computeBalances, dateColumns } = require('../dist');

const TZ = 'Asia/Tashkent';
const TODAY = { year: 2026, month: 10, day: 13 };

test('kunlar bo\'yicha guruh, tartib saqlanadi, kunlik jami', () => {
  const items = [
    { id: 1, type: 'EXPENSE', amount: '10000.00', currency: 'UZS', date: '2026-10-13T05:00:00Z' },
    { id: 2, type: 'INCOME', amount: 2000000, currency: 'UZS', date: '2026-10-13T04:00:00Z' },
    { id: 3, type: 'EXPENSE', amount: 5, currency: 'USD', date: '2026-10-12T20:30:00Z' }, // Toshkentda 13-oktabr
    { id: 4, type: 'EXPENSE', amount: 8000, currency: 'UZS', date: '2026-10-12T12:00:00Z' },
  ];
  const g = groupByDay(items, TZ);
  assert.deepEqual(g.map((x) => x.key), ['2026-10-13', '2026-10-12']);
  assert.deepEqual(g[0].items.map((x) => x.id), [1, 2, 3]);
  assert.deepEqual(g[0].totals, { UZS: { expense: 10000, income: 2000000 }, USD: { expense: 5, income: 0 } });
  assert.deepEqual(g[1].totals, { UZS: { expense: 8000, income: 0 } });
  assert.deepEqual(groupByDay([], TZ), []);
});

test('kun nomi: bugun, kecha, hafta kuni, boshqa yil', () => {
  assert.equal(historyDayLabel(TODAY, TODAY), 'Bugun');
  assert.equal(historyDayLabel({ year: 2026, month: 10, day: 12 }, TODAY), 'Kecha');
  assert.equal(historyDayLabel({ year: 2026, month: 10, day: 11 }, TODAY), '11-oktabr, yakshanba');
  assert.equal(historyDayLabel({ year: 2025, month: 12, day: 25 }, TODAY), '25-dekabr 2025, payshanba');
});

test('hisob balansi shared\'da (bot va API bir xil)', () => {
  const b = computeBalances([{ id: 'a', name: 'H', icon: '💳', currency: 'UZS', initialBalance: 100, sortOrder: 0, isHidden: false }],
    [{ accountId: 'a', type: 'EXPENSE', currency: 'UZS', amount: 100 }]);
  assert.equal(Object.is(b.get('a'), 0), true);
});

test('sana ustunlari guruh kunidan', () => {
  const c = dateColumns(new Date('2026-10-12T20:30:00Z'), { year: 2026, month: 10, day: 13 });
  assert.equal(c.month, 10);
  assert.equal(c.year, 2026);
  assert.equal(c.dayOfYear, 286);
});
