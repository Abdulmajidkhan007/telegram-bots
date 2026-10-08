'use strict';

// Ishga tushirish: npm test (apps/bot ichida). Telegram'ga chiqmaydi.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DESCRIPTION, SHORT_DESCRIPTION, USER_COMMANDS, ADMIN_COMMANDS } = require('../dist/profile');

test('profil matnlari Telegram chegarasida', () => {
  assert.ok(DESCRIPTION.length <= 512, `description ${DESCRIPTION.length}`);
  assert.ok(SHORT_DESCRIPTION.length <= 120, `short ${SHORT_DESCRIPTION.length}`);
  for (const c of ADMIN_COMMANDS) {
    assert.match(c.command, /^[a-z0-9_]{1,32}$/);
    assert.ok(c.description.length >= 1 && c.description.length <= 256);
  }
  assert.ok(ADMIN_COMMANDS.length <= 100);
});

// Regressiya: /start va /help avval /limit, /settings ni ko'rsatardi — bunday
// buyruq yo'q edi. Menyudagi har buyruq kodda haqiqatan ro'yxatdan o'tgan bo'lsin.
test("menyudagi har buyruqning handleri bor", () => {
  const dir = path.join(__dirname, '..', 'src', 'commands');
  const src = fs.readdirSync(dir).map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  const registered = new Set([...src.matchAll(/bot\.command\('([a-z0-9_]+)'/g)].map((m) => m[1]));
  if (/bot\.start\(/.test(src)) registered.add('start');
  for (const c of ADMIN_COMMANDS) assert.ok(registered.has(c.command), `/${c.command} uchun handler yo'q`);
});

test("admin buyruqlari oddiy foydalanuvchi menyusida yo'q", () => {
  const user = new Set(USER_COMMANDS.map((c) => c.command));
  for (const c of ['admin', 'allusers', 'userstat']) assert.ok(!user.has(c));
});
