import { Telegraf, Markup } from 'telegraf';
import { PrismaClient } from '@prisma/client';
import { BotContext } from '../types/context';
import { config } from '../config';
import { formatAmount } from '@expense-tracker/shared';

function isAdmin(ctx: BotContext): boolean {
  if (!config.bot.adminId) return false;
  return ctx.dbUser?.telegramId === config.bot.adminId;
}

export function registerAdminCommands(bot: Telegraf<BotContext>, prisma: PrismaClient): void {
  bot.command('admin', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('❌ Bu komanda faqat admin uchun.');

    const [userCount, groupCount, expenseCount, totalAgg] = await Promise.all([
      prisma.user.count(),
      prisma.group.count(),
      prisma.expense.count({ where: { status: 'ACTIVE' } }),
      prisma.expense.aggregate({ where: { status: 'ACTIVE' }, _sum: { amount: true } }),
    ]);

    const total = formatAmount(Number(totalAgg._sum.amount || 0));

    await ctx.reply(
      `🔐 Admin Panel\n\n` +
      `👥 Foydalanuvchilar: ${userCount} ta\n` +
      `🏢 Guruhlar: ${groupCount} ta\n` +
      `💳 Jami xarajatlar: ${expenseCount} ta\n` +
      `💰 Umumiy summa: ${total}`,
      Markup.inlineKeyboard([
        [Markup.button.callback('👥 Barcha foydalanuvchilar', 'admin:users:0')],
        [Markup.button.callback('🏢 Guruhlar ro\'yxati', 'admin:groups:0')],
        [Markup.button.callback('📊 Top 10 sarflovchi', 'admin:topusers')],
      ]),
    );
  });

  bot.command('allusers', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('❌ Bu komanda faqat admin uchun.');
    await sendUserList(ctx, prisma, 0);
  });

  bot.command('userstat', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('❌ Bu komanda faqat admin uchun.');
    const args = ctx.message.text.split(' ');
    if (args.length < 2) return ctx.reply('Format: /userstat {telegramId}');

    const user = await prisma.user.findFirst({
      where: { telegramId: BigInt(args[1]) },
      include: { _count: { select: { expenses: true } } },
    }).catch(() => null);

    if (!user) return ctx.reply('❌ Foydalanuvchi topilmadi.');

    const [totalAgg, recentExpenses] = await Promise.all([
      prisma.expense.aggregate({ where: { userId: user.id, status: 'ACTIVE' }, _sum: { amount: true } }),
      prisma.expense.findMany({
        where: { userId: user.id, status: 'ACTIVE' },
        orderBy: { date: 'desc' },
        take: 5,
        include: { category: true },
      }),
    ]);

    let text = `👤 ${user.firstName}${user.username ? ` (@${user.username})` : ''}\n`;
    text += `🆔 Telegram ID: ${user.telegramId}\n`;
    text += `💳 Xarajatlar: ${user._count.expenses} ta\n`;
    text += `💰 Jami: ${formatAmount(Number(totalAgg._sum.amount || 0))}\n\n`;
    text += `📋 So'nggi xarajatlar:\n`;
    recentExpenses.forEach((exp) => {
      const icon = exp.category?.icon || '📦';
      text += `${icon} ${exp.description} — ${formatAmount(Number(exp.amount))}\n`;
    });

    await ctx.reply(text);
  });
}

export async function sendUserList(ctx: BotContext, prisma: PrismaClient, skip: number): Promise<void> {
  const pageSize = 10;
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip,
      include: { _count: { select: { expenses: true } } },
    }),
    prisma.user.count(),
  ]);

  let text = `👥 Foydalanuvchilar (${skip + 1}–${Math.min(skip + pageSize, total)} / ${total})\n\n`;
  users.forEach((u, i) => {
    const handle = u.username ? `@${u.username}` : `#${u.telegramId}`;
    text += `${skip + i + 1}. ${u.firstName} (${handle}) — ${u._count.expenses} ta\n`;
  });
  text += `\n/userstat {telegramId} — batafsil ko'rish`;

  const nav: ReturnType<typeof Markup.button.callback>[] = [];
  if (skip > 0) nav.push(Markup.button.callback('⬅️', `admin:users:${skip - pageSize}`));
  if (skip + pageSize < total) nav.push(Markup.button.callback('➡️', `admin:users:${skip + pageSize}`));

  await ctx.reply(text, nav.length ? Markup.inlineKeyboard([nav]) : undefined);
}

export async function sendGroupList(ctx: BotContext, prisma: PrismaClient, skip: number): Promise<void> {
  const pageSize = 10;
  const [groups, total] = await Promise.all([
    prisma.group.findMany({
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip,
      include: { _count: { select: { expenses: true, members: true } } },
    }),
    prisma.group.count(),
  ]);

  let text = `🏢 Guruhlar (${skip + 1}–${Math.min(skip + pageSize, total)} / ${total})\n\n`;
  groups.forEach((g, i) => {
    text += `${skip + i + 1}. ${g.title} — ${g._count.members} a'zo, ${g._count.expenses} xarajat\n`;
  });

  const nav: ReturnType<typeof Markup.button.callback>[] = [];
  if (skip > 0) nav.push(Markup.button.callback('⬅️', `admin:groups:${skip - pageSize}`));
  if (skip + pageSize < total) nav.push(Markup.button.callback('➡️', `admin:groups:${skip + pageSize}`));

  await ctx.reply(text, nav.length ? Markup.inlineKeyboard([nav]) : undefined);
}
