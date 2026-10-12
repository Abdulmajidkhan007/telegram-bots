'use strict';

// Regressiya: defaultSession'siz ctx.session undefined edi va guruhdagi har
// matn xabari handler'da TypeError bilan yiqilardi (xarajat yozilmasdi).
// Haqiqiy Telegraf bilan, tarmoqsiz (handleUpdate).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Telegraf } = require('telegraf');
const { botSession } = require('../dist/utils/session');

test("yangi foydalanuvchida ctx.session bo'sh obyekt", async () => {
  const bot = new Telegraf('1:x');
  bot.botInfo = { id: 42, is_bot: true, first_name: 'B', username: 'b' };
  let ichida = 'chaqirilmadi';
  bot.use(botSession());
  bot.on('text', (ctx) => { ichida = ctx.session; });
  await bot.handleUpdate({
    update_id: 1,
    message: { message_id: 1, date: 0, chat: { id: -100, type: 'supergroup', title: 'G' },
      from: { id: 7, is_bot: false, first_name: 'U' }, text: '- 10 ming taksiga' },
  });
  assert.deepEqual(ichida, {});
});
