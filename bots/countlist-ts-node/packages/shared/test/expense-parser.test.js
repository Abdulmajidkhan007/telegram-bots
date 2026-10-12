'use strict';

// Kompilyatsiya qilingan kodni sinaymiz: bot ham aynan dist/ ni ishlatadi.
// Ishga tushirish: npm test (packages/shared ichida) — avval tsc qiladi.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseExpenseText } = require('../dist/utils/expense-parser');

// Bazadagi standart kategoriyalar — packages/database/prisma/seed.ts dan.
// Parser boshqa nom qaytarsa, bot xarajatni kategoriyasiz saqlaydi.
const SEED_CATEGORIES = [
  'Oziq-ovqat', 'Transport', 'Uy-joy', 'Kiyim-kechak', "Sog'liq", "Ta'lim",
  "Ko'ngilochar", 'Texnologiya', 'Sport', 'Sayohat', "Sovg'a", 'Boshqa',
];

test('summa boshida — eski formatlar buzilmagan', () => {
  assert.deepEqual(parseExpenseText("500000 so'm telefonga"),
    { amount: 500000, currency: 'UZS', description: 'telefonga', categoryHint: 'Texnologiya' });
  assert.equal(parseExpenseText('2 mln remontga').amount, 2_000_000);
  assert.equal(parseExpenseText('50k ovqat').amount, 50_000);
  assert.equal(parseExpenseText('1.5 million kiyim').amount, 1_500_000);
  assert.equal(parseExpenseText('300 ming non').amount, 300_000);
  assert.equal(parseExpenseText("15 000 so'm metro").amount, 15_000);
  assert.equal(parseExpenseText('1,500,000 mebel').amount, 1_500_000);
});

test('valyuta aniqlanadi', () => {
  assert.equal(parseExpenseText('25$ kitob').currency, 'USD');
  assert.equal(parseExpenseText('100 usd kurs').currency, 'USD');
  assert.equal(parseExpenseText('20 eur sovga').currency, 'EUR');
});

// Regressiya: "1,5 mln" 15 mln deb o'qilardi — vergul butunlay o'chirilardi.
test("o'nlik vergul: 1,5 mln = 1 500 000", () => {
  assert.equal(parseExpenseText('1,5 mln taksi').amount, 1_500_000);
  assert.equal(parseExpenseText('2,5k choy').amount, 2_500);
});

// Regressiya: summa oxirida yozilsa (odamlar ko'pincha shunday yozadi)
// parser null qaytarardi va bot xabarni jimgina e'tiborsiz qoldirardi.
// countlist-python buni qo'llardi.
test('summa oxirida', () => {
  assert.deepEqual(parseExpenseText('taksi 15000'),
    { amount: 15000, currency: 'UZS', description: 'taksi', categoryHint: 'Transport' });
  assert.equal(parseExpenseText('ovqatga 45000').amount, 45000);
  assert.equal(parseExpenseText('ovqatga 45000').categoryHint, 'Oziq-ovqat');
  assert.equal(parseExpenseText('remont uchun 2 mln').amount, 2_000_000);
  assert.equal(parseExpenseText("benzin 200 ming so'm").amount, 200_000);
  assert.equal(parseExpenseText('kitob 10$').currency, 'USD');
});

test("xarajat bo'lmagan matn tutilmaydi", () => {
  assert.equal(parseExpenseText('salom qalaysan'), null);
  assert.equal(parseExpenseText('ertaga soat 5 da uchrashamiz'), null);
  assert.equal(parseExpenseText('0 ovqat'), null);
  // Guruhdagi oddiy gaplar oxirida kichik son bo'lsa, xarajat emas.
  assert.equal(parseExpenseText('soat 5'), null);
  assert.equal(parseExpenseText('bizning xona 12'), null);
});

// Regressiya: "Sogliq", "Talim", "Kongilochar" qaytarilardi, bazada esa
// "Sog'liq", "Ta'lim", "Ko'ngilochar" — kategoriya topilmay qolardi.
test('kategoriya nomlari bazadagi nomlarga mos', () => {
  const samples = ['dori 50000', '100000 kurs', '80000 kino', '30000 kafe',
    '40000 dorixona', '200000 sayohat', '150000 sovga', '90000 sport zal'];
  for (const s of samples) {
    const r = parseExpenseText(s);
    assert.ok(r, `${s} tanilmadi`);
    assert.ok(SEED_CATEGORIES.includes(r.categoryHint),
      `${s} -> "${r.categoryHint}" bazada yo'q`);
  }
});

// countlist-python dagi qo'shimcha kalit so'zlar.
test("python versiyasidan ko'chirilgan kalit so'zlar", () => {
  assert.equal(parseExpenseText('50000 bozor').categoryHint, 'Oziq-ovqat');
  assert.equal(parseExpenseText('70000 magazin').categoryHint, 'Oziq-ovqat');
  assert.equal(parseExpenseText('15000 qahva').categoryHint, 'Oziq-ovqat');
  assert.equal(parseExpenseText('8000 marshrutka').categoryHint, 'Transport');
  assert.equal(parseExpenseText('25000 yandex').categoryHint, 'Transport');
  assert.equal(parseExpenseText('3 mln mebel').categoryHint, 'Uy-joy');
  assert.equal(parseExpenseText('120000 gaz').categoryHint, 'Uy-joy');
  assert.equal(parseExpenseText('400000 poyabzal').categoryHint, 'Kiyim-kechak');
  assert.equal(parseExpenseText('600000 klinika').categoryHint, "Sog'liq");
  assert.equal(parseExpenseText('1 mln repetitor').categoryHint, "Ta'lim");
});

// ── Tezkor kiritish: ishora, rus/kirill yozuvlari ─────────────────────────
const { parseTransactionText } = require('../dist/utils/expense-parser');

// Regressiya: "- 10 ming taksiga" (Shaxsiy Moliya uslubi) null qaytarardi —
// bot xabarni jimgina tashlab ketardi.
test('boshidagi "-" — xarajat (tire va minus belgilari ham)', () => {
  for (const t of ['- 10 ming taksiga', '-10k taksi', '– 10 ming taksiga', '− 10000 taksi', '—10 ming taksi']) {
    const r = parseTransactionText(t);
    assert.equal(r.kind, 'expense', t);
    assert.equal(r.amount, 10_000, t);
    assert.equal(r.categoryHint, 'Transport', t);
    assert.equal(parseExpenseText(t).amount, 10_000, t);
  }
});

test('boshidagi "+" — daromad; xarajat sifatida yozilmaydi', () => {
  assert.deepEqual(parseTransactionText('+ 5 mln oylik'),
    { kind: 'income', amount: 5_000_000, currency: 'UZS', description: 'oylik', categoryHint: undefined });
  assert.equal(parseTransactionText('+500k bonus').amount, 500_000);
  assert.equal(parseExpenseText('+ 5 mln oylik'), null);
});

test('ishorasiz — eski xatti-harakat: xarajat', () => {
  assert.equal(parseTransactionText('50k ovqat').kind, 'expense');
  assert.equal(parseTransactionText('taksi 15000').kind, 'expense');
});

// Regressiya: "10 тысяч такси" 10 so'm deb yozilardi ("тысяч" tanilmasdi),
// "50 минг нон" ham 50 so'm — regex "мин" ni olib, "г" da sinardi.
test('rus va o\'zbek kirill ko\'paytiruvchilari', () => {
  assert.equal(parseExpenseText('10 тысяч такси').amount, 10_000);
  assert.equal(parseExpenseText('10 тысяч такси').description, 'такси');
  assert.equal(parseExpenseText('10 тыс продукты').amount, 10_000);
  assert.equal(parseExpenseText('2 тысячи хлеб').amount, 2_000);
  assert.equal(parseExpenseText('50 минг нон').amount, 50_000);
  assert.equal(parseExpenseText('1.5 млн ремонт').amount, 1_500_000);
  assert.equal(parseExpenseText('такси 30 тыс').amount, 30_000);
});

// Regressiya: telefon klaviaturasidagi egri apostrof "so‘m" valyuta deb
// tanilmasdi va izohga tushib qolardi.
test("so'm yozilishining barcha apostroflari", () => {
  for (const t of ["25 000 so'm ovqat", '25 000 so‘m ovqat', '25 000 so’m ovqat', '25 000 soʻm ovqat', '- 25 000 so‘m ovqat']) {
    const r = parseExpenseText(t);
    assert.equal(r.amount, 25_000, t);
    assert.equal(r.description, 'ovqat', t);
  }
});

// Regressiya: "10 ming" — 10 so'm, izohi "ming" bo'lib yozilardi.
test("izohsiz summa — ko'paytiruvchi izoh bo'lib qolmaydi", () => {
  assert.equal(parseExpenseText('10 ming'), null);
  assert.equal(parseExpenseText('-10 ming'), null);
  assert.equal(parseExpenseText("500 so'm"), null);
});

// Regressiya: boshida kichik son ("3 kishi keladi") 3 so'mlik xarajat bo'lardi.
test('boshidagi kichik yalang son xarajat emas', () => {
  assert.equal(parseExpenseText('3 kishi keladi'), null);
  assert.equal(parseExpenseText('5 da uchrashamiz'), null);
  assert.equal(parseExpenseText('-5 da uchrashamiz'), null);
  // Valyuta yoki ko'paytiruvchi bo'lsa — kichik summa ham to'g'ri
  assert.equal(parseExpenseText('5$ kofe').amount, 5);
  assert.equal(parseExpenseText('5k non').amount, 5_000);
  assert.equal(parseExpenseText('500 non').amount, 500);
});

test('ishora yolg\'iz yoki matn bilan — tranzaksiya emas', () => {
  assert.equal(parseTransactionText('+ salom'), null);
  assert.equal(parseTransactionText('- bu gap'), null);
  assert.equal(parseTransactionText('+'), null);
});
