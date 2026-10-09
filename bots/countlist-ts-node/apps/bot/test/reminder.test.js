'use strict';

// Ishga tushirish: npm test (apps/bot ichida). Baza va Telegram soxta — internetga chiqmaydi.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  tashkentNow, isDue, lastSentOnEnable, isGoneError, statusText, plainStats,
} = require('../dist/services/reminder.logic');

test('tashkentNow: UTC+5, sana yarim tunda almashadi', () => {
  assert.deepEqual(tashkentNow(new Date('2026-10-09T17:00:00Z')), { date: '2026-10-09', hour: 22 });
  assert.deepEqual(tashkentNow(new Date('2026-10-09T19:30:00Z')), { date: '2026-10-10', hour: 0 });
});

test('isDue: soat yetganda, kuniga bir marta', () => {
  const row = { enabled: true, hour: 22, lastSent: null };
  assert.equal(isDue(row, { date: '2026-10-09', hour: 21 }), false);
  assert.equal(isDue(row, { date: '2026-10-09', hour: 22 }), true);
  assert.equal(isDue(row, { date: '2026-10-09', hour: 23 }), true); // bot 22:00 da o'chiq bo'lgan
  assert.equal(isDue({ ...row, lastSent: '2026-10-09' }, { date: '2026-10-09', hour: 23 }), false);
  assert.equal(isDue({ ...row, lastSent: '2026-10-08' }, { date: '2026-10-09', hour: 22 }), true);
  assert.equal(isDue({ ...row, enabled: false }, { date: '2026-10-09', hour: 22 }), false);
});

test("lastSentOnEnable: 22:00 dan keyin yoqilsa bugun yuborilmaydi", () => {
  assert.equal(lastSentOnEnable(22, { date: '2026-10-09', hour: 23 }), '2026-10-09');
  assert.equal(lastSentOnEnable(22, { date: '2026-10-09', hour: 10 }), null);
});

test('isGoneError: bloklangan / chiqarilgan', () => {
  assert.equal(isGoneError({ response: { error_code: 403, description: 'Forbidden: bot was blocked by the user' } }), true);
  assert.equal(isGoneError({ response: { error_code: 400, description: 'Bad Request: chat not found' } }), true);
  assert.equal(isGoneError({ response: { error_code: 429, description: 'Too Many Requests' } }), false);
});

test('statusText va plainStats', () => {
  assert.match(statusText(true, 22), /22:00/);
  assert.match(statusText(false, 22), /o'chirilgan/);
  assert.equal(plainStats('💰 Jami: *50 000* `x` _y_'), '💰 Jami: 50 000 x y');
});

test("ReminderService: vaqti kelgan chatga yuboradi, bloklagan bo'lsa o'chiradi", async () => {
  const { ReminderService } = require('../dist/services/reminder.service');
  const executed = [];
  const prisma = {
    $executeRawUnsafe: async () => 0,
    $queryRaw: async () => [
      { chat_id: 1n, enabled: true, hour: 0, last_sent: null },
      { chat_id: 2n, enabled: true, hour: 0, last_sent: null },
    ],
    $executeRaw: async (strings, ...vals) => { executed.push([strings.join('?').replace(/\s+/g, ' ').trim(), vals]); },
    group: { findUnique: async () => null },
  };
  const sent = [];
  const telegram = {
    sendMessage: async (chatId) => {
      if (chatId === 2) throw Object.assign(new Error('blocked'), { response: { error_code: 403, description: 'Forbidden: bot was blocked by the user' } });
      sent.push(chatId);
    },
  };
  const svc = new ReminderService(prisma, {});
  await svc.tick(telegram);
  assert.deepEqual(sent, [1]);
  // Ikkalasi ham avval "yuborildi" deb belgilangan; 2-chat o'chirilgan (enabled=false).
  assert.equal(executed.filter(([sql]) => sql.startsWith('UPDATE')).length, 2);
  const disabled = executed.find(([sql, vals]) => sql.startsWith('INSERT') && vals[0] === 2n);
  assert.ok(disabled, "bloklagan chat uchun eslatma o'chirilmadi");
  assert.equal(disabled[1][1], false);
});

// Regressiya: Railway'da ishga tushishdagi CREATE TABLE o'tmagan, keyin har /reminder
// "relation bot_reminders does not exist" bergan — sababi ko'rinmagan, qayta urinilmagan.
test("ReminderService: jadval yaratilmasa sababni aytadi va keyingi safar qayta urinadi", async () => {
  const { ReminderService } = require('../dist/services/reminder.service');
  let attempts = 0;
  const prisma = {
    $executeRawUnsafe: async () => { attempts += 1; if (attempts === 1) throw new Error('permission denied for schema public'); return 0; },
    $queryRaw: async () => [],
  };
  const svc = new ReminderService(prisma, {});
  await assert.rejects(() => svc.get(1n), /bot_reminders jadvali yaratilmadi: permission denied for schema public/);
  assert.equal(await svc.get(1n), null);   // 2-urinish o'tdi
  await svc.get(1n);
  assert.equal(attempts, 2);               // muvaffaqiyatdan keyin qayta yaratilmaydi
});

test('soat tanlash: faqat ruxsat etilgan soatlar', () => {
  const { isValidHour, HOUR_OPTIONS } = require('../dist/services/reminder.logic');
  assert.ok(HOUR_OPTIONS.includes(22));
  assert.equal(isValidHour(21), true);
  assert.equal(isValidHour(3), false);
  assert.equal(isValidHour(99), false);
  assert.equal(isValidHour('22'), false);
});
