'use strict';
// Ishga tushirish: npm test (bot papkasida). Telegram'ga chiqmaydi — bot soxta.
process.env.ADMIN_IDS = '111';
const test = require('node:test');
const assert = require('node:assert');
const storage = require('../src/services/storage');
const { config } = require('../src/config');
const { runBroadcast, withoutAdmins } = require('../src/services/broadcast');

test('withoutAdmins: admin ID lari chiqariladi (satr/son farqi muhim emas)', () => {
  assert.deepStrictEqual(withoutAdmins(['111', '222', '333'], ['111']), ['222', '333']);
  assert.deepStrictEqual(withoutAdmins(['111', '222'], [222]), ['111']);
  assert.deepStrictEqual(withoutAdmins(['1'], []), ['1']);
});

// Regressiya: manba kanal posti adminning o'ziga ham yuborilardi ("Userlar: 1/1" — admin).
test("runBroadcast: post adminga yuborilmaydi, oddiy userlarga yuboriladi", async () => {
  config.BROADCAST_RATE_PER_SEC = 1000;
  const orig = { u: storage.getPrivateUserIds, g: storage.getBroadcastGroupIds };
  storage.getPrivateUserIds = () => ['111', '222'];
  storage.getBroadcastGroupIds = () => [];
  const sent = [];
  const bot = { copyMessage: async (chatId) => { sent.push(String(chatId)); } };
  try {
    const res = await runBroadcast(bot, { mode: 'copy', target: 'all', source: { chatId: -100, messageId: 5 } });
    assert.deepStrictEqual(sent, ['222']);
    assert.strictEqual(res.userTotal, 1);
    assert.strictEqual(res.userSent, 1);
  } finally {
    storage.getPrivateUserIds = orig.u;
    storage.getBroadcastGroupIds = orig.g;
  }
});
