'use strict';

// Tezkor kiritish javobi: matn, tugmalar, kategoriya nomini topish.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { formatEntryText, entryKeyboard, dateKeyboard, categoryKeyboard, matchCategoryByName, MAX_ACCOUNT_BUTTONS } =
  require('../dist/utils/entry-format');
const {
  TX_ACCOUNT_RE, TX_DATE_RE, TX_CAT_RE, TX_DATE_MENU_RE, TX_CAT_MENU_RE, TX_NEW_CAT_RE, TX_BACK_RE, UNDO_CALLBACK_RE,
  parseCallbackDate, parseNewCategoryName, datePickerOptions,
} = require('../dist/utils/quick-entry');

const TODAY = { year: 2026, month: 10, day: 13 };
const E = 'clx1a2b3c4d5e6f7g8h9i0jee';
const A = 'clx1a2b3c4d5e6f7g8h9i0jaa';
const B = 'clx1a2b3c4d5e6f7g8h9i0jbb';
const view = (extra = {}) => ({
  id: E, type: 'EXPENSE', amount: 10_000, currency: 'UZS', description: 'taksiga', day: TODAY,
  category: { icon: '🚗', name: 'Transport' }, account: { id: A, icon: '💳', name: 'Humo' }, authorName: 'Ali',
  ...extra,
});
const allData = (rows) => rows.flat().map((b) => b.data);

test('xarajat javobi: summa, kategoriya, hisob, sana', () => {
  const t = formatEntryText(view(), TODAY);
  assert.match(t, /✅ Xarajat yozildi/);
  assert.match(t, /💵 10k so'm — taksiga/);
  assert.match(t, /🏷 🚗 Transport/);
  assert.match(t, /\n💳 Humo\n/);
  assert.match(t, /📅 Bugun, 13\.10/);
});

test('daromad javobi: kategoriya qatori yo\'q, kecha belgisi', () => {
  const t = formatEntryText(view({ type: 'INCOME', amount: 2_000_000, description: 'oylik', category: null,
    day: { year: 2026, month: 10, day: 12 } }), TODAY);
  assert.match(t, /✅ Daromad yozildi/);
  assert.match(t, /➕ 2\.0 mln so'm — oylik/);
  assert.doesNotMatch(t, /🏷/);
  assert.match(t, /Kecha, 12\.10/);
});

test("o'tgan yil sanasi yili bilan ko'rsatiladi", () => {
  assert.match(formatEntryText(view({ day: { year: 2025, month: 12, day: 25 } }), TODAY), /25\.12\.2025/);
});

test('asosiy tugmalar: hisoblar (✓ tanlangan), sana, kategoriya, bekor qilish', () => {
  const rows = entryKeyboard(view(), [{ id: A, icon: '💳', name: 'Humo' }, { id: B, icon: '💵', name: 'Naqd' }]);
  assert.equal(rows[0][0].text, '✓ 💳 Humo');
  assert.equal(rows[0][1].text, '💵 Naqd');
  assert.ok(TX_ACCOUNT_RE.test(rows[0][1].data));
  assert.deepEqual(rows[1].map((b) => b.text), ['📅 Sana', '🏷 Kategoriya']);
  assert.ok(UNDO_CALLBACK_RE.test(rows[2][0].data));
  for (const d of allData(rows)) assert.ok(Buffer.byteLength(d) <= 64, d);
});

test('daromadda kategoriya tugmasi yo\'q; hisob bo\'lmasa hisob qatori yo\'q', () => {
  const rows = entryKeyboard(view({ type: 'INCOME', account: null }), []);
  assert.deepEqual(rows[0].map((b) => b.text), ['📅 Sana']);
});

test('hisob tugmalari soni cheklangan', () => {
  const many = Array.from({ length: 15 }, (_, i) => ({ id: `clx1a2b3c4d5e6f7g8h9i0j${String(i).padStart(2, '0')}`, icon: '💳', name: `K${i}` }));
  const rows = entryKeyboard(view(), many);
  const accButtons = allData(rows).filter((d) => TX_ACCOUNT_RE.test(d));
  assert.equal(accButtons.length, MAX_ACCOUNT_BUTTONS);
});

test('sana menyusi: 7 kun, bugun ✓, orqaga', () => {
  const rows = dateKeyboard(view(), TODAY);
  const dates = rows.flat().filter((b) => TX_DATE_RE.test(b.data));
  assert.equal(dates.length, 7);
  assert.equal(dates[0].text, '✓ Bugun');
  assert.equal(dates[1].text, 'Kecha');
  assert.equal(dates[2].text, '11.10');
  assert.ok(TX_BACK_RE.test(rows.at(-1)[0].data));
});

test('kategoriya menyusi: tanlangan ✓, yangi kategoriya tugmasi', () => {
  const rows = categoryKeyboard(view(), [{ id: A, icon: '🚗', name: 'Transport' }, { id: B, icon: '🌸', name: 'Gul' }], A);
  assert.equal(rows[0][0].text, '✓ 🚗 Transport');
  assert.ok(TX_CAT_RE.test(rows[0][1].data));
  assert.ok(TX_NEW_CAT_RE.test(rows.at(-2)[0].data));
});

test('menyu callbacklari: soxta ID rad etiladi', () => {
  assert.ok(TX_DATE_MENU_RE.test(`tdm:${E}`));
  assert.ok(TX_CAT_MENU_RE.test(`tcm:${E}`));
  for (const bad of [`ta:${E}:x`, `td:${E}:2026-1-1`, `tc:${E}`, `tdm:${E}x;`, `ta:${E.toUpperCase()}:${A}`]) {
    assert.equal([TX_ACCOUNT_RE, TX_DATE_RE, TX_CAT_RE, TX_DATE_MENU_RE].some((re) => re.test(bad)), false, bad);
  }
});

test('callbackdagi sana: kelajak va mavjud bo\'lmagan kun rad etiladi', () => {
  assert.deepEqual(parseCallbackDate('2026-10-12', TODAY), { year: 2026, month: 10, day: 12 });
  assert.equal(parseCallbackDate('2026-10-14', TODAY), null);
  assert.equal(parseCallbackDate('2026-02-30', TODAY), null);
  assert.equal(datePickerOptions(TODAY).length, 7);
});

test('yangi kategoriya nomi', () => {
  assert.deepEqual(parseNewCategoryName('🌸 gullar'), { icon: '🌸', name: 'Gullar' });
  assert.deepEqual(parseNewCategoryName('Uy hayvonlari'), { icon: '📦', name: 'Uy hayvonlari' });
  assert.equal(parseNewCategoryName('50k taksi'), null);
  assert.equal(parseNewCategoryName(''), null);
  assert.equal(parseNewCategoryName('x'.repeat(40)), null);
});

test("guruh kategoriyasi izohdan topiladi (qo'shimchalar bilan)", () => {
  const cats = [{ id: 'g', name: 'Gul' }, { id: 'u', name: 'Uy' }, { id: 'h', name: 'Uy hayvonlari' }];
  assert.equal(matchCategoryByName('gulga', cats), 'g');
  assert.equal(matchCategoryByName('onamga gullar', cats), 'g');
  assert.equal(matchCategoryByName('uy hayvonlari uchun ozuqa', cats), 'h');
  assert.equal(matchCategoryByName('uyga', cats), null); // 2 harfli nom e'tiborsiz
  assert.equal(matchCategoryByName('taksi', cats), null);
  assert.equal(matchCategoryByName('angular kurs', cats), null); // so'z ichida emas, boshida
});
