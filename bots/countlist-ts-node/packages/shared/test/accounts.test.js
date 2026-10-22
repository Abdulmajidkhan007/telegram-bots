'use strict';

// computeBalances (transfer bilan/siz) va validateTransfer. Ishga tushirish: npm test.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { computeBalances, validateTransfer } = require('../dist/utils/accounts');

const acc = (id, extra = {}) => ({
  id, name: id, icon: '💳', currency: 'UZS', initialBalance: 0, sortOrder: 0, isHidden: false, ...extra,
});

test('transfersiz chaqiruv avvalgidek ishlaydi', () => {
  const b = computeBalances([acc('a', { initialBalance: 100 })], [{ accountId: 'a', type: 'EXPENSE', currency: 'UZS', amount: 30 }]);
  assert.equal(b.get('a'), 70);
});

test('transfer: from −, to +, xarajat/daromad bilan qo\'shiladi', () => {
  const b = computeBalances(
    [acc('a', { initialBalance: 1000 }), acc('b')],
    [{ accountId: 'a', type: 'EXPENSE', currency: 'UZS', amount: 100 }],
    [{ fromAccountId: 'a', toAccountId: 'b', currency: 'UZS', amount: 400.1 }],
  );
  assert.equal(b.get('a'), 499.9);
  assert.equal(b.get('b'), 400.1);
});

test('validateTransfer', () => {
  assert.equal(validateTransfer({ id: 'a', currency: 'UZS' }, { id: 'b', currency: 'UZS' }, 1), null);
  assert.equal(validateTransfer({ id: 'a', currency: 'UZS' }, { id: 'a', currency: 'UZS' }, 1), 'SAME_ACCOUNT');
  assert.equal(validateTransfer({ id: 'a', currency: 'UZS' }, { id: 'b', currency: 'UZS' }, 0), 'BAD_AMOUNT');
  assert.equal(validateTransfer({ id: 'a', currency: 'UZS' }, { id: 'b', currency: 'USD' }, 1), 'CURRENCY_MISMATCH');
});
