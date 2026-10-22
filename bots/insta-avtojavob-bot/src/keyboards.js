'use strict';

// Inline tugmalar. callback_data formati index.js dagi CALLBACK_RULES bilan mos.

const { TEMPLATES } = require('./templates');
const { formatSom } = require('./format');

const btn = (text, callback_data) => ({ text, callback_data });

function mainMenu(prices, user) {
  return {
    inline_keyboard: [
      [btn('🆓 Bepul qadamlar', 'free:0')],
      [btn(user.paid ? "📘 To'liq qo'llanma" : `💎 To'liq qo'llanma — ${formatSom(prices.guide)}`, user.paid ? 'guide:0' : 'buy:info')],
      [btn("🛠 O'zim sozlab beraman", 'setup:info')],
    ],
  };
}

function subscribeKeyboard(channel) {
  return {
    inline_keyboard: [
      [{ text: "📢 Kanalga obuna bo'lish", url: `https://t.me/${channel.slice(1)}` }],
      [btn('✅ Tekshirish', 'free:0')],
      [btn('🏠 Bosh menyu', 'm:home')],
    ],
  };
}

function pager(prefix, index, total, extraRow) {
  const nav = [];
  if (index > 0) nav.push(btn('⬅️ Orqaga', `${prefix}:${index - 1}`));
  if (index < total - 1) nav.push(btn('Oldinga ➡️', `${prefix}:${index + 1}`));
  const rows = [];
  if (nav.length) rows.push(nav);
  if (extraRow) rows.push(extraRow);
  rows.push([btn(`${index + 1}/${total}`, 'noop'), btn('🏠 Menyu', 'm:home')]);
  return { inline_keyboard: rows };
}

const freePager = (index, total, prices) =>
  pager('free', index, total, index === total - 1 ? [btn(`💎 To'liq qo'llanma — ${formatSom(prices.guide)}`, 'buy:info')] : null);

const guidePager = (index, total) =>
  pager('guide', index, total, index === total - 1 ? [btn('🧠 AI shablonlar', 'tpl:list')] : null);

function templateList() {
  return {
    inline_keyboard: [
      ...TEMPLATES.map((t) => [btn(t.title, `tpl:${t.key}`)]),
      [btn("📘 Qo'llanmaga", 'guide:0'), btn('🏠 Menyu', 'm:home')],
    ],
  };
}

const templateBack = () => ({
  inline_keyboard: [[btn('⬅️ Shablonlar', 'tpl:list'), btn('🏠 Menyu', 'm:home')]],
});

const buyKeyboard = () => ({
  inline_keyboard: [[btn("💳 To'lov qilish", 'buy:start')], [btn('🏠 Menyu', 'm:home')]],
});

const homeOnly = () => ({ inline_keyboard: [[btn('🏠 Menyu', 'm:home')]] });

const setupKeyboard = () => ({
  inline_keyboard: [[btn('📝 Ariza qoldirish', 'setup:apply')], [btn('🏠 Menyu', 'm:home')]],
});

function adminMenu() {
  return {
    inline_keyboard: [
      [btn('📊 Statistika', 'adm:stats'), btn("💳 Kutilayotgan to'lovlar", 'adm:pending')],
      [btn('💰 Narxlar', 'adm:prices')],
    ],
  };
}

function adminPrices(prices) {
  return {
    inline_keyboard: [
      [btn(`Qo'llanma: ${formatSom(prices.guide)}`, 'adm:price:guide')],
      [btn(`Sozlash (bir martalik): ${formatSom(prices.setup)}`, 'adm:price:setup')],
      [btn(`Sozlash (oylik): ${formatSom(prices.monthly)}`, 'adm:price:monthly')],
      [btn('⬅️ Admin', 'adm:home')],
    ],
  };
}

const paymentDecision = (id) => ({
  inline_keyboard: [[btn('✅ Tasdiqlash', `pay:ok:${id}`), btn('❌ Rad etish', `pay:no:${id}`)]],
});

module.exports = {
  mainMenu, subscribeKeyboard, freePager, guidePager, templateList, templateBack,
  buyKeyboard, homeOnly, setupKeyboard, adminMenu, adminPrices, paymentDecision,
};
