'use strict';

// Paketlar va to'lov — toza mantiq. Ishga tushirish: npm test (apps/bot ichida).
// Baza va Telegram soxta — internetga chiqmaydi.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const L = require('../dist/services/billing.logic');
const { BillingService } = require('../dist/services/billing.service');

const GID = 'clx1a2b3c4d5e6f7g8h9i0jaa';
const NOW = new Date('2026-10-15T10:00:00Z');
const DAY = 86_400_000;
const inDays = (d) => new Date(NOW.getTime() + d * DAY);

test('effectivePlan: obuna yo\'q yoki muddati o\'tgan → FREE', () => {
  assert.equal(L.effectivePlan(null, NOW), 'FREE');
  assert.equal(L.effectivePlan({ plan: 'PRO', expiresAt: inDays(1) }, NOW), 'PRO');
  assert.equal(L.effectivePlan({ plan: 'PRO', expiresAt: NOW }, NOW), 'FREE'); // aynan tugagan payt
  assert.equal(L.effectivePlan({ plan: 'MAX', expiresAt: inDays(-1) }, NOW), 'FREE');
});

test('period: Toshkent (UTC+5) oy chegarasi', () => {
  // 31-kun 23:30 Toshkent = 18:30 UTC — hali o'sha oy
  assert.equal(L.period(new Date('2026-10-31T18:30:00Z')), '2026-10');
  // 00:00 Toshkent = 19:00 UTC — yangi oy (UTC bo'yicha hali oktabr!)
  assert.equal(L.period(new Date('2026-10-31T19:00:00Z')), '2026-11');
  assert.equal(L.period(new Date('2026-12-31T19:30:00Z')), '2027-01');
});

test('checkLimit: standart jadval', () => {
  assert.deepEqual(L.checkLimit('FREE', 'voice', 29), { allowed: true, used: 29, limit: 30 });
  assert.equal(L.checkLimit('FREE', 'voice', 30).allowed, false);
  assert.equal(L.checkLimit('PLUS', 'voice', 30).allowed, true);
  assert.equal(L.checkLimit('MAX', 'voice', 3000).allowed, false);
  assert.equal(L.checkLimit('FREE', 'accounts', 3).allowed, false);
  assert.equal(L.checkLimit('MAX', 'accounts', 99).allowed, true);
  assert.equal(L.limitReachedText('voice', L.checkLimit('FREE', 'voice', 30)), '🎙 Oylik ovozli limit tugadi (30/30). /tarif');
});

test('applyPurchase: yangi obuna — now + 30 kun', () => {
  const r = L.applyPurchase(null, 'PLUS', NOW);
  assert.deepEqual(r, { ok: true, plan: 'PLUS', expiresAt: inDays(30) });
  // muddati o'tgan obuna ham yangi hisoblanadi
  assert.deepEqual(L.applyPurchase({ plan: 'MAX', expiresAt: inDays(-5) }, 'PLUS', NOW).expiresAt, inDays(30));
});

test('applyPurchase: o\'sha plan — qolgan muddat ustiga +30', () => {
  const r = L.applyPurchase({ plan: 'PRO', expiresAt: inDays(10) }, 'PRO', NOW);
  assert.deepEqual(r, { ok: true, plan: 'PRO', expiresAt: inDays(40) });
});

test('applyPurchase: yuqoriga — narx nisbatida qolgan kunlar (floor)', () => {
  // PLUS 10 kun qoldi, PLUS 10 000, PRO 25 000 → 10*10000/25000 = 4 kun
  const prices = { PLUS: 10_000, PRO: 25_000, MAX: 50_000 };
  const r = L.applyPurchase({ plan: 'PLUS', expiresAt: inDays(10) }, 'PRO', NOW, prices);
  assert.deepEqual(r, { ok: true, plan: 'PRO', expiresAt: inDays(34) });
  // floor: 7 kun * 10000 / 25000 = 2.8 → 2
  assert.equal(L.applyPurchase({ plan: 'PLUS', expiresAt: inDays(7) }, 'PRO', NOW, prices).expiresAt.getTime(), inDays(32).getTime());
});

test('applyPurchase: narx yo\'q bo\'lsa qolgan kun 1:1', () => {
  const r = L.applyPurchase({ plan: 'PLUS', expiresAt: inDays(10) }, 'MAX', NOW);
  assert.deepEqual(r, { ok: true, plan: 'MAX', expiresAt: inDays(40) });
  // faqat bittasining narxi bor — baribir 1:1
  assert.equal(L.applyPurchase({ plan: 'PLUS', expiresAt: inDays(10) }, 'MAX', NOW, { MAX: 5 }).expiresAt.getTime(), inDays(40).getTime());
});

test('applyPurchase: noto\'g\'ri sozlangan narx qolgan kundan oshirmaydi', () => {
  const r = L.applyPurchase({ plan: 'PLUS', expiresAt: inDays(10) }, 'PRO', NOW, { PLUS: 100_000, PRO: 1_000 });
  assert.equal(r.expiresAt.getTime(), inDays(40).getTime());
});

test('applyPurchase: aktiv yuqori obuna paytida pastroq plan rad', () => {
  assert.deepEqual(L.applyPurchase({ plan: 'MAX', expiresAt: inDays(10) }, 'PLUS', NOW), { ok: false, reason: 'downgrade' });
  assert.deepEqual(L.applyPurchase({ plan: 'PRO', expiresAt: inDays(10) }, 'PLUS', NOW), { ok: false, reason: 'downgrade' });
  assert.deepEqual(L.applyPurchase(null, 'FREE', NOW), { ok: false, reason: 'invalid' });
});

test('applyGrant: o\'sha plan uzayadi, boshqasi now dan', () => {
  assert.deepEqual(L.applyGrant({ plan: 'PRO', expiresAt: inDays(10) }, 'PRO', 5, NOW), inDays(15));
  assert.deepEqual(L.applyGrant({ plan: 'PLUS', expiresAt: inDays(10) }, 'PRO', 5, NOW), inDays(5));
  assert.deepEqual(L.applyGrant(null, 'MAX', 7, NOW), inDays(7));
});

test('payload: to\'g\'ri parse, noto\'g\'ri rad', () => {
  assert.equal(L.makePayload(GID, 'PRO'), `sub:${GID}:PRO`);
  assert.deepEqual(L.parsePayload(`sub:${GID}:PRO`), { groupId: GID, plan: 'PRO' });
  for (const bad of [null, undefined, '', `sub:${GID}:FREE`, `sub:${GID}:pro`, `sub:${GID}`, `sub::PRO`,
    `sub:${GID}:PRO:x`, `x:${GID}:PRO`, `sub:GID!:PRO`, `sub:${GID}\n:PRO`, 'sub:1:PRO', `sub:${'a'.repeat(33)}:PRO`]) {
    assert.equal(L.parsePayload(bad), null, String(bad));
  }
});

test('deep-link start=pay_<groupId>_<plan> va callback_data regexlari', () => {
  assert.equal(L.payStartParam(GID, 'MAX'), `pay_${GID}_MAX`);
  assert.deepEqual(L.parsePayStart(`pay_${GID}_MAX`), { groupId: GID, plan: 'MAX' });
  for (const bad of ['', 'pay_', `pay_${GID}_FREE`, `pay_${GID}`, `pay_../x_PRO`, `pay_${GID}_PRO_x`, `login`]) {
    assert.equal(L.parsePayStart(bad), null, bad);
  }
  assert.equal(L.parseStarsCallback('tarif:stars:PRO'), 'PRO');
  assert.equal(L.parseStarsCallback('tarif:stars:FREE'), null);
  assert.deepEqual(L.parseDecision(L.decisionData('ok', GID)), { action: 'ok', paymentId: GID });
  assert.equal(L.parseDecision('pay:ok:../../x'), null);
  assert.equal(L.parseDecision('pay:yes:' + GID), null);
});

test('checkInvoice: valyuta XTR va summa joriy narxga teng', () => {
  const p = `sub:${GID}:PLUS`;
  assert.deepEqual(L.checkInvoice(p, 'XTR', 100, 100), { target: { groupId: GID, plan: 'PLUS' }, error: null });
  assert.equal(L.checkInvoice(p, 'UZS', 100, 100).error, 'price_changed');
  assert.equal(L.checkInvoice(p, 'XTR', 99, 100).error, 'price_changed');   // narx o'zgargan
  assert.equal(L.checkInvoice(p, 'XTR', 100, undefined).error, 'price_changed'); // narx olib tashlangan
  assert.equal(L.checkInvoice(p, 'XTR', 0, 0).error, 'price_changed');
  assert.deepEqual(L.checkInvoice('boshqa', 'XTR', 100, 100), { target: null, error: 'bad_invoice' });
});

test('narx env: musbat butun son, aks holda sotilmaydi', () => {
  assert.equal(L.parsePrice('50000'), 50000);
  for (const bad of [undefined, '', ' ', '0', '-5', '1.5', '1e3', 'abc', '0x10', '050', '99999999999999']) {
    assert.equal(L.parsePrice(bad), null, String(bad));
  }
  const cfg = L.loadBillingConfig({
    BILLING_ENABLED: '1', TARIF_PLUS_NARX: '10000', TARIF_PRO_NARX: '-1', TARIF_MAX_NARX: '',
    TOLOV_KARTA: '8600 0000 0000 0000', TOLOV_KARTA_EGASI: 'Ism F', TARIF_PLUS_STARS: '100', TARIF_PRO_STARS: '2.5',
  });
  assert.equal(cfg.enabled, true);
  assert.deepEqual(cfg.prices, { PLUS: 10000 });
  assert.deepEqual(cfg.starsPrices, { PLUS: 100 });
  assert.deepEqual(cfg.invalid, ['TARIF_PRO_NARX', 'TARIF_PRO_STARS']); // bo'sh xato emas, noto'g'ri — xato
  assert.deepEqual(cfg.card, { number: '8600 0000 0000 0000', holder: 'Ism F' });
  assert.equal(cfg.starsEnabled, false); // TOLOV_STARS=1 yo'q
  assert.equal(L.cardPrice(cfg, 'PLUS'), 10000);
  assert.equal(L.cardPrice(cfg, 'PRO'), null);
  assert.equal(L.starsPrice(cfg, 'PLUS'), null); // narx bor, lekin TOLOV_STARS o'chiq
  assert.deepEqual(L.sellablePlans(cfg), ['PLUS']);
});

test('karta raqami yo\'q → karta narxi yo\'q; hammasi bo\'sh → hech narsa sotilmaydi', () => {
  const cfg = L.loadBillingConfig({ TARIF_PLUS_NARX: '10000' });
  assert.equal(cfg.card, null);
  assert.equal(L.cardPrice(cfg, 'PLUS'), null);
  assert.deepEqual(L.sellablePlans(L.loadBillingConfig({})), []);
  assert.equal(L.loadBillingConfig({}).enabled, false);
  assert.equal(L.loadBillingConfig({ BILLING_ENABLED: 'true' }).enabled, false); // faqat aynan '1'
});

test('parseGrantArgs: validatsiya', () => {
  assert.deepEqual(L.parseGrantArgs('/grant -1001234567890 pro 30'), { groupTelegramId: -1001234567890n, plan: 'PRO', days: 30 });
  assert.equal(L.parseGrantArgs('/grant 5 MAX 1').plan, 'MAX');
  for (const bad of ['/grant', '/grant -100 pro', '/grant -100 free 30', '/grant -100 pro 0', '/grant -100 pro 3651',
    '/grant abc pro 30', '/grant -100 pro 3.5', '/grant -100 pro -3', '/grant -100 pro 30 x']) {
    assert.equal(L.parseGrantArgs(bad), null, bad);
  }
});

test('isAdminCallback: admin bo\'lmagan rad, admin sozlanmagan bo\'lsa hamma rad', () => {
  assert.equal(L.isAdminCallback(123, 123n), true);
  assert.equal(L.isAdminCallback(123n, 123n), true);
  assert.equal(L.isAdminCallback(124, 123n), false);
  assert.equal(L.isAdminCallback(123, null), false);
  assert.equal(L.isAdminCallback(undefined, 123n), false);
});

// ─── Flag o'chiq: gate hech narsa qilmaydi ───────────────────────────────────

// Har qanday DB murojaatida yiqiladi — flag o'chiqligida bazaga tegilmasligini isbotlaydi.
const explodingPrisma = new Proxy({}, { get() { throw new Error('flag o\'chiq, lekin bazaga murojaat qilindi'); } });

test('BILLING_ENABLED o\'chiq: gate/recordUsage/gateCount bazaga tegmaydi va hamma narsaga ruxsat', async () => {
  const svc = new BillingService(explodingPrisma, L.loadBillingConfig({}));
  assert.equal(svc.enabled, false);
  assert.equal((await svc.gate(GID, 'voice')).allowed, true);
  assert.equal((await svc.gateCount(GID, 'accounts', 9999)).allowed, true);
  await svc.recordUsage(GID, 'voice'); // yiqilmasa — DB'ga tegmadi
});

test('BILLING_ENABLED=1: gate hisoblagich va planga qarab hal qiladi', async () => {
  const calls = [];
  const prisma = {
    groupSubscription: { findUnique: async () => ({ plan: 'PLUS', expiresAt: inDays(5) }) },
    usageCounter: {
      findUnique: async ({ where }) => { calls.push(where.groupId_feature_period); return { count: 30 }; },
    },
  };
  const svc = new BillingService(prisma, L.loadBillingConfig({ BILLING_ENABLED: '1' }));
  const g = await svc.gate(GID, 'voice', NOW);
  assert.equal(g.plan, 'PLUS');
  assert.equal(g.allowed, true); // PLUS 300, ishlatilgan 30
  assert.deepEqual(calls, [{ groupId: GID, feature: 'voice', period: '2026-10' }]);

  const free = new BillingService({ ...prisma, groupSubscription: { findUnique: async () => null } },
    L.loadBillingConfig({ BILLING_ENABLED: '1' }));
  const g2 = await free.gate(GID, 'voice', NOW);
  assert.equal(g2.allowed, false); // FREE 30/30
  assert.equal(L.limitReachedText('voice', g2), '🎙 Oylik ovozli limit tugadi (30/30). /tarif');
});

test('recordUsage: atomik upsert + increment', async () => {
  let arg;
  const prisma = { usageCounter: { upsert: async (a) => { arg = a; } } };
  await new BillingService(prisma, L.loadBillingConfig({ BILLING_ENABLED: '1' })).recordUsage(GID, 'voice', NOW);
  assert.deepEqual(arg.update, { count: { increment: 1 } });
  assert.equal(arg.create.count, 1);
  assert.equal(arg.create.period, '2026-10');
});

// Regressiya: limit tugagach har ovozli xabarga «limit tugadi» javobi ketardi.
test('shouldSendLimitNotice: guruhga 24 soatda bir marta', () => {
  const last = new Map();
  const t = NOW.getTime();
  assert.equal(L.shouldSendLimitNotice(last, GID, t), true);
  assert.equal(L.shouldSendLimitNotice(last, GID, t + 60_000), false);
  assert.equal(L.shouldSendLimitNotice(last, 'boshqa-guruh', t + 60_000), true);
  assert.equal(L.shouldSendLimitNotice(last, GID, t + DAY - 1), false);
  assert.equal(L.shouldSendLimitNotice(last, GID, t + DAY), true);
});
