'use strict';

// Biznes mantiq: foydalanuvchi, to'lov oqimi, ariza, narx, statistika.
// Telegram'ga bog'liq emas — shuning uchun to'liq test qilinadi.

const PRICE_KEYS = ['guide', 'setup', 'monthly'];
const MIN_PRICE = 1000;
const MAX_PRICE = 100000000;
const APPLY_COOLDOWN_MS = 10 * 60 * 1000;

const PRICE_LABELS = {
  guide: "To'liq qo'llanma",
  setup: "«O'zim sozlab beraman» (bir martalik)",
  monthly: "«O'zim sozlab beraman» (oylik)",
};

// Narx o'zgarganda qaysi narxlar bilan birga ko'rib chiqilishi kerak.
const RELATED = {
  guide: ['setup'],
  setup: ['guide', 'monthly'],
  monthly: ['setup'],
};

function ensureUser(store, from, now = Date.now()) {
  const id = String(from.id);
  const name = [from.first_name, from.last_name].filter(Boolean).join(' ');
  let user = store.data.users[id];
  if (!user) {
    user = {
      id: from.id,
      firstSeen: now,
      subscribed: false,
      paid: false,
      awaiting: null, // 'receipt' | 'setup_note' | 'price:<key>'
      paymentId: null,
    };
    store.data.users[id] = user;
  }
  user.username = from.username || null;
  user.name = name;
  store.save();
  return user;
}

function parsePrice(text) {
  const digits = String(text).replace(/[\s,._]/g, '');
  if (!/^\d{1,9}$/.test(digits)) return null;
  const n = Number(digits);
  return n >= MIN_PRICE && n <= MAX_PRICE ? n : null;
}

function setPrice(store, key, value) {
  if (!PRICE_KEYS.includes(key)) throw new Error(`Noma'lum narx kaliti: ${key}`);
  const old = store.data.prices[key];
  store.data.prices[key] = value;
  store.save();
  return { old, value, related: RELATED[key] };
}

function priceReminder(key) {
  const names = [key, ...RELATED[key]].map((k) => `«${PRICE_LABELS[k]}»`);
  return `⚠️ ${names.join(' va ')} narxlarini birga ko'rib chiqing — ular bir-biriga bog'liq.`;
}

function findOpenPayment(store, userId) {
  return Object.values(store.data.payments).find(
    (p) => p.userId === userId && (p.status === 'awaiting_receipt' || p.status === 'pending')
  );
}

// Foydalanuvchi "sotib olish" bosdi: ochiq to'lov bo'lsa o'shani qaytaramiz.
function startPayment(store, user, now = Date.now()) {
  if (user.paid) return { error: 'already_paid' };
  const open = findOpenPayment(store, user.id);
  if (open && open.status === 'pending') return { error: 'pending', payment: open };
  let payment = open;
  if (!payment) {
    const id = store.nextId();
    payment = {
      id,
      userId: user.id,
      amount: store.data.prices.guide, // foydalanuvchiga ko'rsatilgan narx qotadi
      status: 'awaiting_receipt',
      createdAt: now,
    };
    store.data.payments[id] = payment;
  }
  user.awaiting = 'receipt';
  user.paymentId = payment.id;
  store.save();
  return { payment };
}

function submitReceipt(store, user, receipt, now = Date.now()) {
  const payment = store.data.payments[user.paymentId];
  if (user.awaiting !== 'receipt' || !payment || payment.status !== 'awaiting_receipt') {
    return { error: 'no_open_payment' };
  }
  payment.status = 'pending';
  payment.receipt = receipt; // { type: 'photo' | 'document', fileId }
  payment.submittedAt = now;
  user.awaiting = null;
  store.save();
  return { payment };
}

// Qabul qilinmay qolsa (adminlarga yetmadi) — foydalanuvchi qayta yuborsin.
function revertReceipt(store, user, payment) {
  payment.status = 'awaiting_receipt';
  delete payment.receipt;
  user.awaiting = 'receipt';
  store.save();
}

function decidePayment(store, paymentId, adminId, approve, now = Date.now()) {
  const payment = store.data.payments[paymentId];
  if (!payment) return { error: 'not_found' };
  if (payment.status !== 'pending') return { error: 'already_decided', payment };
  payment.status = approve ? 'approved' : 'rejected';
  payment.decidedBy = adminId;
  payment.decidedAt = now;
  const user = store.data.users[String(payment.userId)];
  if (approve && user) user.paid = true;
  if (!approve && user) {
    user.awaiting = null;
    user.paymentId = null;
  }
  store.save();
  return { payment, user };
}

function submitApplication(store, user, note, now = Date.now()) {
  const text = String(note).trim();
  if (text.length < 5 || text.length > 1000) return { error: 'bad_length' };
  const last = store.data.applications.filter((a) => a.userId === user.id).pop();
  if (last && now - last.createdAt < APPLY_COOLDOWN_MS) return { error: 'cooldown' };
  const application = {
    id: store.nextId(),
    userId: user.id,
    note: text,
    createdAt: now,
    prices: { setup: store.data.prices.setup, monthly: store.data.prices.monthly },
  };
  store.data.applications.push(application);
  user.awaiting = null;
  store.save();
  return { application };
}

// Adminga yetkazib bo'lmagan ariza saqlanib qolmasin — foydalanuvchi qayta urinsin.
function revertApplication(store, user, application) {
  store.data.applications = store.data.applications.filter((a) => a.id !== application.id);
  user.awaiting = 'setup_note';
  store.save();
}

function getStats(store) {
  const users = Object.values(store.data.users);
  const payments = Object.values(store.data.payments);
  const approved = payments.filter((p) => p.status === 'approved');
  return {
    users: users.length,
    subscribed: users.filter((u) => u.subscribed).length,
    paid: users.filter((u) => u.paid).length,
    pending: payments.filter((p) => p.status === 'pending').length,
    rejected: payments.filter((p) => p.status === 'rejected').length,
    revenue: approved.reduce((sum, p) => sum + p.amount, 0),
    applications: store.data.applications.length,
  };
}

module.exports = {
  PRICE_KEYS, PRICE_LABELS, MIN_PRICE, MAX_PRICE,
  ensureUser, parsePrice, setPrice, priceReminder,
  startPayment, submitReceipt, revertReceipt, decidePayment,
  submitApplication, revertApplication, getStats,
};
