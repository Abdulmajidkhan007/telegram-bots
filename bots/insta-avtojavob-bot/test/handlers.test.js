'use strict';

// Haqiqiy handlerlar, soxta bot bilan (internetga chiqmaydi).

const test = require('node:test');
const assert = require('node:assert');
const { Store } = require('../src/store');
const { createHandlers } = require('../src/handlers');

const ADMIN = 100;
const USER = 200;

function setup({ channel = '@kanal_test', memberStatus = 'member', adminIds = [ADMIN], failAdminSend = false } = {}) {
  const calls = [];
  const bot = {
    sendMessage: async (chat, text, opts) => { calls.push({ m: 'sendMessage', chat, text, opts }); },
    editMessageText: async (text, opts) => { calls.push({ m: 'edit', text, opts }); },
    editMessageReplyMarkup: async (markup, opts) => { calls.push({ m: 'editMarkup', markup, opts }); },
    answerCallbackQuery: async (id, opts) => { calls.push({ m: 'answer', id, opts }); },
    getChatMember: async () => { calls.push({ m: 'getChatMember' }); return { status: memberStatus }; },
    sendPhoto: async (chat, fileId, opts) => {
      if (failAdminSend && chat === ADMIN) throw new Error('chat not found');
      calls.push({ m: 'sendPhoto', chat, fileId, opts });
    },
    sendDocument: async (chat, fileId, opts) => { calls.push({ m: 'sendDocument', chat, fileId, opts }); },
  };
  const config = { channel, adminIds, cardNumber: '8600 0000 0000 0000', cardHolder: 'TEST' };
  const store = new Store(null);
  const silent = { error() {}, warn() {} };
  const h = createHandlers({ bot, store, config, log: silent });
  const msg = (id, extra) => ({ chat: { id, type: 'private' }, from: { id, first_name: 'T' }, ...extra });
  const cb = (id, data) => ({
    id: 'q', data, from: { id, first_name: 'T' },
    message: { message_id: 1, chat: { id, type: 'private' } },
  });
  return { h, calls, store, msg, cb };
}

const last = (calls, m) => [...calls].reverse().find((c) => c.m === m);

test('bepul qadam: obuna bo‘lmasa — obuna tugmasi, bo‘lsa — 1-qadam', async () => {
  const a = setup({ memberStatus: 'left' });
  await a.h.onCallback(a.cb(USER, 'free:0'));
  assert.match(last(a.calls, 'edit').text, /obuna bo'ling/);
  assert.match(JSON.stringify(last(a.calls, 'edit').opts.reply_markup), /t\.me\/kanal_test/);

  const b = setup({ memberStatus: 'member' });
  await b.h.onCallback(b.cb(USER, 'free:0'));
  assert.match(last(b.calls, 'edit').text, /1\/3/);
});

test('pullik qism obunasiz ham ochiladi; kanal sozlanmasa getChatMember chaqirilmaydi', async () => {
  const a = setup({ channel: null });
  await a.h.onCallback(a.cb(USER, 'free:0'));
  assert.ok(!a.calls.some((c) => c.m === 'getChatMember'));
  assert.match(last(a.calls, 'edit').text, /1\/3/);
});

test('getChatMember xatosi foydalanuvchiga aytiladi (jim yutilmaydi)', async () => {
  const a = setup();
  a.h = createHandlers({
    bot: { ...{ editMessageText: async (t, o) => a.calls.push({ m: 'edit', text: t, opts: o }), answerCallbackQuery: async () => {}, getChatMember: async () => { throw new Error('forbidden'); } } },
    store: a.store, config: { channel: '@kanal_test', adminIds: [ADMIN] }, log: { error() {} },
  });
  await a.h.onCallback(a.cb(USER, 'free:0'));
  assert.match(last(a.calls, 'edit').text, /tekshirib bo'lmadi/);
});

test('to‘lamagan foydalanuvchiga qo‘llanma/shablon yopiq', async () => {
  const a = setup();
  await a.h.onCallback(a.cb(USER, 'guide:0'));
  assert.match(last(a.calls, 'edit').text, /To'liq qo'llanma/);
  await a.h.onCallback(a.cb(USER, 'tpl:shop'));
  assert.doesNotMatch(last(a.calls, 'edit').text, /ROL:/);
});

test('to‘liq oqim: sotib olish -> chek -> admin tasdiqlaydi -> shablon ochiladi', async () => {
  const a = setup();
  await a.h.onCallback(a.cb(USER, 'buy:start'));
  assert.match(last(a.calls, 'edit').text, /8600 0000 0000 0000/);
  assert.match(last(a.calls, 'edit').text, /49 000/);

  await a.h.onMessage(a.msg(USER, { photo: [{ file_id: 's' }, { file_id: 'big' }] }));
  const sent = last(a.calls, 'sendPhoto');
  assert.strictEqual(sent.chat, ADMIN);
  assert.strictEqual(sent.fileId, 'big');
  assert.match(JSON.stringify(sent.opts.reply_markup), /pay:ok:1/);

  await a.h.onCallback(a.cb(ADMIN, 'pay:ok:1'));
  assert.strictEqual(a.store.data.users[String(USER)].paid, true);
  assert.strictEqual(last(a.calls, 'sendMessage').chat, USER);

  await a.h.onCallback(a.cb(USER, 'tpl:shop'));
  assert.match(last(a.calls, 'edit').text, /avtomatik javob/);
});

test('oddiy foydalanuvchi to‘lovni tasdiqlay olmaydi (soxta callback)', async () => {
  const a = setup();
  await a.h.onCallback(a.cb(USER, 'buy:start'));
  await a.h.onMessage(a.msg(USER, { photo: [{ file_id: 'x' }] }));
  await a.h.onCallback(a.cb(USER, 'pay:ok:1'));
  assert.strictEqual(a.store.data.users[String(USER)].paid, false);
  assert.strictEqual(last(a.calls, 'answer').opts.text, "Ruxsat yo'q");
});

test('chek adminga yetmasa — foydalanuvchiga aytiladi va qayta yuborishi mumkin', async () => {
  const a = setup({ failAdminSend: true });
  await a.h.onCallback(a.cb(USER, 'buy:start'));
  await a.h.onMessage(a.msg(USER, { photo: [{ file_id: 'x' }] }));
  assert.match(last(a.calls, 'sendMessage').text, /yetkazib bo'lmadi/);
  assert.strictEqual(a.store.data.users[String(USER)].awaiting, 'receipt');
});

test('chek o‘rniga matn yuborilsa — chek so‘raladi', async () => {
  const a = setup();
  await a.h.onCallback(a.cb(USER, 'buy:start'));
  await a.h.onMessage(a.msg(USER, { text: 'to‘ladim' }));
  assert.match(last(a.calls, 'sendMessage').text, /chekni rasm/);
});

test('admin: narx o‘zgartirish eslatma bilan; noto‘g‘ri qiymat rad etiladi', async () => {
  const a = setup();
  await a.h.onCallback(a.cb(ADMIN, 'adm:price:guide'));
  await a.h.onMessage(a.msg(ADMIN, { text: 'juda arzon' }));
  assert.match(last(a.calls, 'sendMessage').text, /butun son/);
  await a.h.onMessage(a.msg(ADMIN, { text: '59000' }));
  const text = last(a.calls, 'sendMessage').text;
  assert.match(text, /59 000/);
  assert.match(text, /birga ko'rib chiqing/);
  assert.strictEqual(a.store.data.prices.guide, 59000);
});

test('admin panel va narx kiritish oddiy foydalanuvchiga yopiq', async () => {
  const a = setup();
  await a.h.onAdmin(a.msg(USER, { text: '/admin' }));
  assert.ok(!a.calls.some((c) => c.m === 'sendMessage'));
  await a.h.onCallback(a.cb(USER, 'adm:price:guide'));
  assert.strictEqual(a.store.data.users[String(USER)].awaiting, null);
  assert.strictEqual(last(a.calls, 'answer').opts.text, "Ruxsat yo'q");
});

test('«o‘zim sozlab beraman» arizasi adminga tushadi', async () => {
  const a = setup();
  await a.h.onCallback(a.cb(USER, 'setup:apply'));
  await a.h.onMessage(a.msg(USER, { text: "Restoran, @mening_restoran, DM'ga javob kerak" }));
  const toAdmin = a.calls.filter((c) => c.m === 'sendMessage' && c.chat === ADMIN);
  assert.match(toAdmin[0].text, /Sozlash arizasi #1/);
  assert.match(toAdmin[0].text, /tg:\/\/user\?id=200/);
  assert.strictEqual(a.store.data.applications.length, 1);
});

test('foydalanuvchi matnidagi HTML escape qilinadi', async () => {
  const a = setup();
  await a.h.onCallback(a.cb(USER, 'setup:apply'));
  await a.h.onMessage(a.msg(USER, { text: '<b>hack</b> do\'kon' }));
  const toAdmin = a.calls.find((c) => c.m === 'sendMessage' && c.chat === ADMIN);
  assert.match(toAdmin.text, /&lt;b&gt;hack/);
});
