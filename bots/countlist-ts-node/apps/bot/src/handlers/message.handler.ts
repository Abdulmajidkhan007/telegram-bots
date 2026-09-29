import { Telegraf } from 'telegraf';
import { PrismaClient } from '@prisma/client';
import { BotContext } from '../types/context';
import { ExpenseService } from '../services/expense.service';
import { logger } from '../utils/logger';
import { sendCategoryList } from '../commands/categories.command';

function parseCategoryInput(text: string): { icon: string; name: string } {
  const parts = text.trim().split(/\s+/);
  const maybeEmoji = parts[0];
  // Simple check: if first part is 1-2 chars and not ascii word
  if (parts.length > 1 && maybeEmoji.length <= 4 && /\P{ASCII}/u.test(maybeEmoji)) {
    return { icon: maybeEmoji, name: parts.slice(1).join(' ') };
  }
  return { icon: '📦', name: text.trim() };
}

export function registerMessageHandlers(
  bot: Telegraf<BotContext>,
  expenseService: ExpenseService,
  prisma: PrismaClient,
): void {
  bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    if (!text || text.startsWith('/')) return;

    // Handle category add session
    if (ctx.session.step === 'cat:add' && ctx.dbGroup) {
      const { icon, name } = parseCategoryInput(text);
      try {
        await prisma.category.create({
          data: { name, icon, groupId: ctx.dbGroup.id, color: '#6366f1', isDefault: false },
        });
        ctx.session = {};
        await ctx.reply(`✅ "${icon} ${name}" kategoriyasi qo'shildi!`);
        await sendCategoryList(ctx, prisma);
      } catch (err) {
        logger.error('Category create error:', err);
        await ctx.reply('❌ Kategoriya qo\'shishda xato. Qayta urinib ko\'ring.');
      }
      return;
    }

    // Handle category edit session
    if (ctx.session.step === 'cat:edit' && ctx.session.editingCategoryId) {
      const { icon, name } = parseCategoryInput(text);
      try {
        await prisma.category.update({
          where: { id: ctx.session.editingCategoryId },
          data: { name, icon },
        });
        ctx.session = {};
        await ctx.reply(`✅ Kategoriya "${icon} ${name}" ga o'zgartirildi!`);
        if (ctx.dbGroup) await sendCategoryList(ctx, prisma);
      } catch (err) {
        logger.error('Category update error:', err);
        await ctx.reply('❌ Yangilashda xato. Qayta urinib ko\'ring.');
      }
      return;
    }

    // Normal expense parsing (group only)
    if (!ctx.dbGroup || !ctx.dbUser) return;
    if (text.length < 3) return;

    try {
      const result = await expenseService.parseAndCreate({
        rawText: text,
        userId: ctx.dbUser.id,
        groupId: ctx.dbGroup.id,
        telegramMsgId: BigInt(ctx.message.message_id),
      });

      if (result) {
        await ctx.replyWithMarkdownV2(
          result.formatted.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&'),
          { reply_parameters: { message_id: ctx.message.message_id } },
        );
      }
    } catch (error) {
      logger.error('Message handler error:', error);
    }
  });

  bot.on('new_chat_members', async (ctx) => {
    const botId = ctx.botInfo.id;
    const botJoined = ctx.message.new_chat_members.some((m) => m.id === botId);
    if (botJoined && ctx.dbGroup) {
      await ctx.replyWithMarkdownV2(
        `👋 *Assalomu alaykum\\!*\n\n` +
        `💰 Men xarajatlarni kuzatib boruvchi botman\\.\n\n` +
        `📋 *Boshlash uchun:*\n` +
        `1\\. Meni guruh admini qiling\n` +
        `2\\. Xarajatlarni yuboring:\n` +
        `   \`500000 so'm ovqatga\`\n` +
        `   \`2 mln remontga\`\n\n` +
        `/help — barcha komandalar`,
      );
    }
  });
}
