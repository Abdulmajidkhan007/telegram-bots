'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Store, DEFAULT_PRICES } = require('../src/store');
const svc = require('../src/service');
const { parseAdminIds, parseChannel, loadConfig, loadEnvFile } = require('../src/config');
const { formatSom } = require('../src/format');

const from = (id) => ({ id, first_name: 'Ali', username: 'ali' });
const fresh = () => new Store(null);

test('narxlar standarti: 49 000 / 300 000 / 100 000', () => {
  assert.deepStrictEqual({ ...DEFAULT_PRICES }, { guide: 49000, setup: 300000, monthly: 100000 });
  assert.strictEqual(formatSom(49000), "49 000 so'm");
  assert.strictEqual(formatSom(1250000), "1 250 000 so'm");
});

test('parsePrice: bo‘sh joy/vergul qabul, harf va chegaradan tashqari rad', () => {
  assert.strictEqual(svc.parsePrice('59 000'), 59000);
  assert.strictEqual(svc.parsePrice('59,000'), 59000);
  assert.strictEqual(svc.parsePrice('abc'), null);
  assert.strictEqual(svc.parsePrice('-5000'), null);
  assert.strictEqual(svc.parsePrice('999'), null);
  assert.strictEqual(svc.parsePrice('1000000000'), null);
});

test('setPrice: o‘zgartiradi, eslatma bog‘liq narxlarni aytadi', () => {
  const s = fresh();
  const r = svc.setPrice(s, 'guide', 59000);
  assert.strictEqual(r.old, 49000);
  assert.strictEqual(s.data.prices.guide, 59000);
  assert.match(svc.priceReminder('guide'), /birga ko'rib chiqing/);
  assert.match(svc.priceReminder('guide'), /qo'llanma.*sozlab beraman/is);
  assert.throws(() => svc.setPrice(s, 'nomalum', 5000), /Noma'lum/);
});

test('to‘lov oqimi: start -> chek -> tasdiq -> paid', () => {
  const s = fresh();
  const u = svc.ensureUser(s, from(1));
  const { payment } = svc.startPayment(s, u);
  assert.strictEqual(payment.amount, 49000);
  assert.strictEqual(u.awaiting, 'receipt');
  assert.strictEqual(svc.submitReceipt(s, u, { type: 'photo', fileId: 'f' }).payment.status, 'pending');
  assert.strictEqual(svc.startPayment(s, u).error, 'pending');
  const d = svc.decidePayment(s, payment.id, 99, true);
  assert.strictEqual(d.payment.status, 'approved');
  assert.strictEqual(u.paid, true);
  assert.strictEqual(svc.startPayment(s, u).error, 'already_paid');
});

test('to‘lov: narx keyin o‘zgarsa ham foydalanuvchiga ko‘rsatilgan summa qoladi', () => {
  const s = fresh();
  const u = svc.ensureUser(s, from(1));
  const { payment } = svc.startPayment(s, u);
  svc.setPrice(s, 'guide', 99000);
  assert.strictEqual(payment.amount, 49000);
  assert.strictEqual(svc.startPayment(s, u).payment.id, payment.id);
});

test('to‘lov: ikkinchi admin qaytadan qaror qila olmaydi; rad etilgach qayta urinish mumkin', () => {
  const s = fresh();
  const u = svc.ensureUser(s, from(1));
  const { payment } = svc.startPayment(s, u);
  svc.submitReceipt(s, u, { type: 'photo', fileId: 'f' });
  assert.strictEqual(svc.decidePayment(s, payment.id, 9, false).payment.status, 'rejected');
  assert.strictEqual(svc.decidePayment(s, payment.id, 8, true).error, 'already_decided');
  assert.strictEqual(u.paid, false);
  assert.ok(svc.startPayment(s, u).payment.id !== payment.id);
});

test('chek faqat awaiting=receipt holatida qabul qilinadi', () => {
  const s = fresh();
  const u = svc.ensureUser(s, from(1));
  assert.strictEqual(svc.submitReceipt(s, u, { type: 'photo', fileId: 'f' }).error, 'no_open_payment');
});

test('ariza: uzunlik, cooldown, statistika', () => {
  const s = fresh();
  const u = svc.ensureUser(s, from(1));
  assert.strictEqual(svc.submitApplication(s, u, 'ab').error, 'bad_length');
  assert.ok(svc.submitApplication(s, u, "Do'kon, @mening_dokon", 1000).application);
  assert.strictEqual(svc.submitApplication(s, u, 'Yana bir ariza', 2000).error, 'cooldown');
  assert.ok(svc.submitApplication(s, u, 'Yana bir ariza', 1000 + 11 * 60 * 1000).application);
  assert.strictEqual(svc.getStats(s).applications, 2);
});

test('statistika: tushum faqat tasdiqlanganlardan', () => {
  const s = fresh();
  const a = svc.ensureUser(s, from(1));
  const b = svc.ensureUser(s, from(2));
  const pa = svc.startPayment(s, a).payment;
  svc.submitReceipt(s, a, { type: 'photo', fileId: 'x' });
  const pb = svc.startPayment(s, b).payment;
  svc.submitReceipt(s, b, { type: 'photo', fileId: 'y' });
  svc.decidePayment(s, pa.id, 9, true);
  const st = svc.getStats(s);
  assert.deepStrictEqual([st.users, st.paid, st.pending, st.revenue], [2, 1, 1, 49000]);
  assert.ok(pb);
});

test('Store: atomik yozuv qayta yuklanadi; buzilgan fayl ustidan yozilmaydi', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'insta-'));
  const file = path.join(dir, 'db.json');
  const s = new Store(file);
  svc.ensureUser(s, from(7));
  svc.setPrice(s, 'guide', 55000);
  assert.ok(!fs.existsSync(file + '.tmp'));
  const again = new Store(file);
  assert.strictEqual(again.data.prices.guide, 55000);
  assert.ok(again.data.users['7']);
  fs.writeFileSync(file, '{buzilgan');
  assert.throws(() => new Store(file), /buzilgan/);
  assert.ok(fs.readdirSync(dir).some((f) => f.includes('.corrupt-')));
});

test('config: ADMIN_IDS va kanal tekshiruvi', () => {
  assert.deepStrictEqual(parseAdminIds('1, 22,333'), [1, 22, 333]);
  assert.deepStrictEqual(parseAdminIds(''), []);
  assert.throws(() => parseAdminIds('1,abc'), /ADMIN_IDS/);
  assert.strictEqual(parseChannel('kanal_nomi'), '@kanal_nomi');
  assert.strictEqual(parseChannel(''), null);
  assert.throws(() => parseChannel('@a b'), /CHANNEL_USERNAME/);
});

// Regressiya: .env yuklanmas edi — README bo'yicha ishga tushirish «BOT_TOKEN berilmagan» bilan yiqilardi.
test('.env fayli o‘qiladi, mavjud env ustidan yozilmaydi', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'insta-env-'));
  const file = path.join(dir, '.env');
  fs.writeFileSync(file, 'BOT_TOKEN=123:abc\nADMIN_IDS=111,222\nCARD_HOLDER=FAYLDAN\n');
  const env = { CARD_HOLDER: 'MUHITDAN' };
  assert.strictEqual(loadEnvFile(file, env), true);
  const cfg = loadConfig(env);
  assert.strictEqual(cfg.token, '123:abc');
  assert.deepStrictEqual(cfg.adminIds, [111, 222]);
  assert.strictEqual(cfg.cardHolder, 'MUHITDAN');
  assert.strictEqual(loadEnvFile(path.join(dir, 'yoq.env'), {}), false);
  fs.rmSync(dir, { recursive: true, force: true });
});
