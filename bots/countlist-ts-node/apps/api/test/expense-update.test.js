'use strict';

// Mini App tahriri: DTO → Prisma update (toza mantiq, bazasiz).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildExpenseUpdate, ExpenseChangeError } = require('../dist/modules/expenses/expense-update');

const TODAY = { year: 2026, month: 10, day: 13 };

test('sana: kun ustunlari guruh kunidan, 12:00 UTC', () => {
  const d = buildExpenseUpdate({ date: '2026-10-12' }, TODAY);
  assert.equal(d.date.toISOString(), '2026-10-12T12:00:00.000Z');
  assert.equal(d.month, 10);
  assert.equal(d.year, 2026);
  assert.equal(d.dayOfYear, 285);
});

test('kelajak va mavjud bo\'lmagan sana rad etiladi', () => {
  assert.throws(() => buildExpenseUpdate({ date: '2026-10-14' }, TODAY), ExpenseChangeError);
  assert.throws(() => buildExpenseUpdate({ date: '2026-02-30' }, TODAY), ExpenseChangeError);
});

test('daromadga o\'tganda kategoriya olib tashlanadi', () => {
  const d = buildExpenseUpdate({ type: 'INCOME', categoryId: 'x' }, TODAY);
  assert.equal(d.type, 'INCOME');
  assert.equal(d.categoryId, null);
});

test('null — olib tashlash, undefined — tegmaslik', () => {
  assert.deepEqual(buildExpenseUpdate({ accountId: null }, TODAY), { accountId: null });
  assert.deepEqual(buildExpenseUpdate({}, TODAY), {});
});

test('summa va izoh tekshiriladi', () => {
  assert.equal(String(buildExpenseUpdate({ amount: 15000 }, TODAY).amount), '15000');
  assert.throws(() => buildExpenseUpdate({ amount: 0 }, TODAY), ExpenseChangeError);
  assert.throws(() => buildExpenseUpdate({ description: '   ' }, TODAY), ExpenseChangeError);
  assert.equal(buildExpenseUpdate({ description: '  non ' }, TODAY).description, 'non');
});
