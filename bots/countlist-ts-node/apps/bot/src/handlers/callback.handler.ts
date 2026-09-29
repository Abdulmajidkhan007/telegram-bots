import { Telegraf, Markup, Input } from 'telegraf';
import { PrismaClient } from '@prisma/client';
import { BotContext } from '../types/context';
import { ExpenseService } from '../services/expense.service';
import { ExportService } from '../services/export.service';
import { statsNavKeyboard, mainInlineKeyboard, exportKeyboard } from '../keyboards/main.keyboard';
import { escapeMarkdownV2 } from '../commands/stats.command';
import { logger } from '../utils/logger';
import { sendCategoryList } from '../commands/categories.command';
import { sendUserList, sendGroupList } from '../commands/admin.command';
import { formatAmount } from '@expense-tracker/shared';
import { config } from '../config';

function isAdmin(ctx: BotContext): boolean {
  return !!config.bot.adminId && ctx.dbUser?.telegramId === config.bot.adminId;
}

function getWebUrl(): string {
  return process.env.WEB_URL || '';
}

export function registerCallbackHandlers(
  bot: Telegraf<BotContext>,
  expenseService: ExpenseService,
  exportService: ExportService,
  prisma: PrismaClient,
): void {
  // ── Stats ──────────────────────────────────────────────────────
  bot.action('stats:today', async (ctx) => {
    if (!ctx.dbGroup) return;
    await ctx.answerCbQuery();
    await ctx.sendChatAction('typing');
    const msg = await expenseService.getTodayStats(ctx.dbGroup.id);
    await ctx.editMessageText(escapeMarkdownV2(msg), { parse_mode: 'MarkdownV2', ...statsNavKeyboard('today') });
  });

  bot.action('stats:week', async (ctx) => {
    if (!ctx.dbGroup) return;
    await ctx.answerCbQuery();
    await ctx.sendChatAction('typing');
    const msg = await expenseService.getWeekStats(ctx.dbGroup.id);
    await ctx.editMessageText(escapeMarkdownV2(msg), { parse_mode: 'MarkdownV2', ...statsNavKeyboard('week') });
  });

  bot.action('stats:month', async (ctx) => {
    if (!ctx.dbGroup) return;
    await ctx.answerCbQuery();
    await ctx.sendChatAction('typing');
    const msg = await expenseService.getMonthStats(ctx.dbGroup.id);
    await ctx.editMessageText(escapeMarkdownV2(msg), { parse_mode: 'MarkdownV2', ...statsNavKeyboard('month') });
  });

  bot.action('stats:categories', async (ctx) => {
    if (!ctx.dbGroup) return;
    await ctx.answerCbQuery();
    const msg = await expenseService.getTopCategories(ctx.dbGroup.id);
    await ctx.editMessageText(escapeMarkdownV2(msg), { parse_mode: 'MarkdownV2', ...mainInlineKeyboard() });
  });

  bot.action('stats:top', async (ctx) => {
    if (!ctx.dbGroup) return;
    await ctx.answerCbQuery();
    const msg = await expenseService.getTopCategories(ctx.dbGroup.id);
    await ctx.editMessageText(escapeMarkdownV2(msg), { parse_mode: 'MarkdownV2', ...mainInlineKeyboard() });
  });

  // ── Export ─────────────────────────────────────────────────────
  bot.action('export:menu', async (ctx) => {
    if (!ctx.dbGroup) return;
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      escapeMarkdownV2(`📤 *Export — Ma'lumotlarni yuklash*\n\nQaysi formatda yuklamoqchisiz?`),
      { parse_mode: 'MarkdownV2', ...exportKeyboard(ctx.dbGroup.id) },
    );
  });

  bot.action(/^export:(pdf|csv|excel):(.+)$/, async (ctx) => {
    const format = ctx.match[1] as 'pdf' | 'csv' | 'excel';
    const groupId = ctx.match[2];

    await ctx.answerCbQuery(`⏳ ${format.toUpperCase()} tayyorlanmoqda...`);

    if (format === 'pdf') {
      await ctx.reply('❌ PDF export hozircha mavjud emas.\nIltimos CSV yoki Excel formatini tanlang.');
      return;
    }

    const progressMsg = await ctx.reply(`⏳ ${format.toUpperCase()} fayli tayyorlanmoqda...`);

    try {
      const buf = format === 'csv'
        ? await exportService.generateCsv(groupId)
        : await exportService.generateExcel(groupId);

      const ext = format === 'csv' ? 'csv' : 'xlsx';
      const filename = `xarajatlar_${new Date().toISOString().split('T')[0]}.${ext}`;

      await ctx.replyWithDocument(Input.fromBuffer(buf, filename));
      await ctx.telegram.deleteMessage(ctx.chat!.id, progressMsg.message_id).catch(() => {});
    } catch (err) {
      logger.error('Export error:', err);
      await ctx.telegram.deleteMessage(ctx.chat!.id, progressMsg.message_id).catch(() => {});
      await ctx.reply(`❌ Export xatosi: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // ── Categories ─────────────────────────────────────────────────
  bot.action('cat:noop', (ctx) => ctx.answerCbQuery());

  bot.action('cat:add', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session = { step: 'cat:add' };
    await ctx.reply(
      '➕ Yangi kategoriya qo\'shish\n\n' +
      'Kategoriya nomini yuboring. Formatlar:\n' +
      '  🍕 Restoran  (emoji + nom)\n' +
      '  Restoran     (faqat nom — 📦 icon qo\'yiladi)'
    );
  });

  bot.action(/^cat:edit:(.+)$/, async (ctx) => {
    const categoryId = ctx.match[1];
    await ctx.answerCbQuery();
    ctx.session = { step: 'cat:edit', editingCategoryId: categoryId };
    await ctx.reply(
      '✏️ Kategoriyani tahrirlash\n\n' +
      'Yangi nomni yuboring. Formatlar:\n' +
      '  🍕 Restoran  (emoji + nom)\n' +
      '  Restoran     (faqat nom)'
    );
  });

  bot.action(/^cat:del:(.+)$/, async (ctx) => {
    const categoryId = ctx.match[1];
    await ctx.answerCbQuery();
    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    await ctx.reply(
      `🗑️ "${cat?.icon || ''} ${cat?.name || '?'}" kategoriyasini o\'chirishni tasdiqlaysizmi?`,
      Markup.inlineKeyboard([
        [Markup.button.callback('✅ Ha, o\'chir', `cat:delok:${categoryId}`)],
        [Markup.button.callback('❌ Bekor', 'cancel')],
      ]),
    );
  });

  bot.action(/^cat:delok:(.+)$/, async (ctx) => {
    const categoryId = ctx.match[1];
    await ctx.answerCbQuery('✅ O\'chirildi');
    await prisma.category.update({ where: { id: categoryId }, data: { deletedAt: new Date() } });
    await ctx.deleteMessage().catch(() => {});
    await ctx.reply('✅ Kategoriya o\'chirildi.');
    if (ctx.dbGroup) await sendCategoryList(ctx, prisma);
  });

  // ── Navigation ─────────────────────────────────────────────────
  bot.action('back:main', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      escapeMarkdownV2(`🏠 *Bosh Menyu*\n\nQuyidagi tugmalardan foydalaning:`),
      { parse_mode: 'MarkdownV2', ...mainInlineKeyboard() },
    );
  });

  bot.action('cancel', async (ctx) => {
    ctx.session = {};
    await ctx.answerCbQuery('Bekor qilindi');
    await ctx.deleteMessage().catch(() => {});
  });

  bot.action('settings:menu', async (ctx) => {
    await ctx.answerCbQuery();
    const webUrl = getWebUrl();

    if (webUrl) {
      await ctx.reply(
        '⚙️ Sozlamalar\n\nTo\'liq boshqaruv uchun veb-dashboardga o\'ting:',
        Markup.inlineKeyboard([
          [Markup.button.url('🌐 Dashboard ochish', webUrl)],
          [Markup.button.callback('⬅️ Orqaga', 'back:main')],
        ]),
      );
    } else {
      await ctx.reply(
        '⚙️ Sozlamalar\n\n' +
        'Veb-dashboard uchun Railway BOT servisiga quyidagini qo\'shing:\n' +
        'WEB_URL = https://sizning-web-url.railway.app',
      );
    }
  });

  // ── Admin callbacks ────────────────────────────────────────────
  bot.action(/^admin:users:(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery('❌ Ruxsat yo\'q');
    await ctx.answerCbQuery();
    await sendUserList(ctx, prisma, parseInt(ctx.match[1]));
  });

  bot.action(/^admin:groups:(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery('❌ Ruxsat yo\'q');
    await ctx.answerCbQuery();
    await sendGroupList(ctx, prisma, parseInt(ctx.match[1]));
  });

  bot.action('admin:topusers', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery('❌ Ruxsat yo\'q');
    await ctx.answerCbQuery();

    const topUsers = await prisma.expense.groupBy({
      by: ['userId'],
      where: { status: 'ACTIVE' },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    });

    const userIds = topUsers.map((u) => u.userId);
    const users = await prisma.user.findMany({ where: { id: { in: userIds } } });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
    let text = '📊 Top 10 sarflovchi (barcha guruhlar)\n\n';
    topUsers.forEach((u, i) => {
      const user = userMap.get(u.userId);
      const handle = user?.username ? `@${user.username}` : `#${user?.telegramId}`;
      text += `${medals[i]} ${user?.firstName || 'Noma\'lum'} (${handle})\n`;
      text += `   💰 ${formatAmount(Number(u._sum.amount || 0))} • ${u._count} ta\n\n`;
    });

    await ctx.reply(text);
  });
}
