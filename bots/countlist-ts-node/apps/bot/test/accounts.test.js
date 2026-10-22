'use strict';

// Hisoblar: balans, tartib, kiritish, callback — toza mantiq. Ishga tushirish: npm test.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  computeBalances, reorder, sortAccounts, parseAccountInput, accountActionData, ACC_ACTION_RE,
  formatAccountList, formatBalance,
} = require('../dist/utils/accounts');

const A = 'clx1a2b3c4d5e6f7g8h9i0jaa';
const B = 'clx1a2b3c4d5e6f7g8h9i0jbb';
const C = 'clx1a2b3c4d5e6f7g8h9i0jcc';
const acc = (id, name, extra = {}) => ({
  id, name, icon: '💳', currency: 'UZS', initialBalance: 0, sortOrder: 0, isHidden: false, ...extra,
});

test("balans = boshlang'ich + daromad − xarajat", () => {
  const b = computeBalances(
    [acc(A, 'Humo', { initialBalance: 1_000_000 }), acc(B, 'Naqd')],
    [
      { accountId: A, type: 'EXPENSE', currency: 'UZS', amount: 250_000 },
      { accountId: A, type: 'INCOME', currency: 'UZS', amount: 2_000_000 },
      { accountId: B, type: 'EXPENSE', currency: 'UZS', amount: 10_000 },
      { accountId: null, type: 'EXPENSE', currency: 'UZS', amount: 999 },
    ],
  );
  assert.equal(b.get(A), 2_750_000);
  assert.equal(b.get(B), -10_000);
});

test('boshqa valyutadagi yozuv balansga qo\'shilmaydi', () => {
  const b = computeBalances([acc(A, 'Humo')], [{ accountId: A, type: 'EXPENSE', currency: 'USD', amount: 10 }]);
  assert.equal(b.get(A), 0);
});

test("suzuvchi nuqta qoldig'i yo'qoladi (0 aynan 0)", () => {
  const b = computeBalances([acc(A, 'X', { initialBalance: 0.3 })], [
    { accountId: A, type: 'EXPENSE', currency: 'UZS', amount: 0.1 },
    { accountId: A, type: 'EXPENSE', currency: 'UZS', amount: 0.2 },
  ]);
  assert.equal(b.get(A), 0);
});

test('tartib: up — bir pog\'ona, top — eng tepaga', () => {
  assert.deepEqual(reorder([A, B, C], C, 'up'), [A, C, B]);
  assert.deepEqual(reorder([A, B, C], C, 'top'), [C, A, B]);
  assert.deepEqual(reorder([A, B, C], A, 'top'), [A, B, C]);
  assert.deepEqual(reorder([A, B, C], 'yoq', 'up'), [A, B, C]);
});

test('saralash: sortOrder, keyin nom', () => {
  const s = sortAccounts([acc(A, 'b', { sortOrder: 1 }), acc(B, 'a', { sortOrder: 1 }), acc(C, 'z', { sortOrder: 0 })]);
  assert.deepEqual(s.map((x) => x.id), [C, B, A]);
});

test('hisob kiritish: nom, emoji, boshlang\'ich qoldiq', () => {
  assert.deepEqual(parseAccountInput('Humo 1,5 mln'), { icon: '💳', name: 'Humo', initialBalance: 1_500_000 });
  assert.deepEqual(parseAccountInput('💵 Naqd 200 ming'), { icon: '💵', name: 'Naqd', initialBalance: 200_000 });
  assert.deepEqual(parseAccountInput('Uzcard'), { icon: '💳', name: 'Uzcard', initialBalance: 0 });
  assert.equal(parseAccountInput('   '), null);
  assert.equal(parseAccountInput('x'.repeat(40)), null);
  // Hisob nomi kutilayotganda adashib xarajat yozilsa — hisob yaratilmaydi.
  assert.equal(parseAccountInput('50k taksi'), null);
  assert.equal(parseAccountInput('- 10 ming taksiga'), null);
});

test('callback: yasaladi, tekshiriladi, soxtasi rad etiladi', () => {
  const d = accountActionData('top', A);
  assert.ok(Buffer.byteLength(d) <= 64);
  assert.deepEqual([...ACC_ACTION_RE.exec(d)].slice(1), ['top', A]);
  for (const bad of ['acc:del:' + A, 'acc:top:../x', 'acc:top:' + A + ';', 'acc:top:ABC']) {
    assert.equal(ACC_ACTION_RE.test(bad), false, bad);
  }
  assert.throws(() => accountActionData('hide', 'x'));
});

test("ro'yxat: asosiy ⭐, yopilganlar alohida, manfiy balans", () => {
  const list = [acc(A, 'Humo'), acc(B, 'Eski', { isHidden: true, sortOrder: 1 })];
  const bal = new Map([[A, -5000], [B, 0]]);
  const short = formatAccountList(list, bal, false);
  assert.match(short, /Humo ⭐ — −5k so'm/);
  assert.match(short, /Yopilgan: 1 ta/);
  assert.doesNotMatch(short, /Eski/);
  assert.match(formatAccountList(list, bal, true), /Eski/);
  assert.match(formatAccountList([], new Map(), false), /hali yo'q/);
  assert.equal(formatBalance(1_500_000, 'UZS'), "1.5 mln so'm");
});

// ─── Transfer ───────────────────────────────────────────────────
const {
  ACC_TRANSFER_PICK_RE, transferPickData, transferStage, applyTransferPick, parseTransferAmount,
  validateTransfer, formatTransferDone,
} = require('../dist/utils/accounts');

test('transfer: from −, to +, transfersiz chaqiruv o\'zgarmaydi', () => {
  const accs = [acc(A, 'Humo', { initialBalance: 1_000_000 }), acc(B, 'Naqd')];
  const without = computeBalances(accs, []);
  assert.equal(without.get(A), 1_000_000);
  const b = computeBalances(accs, [], [{ fromAccountId: A, toAccountId: B, currency: 'UZS', amount: 300_000 }]);
  assert.equal(b.get(A), 700_000);
  assert.equal(b.get(B), 300_000);
});

test('transfer: valyutasi mos kelmagan tomon e\'tiborga olinmaydi', () => {
  const b = computeBalances([acc(A, 'Humo'), acc(B, 'USD', { currency: 'USD' })], [],
    [{ fromAccountId: A, toAccountId: B, currency: 'UZS', amount: 100 }]);
  assert.equal(b.get(A), -100);
  assert.equal(b.get(B), 0);
});

test('validateTransfer: bir xil hisob, ≤0 summa, valyuta mos emas', () => {
  const u = { id: A, currency: 'UZS' };
  const v = { id: B, currency: 'UZS' };
  assert.equal(validateTransfer(u, v, 1000), null);
  assert.equal(validateTransfer(u, u, 1000), 'SAME_ACCOUNT');
  assert.equal(validateTransfer(u, v, 0), 'BAD_AMOUNT');
  assert.equal(validateTransfer(u, v, -5), 'BAD_AMOUNT');
  assert.equal(validateTransfer(u, v, NaN), 'BAD_AMOUNT');
  assert.equal(validateTransfer(u, { id: B, currency: 'USD' }, 10), 'CURRENCY_MISMATCH');
});

test('transfer callback regex: noto\'g\'ri data rad, to\'g\'risi 64 baytdan kichik', () => {
  const d = transferPickData('from', A);
  assert.ok(Buffer.byteLength(d) <= 64);
  assert.deepEqual(ACC_TRANSFER_PICK_RE.exec(d).slice(1), ['from', A]);
  for (const bad of ['acc:xf:x:' + A, 'acc:xf:from:', 'acc:xf:from:ABC', 'acc:xf:from:' + A + 'x!', 'acc:xf:from:' + A + ':1', 'xacc:xf:to:' + A]) {
    assert.equal(ACC_TRANSFER_PICK_RE.test(bad), false, bad);
  }
  assert.throws(() => transferPickData('to', 'bad id'));
});

test('transfer qadamlari: from → to → amount, noto\'g\'ri tartib va bir xil hisob rad', () => {
  assert.equal(transferStage({}), 'from');
  assert.equal(applyTransferPick({}, 'to', B), null);
  const d1 = applyTransferPick({}, 'from', A);
  assert.deepEqual(d1, { fromId: A });
  assert.equal(transferStage(d1), 'to');
  assert.equal(applyTransferPick(d1, 'from', B), null);
  assert.equal(applyTransferPick(d1, 'to', A), null);
  const d2 = applyTransferPick(d1, 'to', B);
  assert.deepEqual(d2, { fromId: A, toId: B });
  assert.equal(transferStage(d2), 'amount');
});

test('parseTransferAmount: faqat summa qabul qilinadi', () => {
  assert.equal(parseTransferAmount('500 000'), 500_000);
  assert.equal(parseTransferAmount('1,5 mln'), 1_500_000);
  assert.equal(parseTransferAmount('50k'), 50_000);
  assert.equal(parseTransferAmount('taksi 50k'), null);
  assert.equal(parseTransferAmount('salom'), null);
  assert.equal(parseTransferAmount('0'), null);
  assert.equal(parseTransferAmount('-5000'), null);
});

test('formatTransferDone', () => {
  const t = formatTransferDone(acc(A, 'Humo'), acc(B, 'Naqd', { icon: '💵' }), 500_000);
  assert.match(t, /^✅ Transfer: 500k so'm · 💳 Humo → 💵 Naqd$/);
});
