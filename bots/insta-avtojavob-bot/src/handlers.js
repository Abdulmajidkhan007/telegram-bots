'use strict';

// Telegram bilan ishlovchi qatlam. `bot` — node-telegram-bot-api namunasi (testda soxta).
// Barcha holat Store'da (qayta ishga tushsa ham yo'qolmaydi).

const { FREE_STEPS, PAID_PAGES } = require('./guide-text');
const { findTemplate, buildTemplate } = require('./templates');
const { escapeHtml, formatSom } = require('./format');
const kb = require('./keyboards');
const svc = require('./service');
const { parseCallback } = require('./router');

const HTML = { parse_mode: 'HTML', disable_web_page_preview: true };
const MEMBER_STATUSES = new Set(['member', 'administrator', 'creator']);

const WELCOME =
  '👋 <b>Salom!</b>\n\n' +
  "Men Instagram'ga <b>AI avto-javobni</b> tayyor xizmat (Chatplace, ManyChat kabi) " +
  "orqali ulashni bosqichma-bosqich o'rgataman.\n\n" +
  "🔒 Men sizdan Instagram parolini, SMS-kod yoki karta ma'lumotini <b>so'ramayman</b>.";

const isMember = (m) => MEMBER_STATUSES.has(m.status) || (m.status === 'restricted' && m.is_member === true);

function userLink(user) {
  const name = escapeHtml(user.name || user.username || String(user.id));
  const tag = user.username ? ` (@${escapeHtml(user.username)})` : '';
  return `<a href="tg://user?id=${user.id}">${name}</a>${tag}`;
}

function createHandlers({ bot, store, config, log = console }) {
  const isAdmin = (id) => config.adminIds.includes(id);
  const prices = () => store.data.prices;

  const send = (chatId, text, markup) =>
    bot.sendMessage(chatId, text, { ...HTML, ...(markup ? { reply_markup: markup } : {}) });

  // Xabarni tahrirlaydi; bo'lmasa yangisini yuboradi. Xato log'ga yoziladi.
  async function show(query, text, markup) {
    const { chat, message_id } = query.message;
    try {
      await bot.editMessageText(text, { ...HTML, chat_id: chat.id, message_id, reply_markup: markup });
    } catch (err) {
      const msg = String(err.message || err);
      if (msg.includes('message is not modified')) return;
      log.error('editMessageText xato:', msg);
      await send(chat.id, text, markup);
    }
  }

  // Har admin'ga fn(adminId) ni yuboradi; yetib borganlar sonini qaytaradi.
  async function toAdmins(fn) {
    let delivered = 0;
    for (const id of config.adminIds) {
      try {
        await fn(id);
        delivered += 1;
      } catch (err) {
        log.error(`Admin ${id} ga yuborib bo'lmadi:`, err.message || err);
      }
    }
    return delivered;
  }

  async function checkSubscription(user) {
    if (!config.channel) return true;
    const member = await bot.getChatMember(config.channel, user.id);
    user.subscribed = isMember(member);
    store.save();
    return user.subscribed;
  }

  const menuText = () => WELCOME;

  async function onStart(msg) {
    if (msg.chat.type !== 'private') return;
    const user = svc.ensureUser(store, msg.from);
    if (user.awaiting && user.awaiting !== 'receipt') {
      user.awaiting = null; // yarim qolgan ariza/narx kiritish bekor
      store.save();
    }
    await send(msg.chat.id, menuText(), kb.mainMenu(prices(), user));
  }

  async function onAdmin(msg) {
    if (msg.chat.type !== 'private' || !isAdmin(msg.from.id)) return;
    const user = svc.ensureUser(store, msg.from);
    if (user.awaiting && user.awaiting !== 'receipt') user.awaiting = null;
    store.save();
    await send(msg.chat.id, '🛠 <b>Admin panel</b>', kb.adminMenu());
  }

  const buyText = () =>
    "💎 <b>To'liq qo'llanma</b>\n\n" +
    "• Batafsil bosqichma-bosqich qo'llanma\n" +
    "• Biznes turlari bo'yicha AI «miya» shablonlari (blogger, do'kon, restoran, xizmat, ta'lim…)\n" +
    '• Xavfsizlik qoidalari shablonlarga kiritilgan\n' +
    '• Kanalga obuna shart emas\n\n' +
    `Narx: <b>${formatSom(prices().guide)}</b>`;

  async function sendPaymentToAdmin(adminId, payment, user) {
    const caption =
      `💳 <b>To'lov #${payment.id}</b>\n${userLink(user)}\n` +
      `Summa: <b>${formatSom(payment.amount)}</b>`;
    const opts = { ...HTML, caption, reply_markup: kb.paymentDecision(payment.id) };
    if (payment.receipt.type === 'photo') return bot.sendPhoto(adminId, payment.receipt.fileId, opts);
    return bot.sendDocument(adminId, payment.receipt.fileId, opts);
  }

  async function handleAdminView(query, view) {
    const chatId = query.message.chat.id;
    if (view === 'home') return show(query, '🛠 <b>Admin panel</b>', kb.adminMenu());
    if (view === 'prices') {
      return show(query, '💰 <b>Narxlar</b>\nO‘zgartirish uchun tanlang:', kb.adminPrices(prices()));
    }
    if (view === 'stats') {
      const s = svc.getStats(store);
      const text =
        '📊 <b>Statistika</b>\n\n' +
        `Foydalanuvchilar: ${s.users}\nKanalga obuna (tekshirilgan): ${s.subscribed}\n` +
        `Sotib olgan: ${s.paid}\nKutilayotgan to'lov: ${s.pending}\nRad etilgan: ${s.rejected}\n` +
        `Tushum (tasdiqlangan): <b>${formatSom(s.revenue)}</b>\nSozlash arizalari: ${s.applications}`;
      return show(query, text, kb.adminMenu());
    }
    const pending = Object.values(store.data.payments).filter((p) => p.status === 'pending');
    if (!pending.length) return show(query, "💳 Kutilayotgan to'lov yo'q.", kb.adminMenu());
    for (const p of pending) {
      const user = store.data.users[String(p.userId)];
      try {
        await sendPaymentToAdmin(chatId, p, user);
      } catch (err) {
        log.error(`To'lov #${p.id} ni ko'rsatib bo'lmadi:`, err.message || err);
      }
    }
    return undefined;
  }

  async function handlePay(query, action) {
    const result = svc.decidePayment(store, action.id, query.from.id, action.approve);
    if (result.error === 'not_found') return "To'lov topilmadi";
    if (result.error === 'already_decided') return `Allaqachon ko'rib chiqilgan (${result.payment.status})`;
    try {
      await bot.editMessageReplyMarkup(
        { inline_keyboard: [] },
        { chat_id: query.message.chat.id, message_id: query.message.message_id }
      );
    } catch (err) {
      log.error('Tugmalarni olib tashlab bo‘lmadi:', err.message || err);
    }
    const text = action.approve
      ? "✅ To'lov tasdiqlandi. To'liq qo'llanma ochildi."
      : "❌ To'lov rad etildi. Chek aniq ko'rinmagan bo'lishi mumkin — qayta urinib ko'ring yoki adminga yozing.";
    const markup = action.approve ? kb.mainMenu(prices(), result.user) : kb.buyKeyboard();
    try {
      await send(result.payment.userId, text, markup);
    } catch (err) {
      log.error(`Foydalanuvchi ${result.payment.userId} ga xabar bormadi:`, err.message || err);
      return 'Qaror saqlandi, lekin foydalanuvchiga xabar bormadi';
    }
    return action.approve ? 'Tasdiqlandi' : 'Rad etildi';
  }

  async function handleFree(query, user, index) {
    const i = Math.min(Math.max(index, 0), FREE_STEPS.length - 1);
    let ok = user.subscribed && i > 0;
    if (!ok) {
      try {
        ok = await checkSubscription(user);
      } catch (err) {
        log.error('getChatMember xato:', err.message || err);
        return show(query, "⚠️ Obunani tekshirib bo'lmadi. Birozdan keyin qayta urinib ko'ring.", kb.homeOnly());
      }
    }
    if (!ok) {
      return show(query, `Bepul qadamlar uchun ${escapeHtml(config.channel)} kanaliga obuna bo'ling, so'ng «Tekshirish»ni bosing.`, kb.subscribeKeyboard(config.channel));
    }
    return show(query, FREE_STEPS[i], kb.freePager(i, FREE_STEPS.length, prices()));
  }

  const lockedView = (query) => show(query, buyText(), kb.buyKeyboard());

  async function onCallback(query) {
    if (!query.message || query.message.chat.type !== 'private') {
      return bot.answerCallbackQuery(query.id);
    }
    let alert;
    try {
      const action = parseCallback(query.data);
      if (action) alert = await dispatch(query, action);
    } catch (err) {
      log.error('callback xato:', err.stack || err);
      alert = "Xatolik yuz berdi, qayta urinib ko'ring";
    }
    return bot.answerCallbackQuery(query.id, alert ? { text: alert } : undefined);
  }

  async function dispatch(query, action) {
    const user = svc.ensureUser(store, query.from);
    const admin = isAdmin(query.from.id);
    switch (action.type) {
      case 'home':
        return show(query, menuText(), kb.mainMenu(prices(), user));
      case 'free':
        return handleFree(query, user, action.index);
      case 'guide': {
        if (!user.paid) return lockedView(query);
        const i = Math.min(action.index, PAID_PAGES.length - 1);
        return show(query, PAID_PAGES[i], kb.guidePager(i, PAID_PAGES.length));
      }
      case 'tplList':
        if (!user.paid) return lockedView(query);
        return show(query, '🧠 <b>AI shablonlar</b>\nBiznes turingizni tanlang:', kb.templateList());
      case 'tpl': {
        if (!user.paid) return lockedView(query);
        const tpl = findTemplate(action.key);
        return show(query, `${tpl.title}\n\n<pre>${escapeHtml(buildTemplate(tpl))}</pre>`, kb.templateBack());
      }
      case 'buyInfo':
        if (user.paid) return show(query, menuText(), kb.mainMenu(prices(), user));
        return lockedView(query);
      case 'buyStart':
        return handleBuyStart(query, user);
      case 'setupInfo':
        return show(query, setupText(), kb.setupKeyboard());
      case 'setupApply':
        user.awaiting = 'setup_note';
        store.save();
        return show(query, "📝 Biznesingiz haqida bitta xabarda yozing: turi, Instagram nomi, nima kerak. Men uni egasiga yetkazaman.", kb.homeOnly());
      case 'admin':
        return admin ? handleAdminView(query, action.view) : "Ruxsat yo'q";
      case 'adminPrice':
        if (!admin) return "Ruxsat yo'q";
        user.awaiting = `price:${action.key}`;
        store.save();
        return show(query, `💰 «${svc.PRICE_LABELS[action.key]}» uchun yangi narxni so'mda yozing (masalan: 59000).`, kb.adminPrices(prices()));
      case 'pay':
        return admin ? handlePay(query, action) : "Ruxsat yo'q";
      default:
        return undefined;
    }
  }

  const setupText = () =>
    "🛠 <b>O'zim sozlab beraman</b>\n\nAvto-javobni siz uchun to'liq sozlab beraman.\n\n" +
    `Bir martalik: <b>${formatSom(prices().setup)}</b>\nOylik qo'llab-quvvatlash: <b>${formatSom(prices().monthly)}</b>/oy\n\n` +
    "Ariza qoldiring — egasi o'zi Telegramda yozadi.";

  async function handleBuyStart(query, user) {
    const res = svc.startPayment(store, user);
    if (res.error === 'already_paid') return show(query, menuText(), kb.mainMenu(prices(), user));
    if (res.error === 'pending') {
      return show(query, "⏳ Chekingiz tekshirilmoqda. Tasdiqlangach xabar keladi.", kb.homeOnly());
    }
    if (!config.cardNumber) {
      log.error('CARD_NUMBER sozlanmagan — to‘lov rekvizitlarini ko‘rsatib bo‘lmaydi');
      return show(query, "⚠️ To'lov rekvizitlari hali sozlanmagan. Keyinroq urinib ko'ring.", kb.homeOnly());
    }
    const holder = config.cardHolder ? `\nEgasi: ${escapeHtml(config.cardHolder)}` : '';
    return show(
      query,
      `💳 <b>To'lov</b>\n\nSumma: <b>${formatSom(res.payment.amount)}</b>\nKarta: <code>${escapeHtml(config.cardNumber)}</code>${holder}\n\n` +
        "O'tkazgach <b>chek rasmini</b> (skrinshot) shu chatga yuboring. Admin tekshirib, qo'llanmani ochadi.",
      kb.homeOnly()
    );
  }

  async function handleReceipt(msg, user) {
    let receipt = null;
    if (msg.photo && msg.photo.length) {
      receipt = { type: 'photo', fileId: msg.photo[msg.photo.length - 1].file_id };
    } else if (msg.document && /^(image\/|application\/pdf)/.test(msg.document.mime_type || '')) {
      receipt = { type: 'document', fileId: msg.document.file_id };
    }
    if (!receipt) return send(msg.chat.id, 'Iltimos, chekni rasm (skrinshot) yoki PDF ko‘rinishida yuboring.');
    const res = svc.submitReceipt(store, user, receipt);
    if (res.error) return send(msg.chat.id, 'Ochiq to‘lov topilmadi. /start dan boshlang.');
    const delivered = await toAdmins((id) => sendPaymentToAdmin(id, res.payment, user));
    if (!delivered) {
      svc.revertReceipt(store, user, res.payment);
      return send(msg.chat.id, "⚠️ Chekni adminga yetkazib bo'lmadi. Birozdan keyin qayta yuboring.");
    }
    return send(msg.chat.id, '✅ Chek qabul qilindi. Admin tekshirgach xabar beraman.', kb.homeOnly());
  }

  async function handleSetupNote(msg, user) {
    const res = svc.submitApplication(store, user, msg.text);
    if (res.error === 'bad_length') return send(msg.chat.id, 'Ariza 5–1000 belgi bo‘lsin. Qayta yozing.');
    if (res.error === 'cooldown') return send(msg.chat.id, 'Yaqinda ariza yuborgansiz. Birozdan keyin urinib ko‘ring.', kb.homeOnly());
    const text =
      `📝 <b>Sozlash arizasi #${res.application.id}</b>\n${userLink(user)}\n\n${escapeHtml(res.application.note)}`;
    const delivered = await toAdmins((id) => send(id, text));
    if (!delivered) {
      svc.revertApplication(store, user, res.application);
      return send(msg.chat.id, "⚠️ Arizani yetkazib bo'lmadi. Birozdan keyin qayta yuboring.");
    }
    return send(msg.chat.id, '✅ Ariza yuborildi. Egasi tez orada Telegramda yozadi.', kb.homeOnly());
  }

  async function handlePriceInput(msg, user) {
    const key = user.awaiting.slice('price:'.length);
    const value = svc.parsePrice(msg.text);
    if (value === null) {
      return send(msg.chat.id, `Narx ${svc.MIN_PRICE}–${svc.MAX_PRICE} oralig‘ida butun son bo‘lsin. Qayta yozing.`);
    }
    const res = svc.setPrice(store, key, value);
    user.awaiting = null;
    store.save();
    return send(
      msg.chat.id,
      `✅ «${svc.PRICE_LABELS[key]}»: ${formatSom(res.old)} → <b>${formatSom(res.value)}</b>\n\n${svc.priceReminder(key)}`,
      kb.adminPrices(prices())
    );
  }

  async function onMessage(msg) {
    if (msg.chat.type !== 'private' || !msg.from) return undefined;
    if (msg.text && msg.text.startsWith('/')) return undefined; // buyruqlar onText'da
    const user = svc.ensureUser(store, msg.from);
    try {
      if (user.awaiting === 'receipt') return await handleReceipt(msg, user);
      if (user.awaiting === 'setup_note' && msg.text) return await handleSetupNote(msg, user);
      if (user.awaiting && user.awaiting.startsWith('price:') && isAdmin(user.id) && msg.text) {
        return await handlePriceInput(msg, user);
      }
    } catch (err) {
      log.error('message xato:', err.stack || err);
      return send(msg.chat.id, "Xatolik yuz berdi, qayta urinib ko'ring.");
    }
    return send(msg.chat.id, 'Menyu uchun /start ni bosing.');
  }

  return { onStart, onAdmin, onCallback, onMessage };
}

module.exports = { createHandlers, isMember, WELCOME };
