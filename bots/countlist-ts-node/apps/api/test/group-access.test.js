'use strict';

// Baza mock qilinadi — test faqat qaror mantiqini tekshiradi.
// Ishga tushirish: npm test (apps/api ichida) — avval tsc qiladi.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ForbiddenException, BadRequestException, NotFoundException } = require('@nestjs/common');
const { GroupAccessService } = require('../dist/common/access/group-access.service');

// userId:groupId -> a'zolik
function fakePrisma(members) {
  return {
    groupMember: {
      findUnique: async ({ where: { userId_groupId: { userId, groupId } } }) =>
        members[`${userId}:${groupId}`] || null,
    },
  };
}

const access = new GroupAccessService(fakePrisma({
  'ali:g1': { isActive: true },
  'vali:g2': { isActive: true },
  'sobiq:g1': { isActive: false },
}));

test("a'zo o'z guruhiga kira oladi", async () => {
  assert.equal(await access.assertMember('ali', 'g1'), 'g1');
});

// Regressiya: avval analytics/expenses/limits/exports/categories groupId ni
// tekshirmasdan ishlatardi — vali g1 ning ma'lumotini ola olardi.
test("boshqa guruhga kirish rad etiladi", async () => {
  await assert.rejects(access.assertMember('vali', 'g1'), ForbiddenException);
});

test("guruhdan chiqib ketgan (isActive=false) a'zo rad etiladi", async () => {
  await assert.rejects(access.assertMember('sobiq', 'g1'), ForbiddenException);
});

test("mavjud bo'lmagan guruh ham xuddi shunday 403 — ID larni taxmin qilib bo'lmasin", async () => {
  await assert.rejects(access.assertMember('ali', 'yoq'), ForbiddenException);
});

test('groupId berilmasa 400', async () => {
  for (const g of [undefined, null, '', 123]) {
    await assert.rejects(access.assertMember('ali', g), BadRequestException);
  }
});

test("yozuv bo'yicha: topilmasa 404, umumiy (groupId=null) bo'lsa 403, begona guruh 403", async () => {
  await assert.rejects(access.assertMemberOfRecord('ali', null, 'yoq'), NotFoundException);
  await assert.rejects(access.assertMemberOfRecord('ali', { groupId: null }, 'x'), ForbiddenException);
  await assert.rejects(access.assertMemberOfRecord('vali', { groupId: 'g1' }, 'x'), ForbiddenException);
  assert.equal(await access.assertMemberOfRecord('ali', { groupId: 'g1' }, 'x'), 'g1');
});
