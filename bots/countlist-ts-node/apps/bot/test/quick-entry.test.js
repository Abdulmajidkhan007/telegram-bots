'use strict';

// Tezkor kiritishning "Bekor qilish" tugmasi — toza mantiq. Ishga tushirish: npm test.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { undoCallbackData, parseUndoCallback, UNDO_CALLBACK_RE, UNDO_WINDOW_MS } = require('../dist/utils/quick-entry');

const ID = 'clx1a2b3c4d5e6f7g8h9i0jk'; // Prisma cuid() ko'rinishi

test("callback_data yasaladi va qaytib o'qiladi", () => {
  const data = undoCallbackData(ID);
  assert.equal(data, `exp:undo:${ID}`);
  assert.ok(Buffer.byteLength(data) <= 64, 'Telegram callback_data chegarasi 64 bayt');
  assert.equal(parseUndoCallback(data), ID);
  assert.ok(UNDO_CALLBACK_RE.test(data));
});

// Callback foydalanuvchi qo'lida — soxta/buzuq ma'lumot qabul qilinmaydi.
test("soxta callback_data rad etiladi", () => {
  for (const bad of [undefined, '', 'exp:undo:', 'exp:undo:../../x', `exp:undo:${ID}; drop`,
    'exp:undo:ABCDEFGHIJKLMNOPQRSTUV', `exp:del:${ID}`, `exp:undo:${'a'.repeat(40)}`]) {
    assert.equal(parseUndoCallback(bad), null, String(bad));
  }
});

test("noto'g'ri ID bilan tugma yasalmaydi", () => {
  assert.throws(() => undoCallbackData('x'));
  assert.throws(() => undoCallbackData('a'.repeat(40)));
});

test('bekor qilish oynasi — 24 soat', () => {
  assert.equal(UNDO_WINDOW_MS, 24 * 60 * 60 * 1000);
});
