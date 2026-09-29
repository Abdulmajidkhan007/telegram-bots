import { Telegraf, Markup } from 'telegraf';
import { PrismaClient } from '@prisma/client';
import { BotContext } from '../types/context';

export function registerCategoryCommands(bot: Telegraf<BotContext>, prisma: PrismaClient): void {
  bot.command('categories', async (ctx) => {
    if (!ctx.dbGroup) return ctx.reply('Bu komanda faqat guruhda ishlaydi.');
    await sendCategoryList(ctx, prisma);
  });
}

export async function sendCategoryList(ctx: BotContext, prisma: PrismaClient): Promise<void> {
  const groupId = ctx.dbGroup?.id;
  if (!groupId) return;

  const categories = await prisma.category.findMany({
    where: {
      OR: [{ groupId }, { isDefault: true }],
      deletedAt: null,
    },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });

  let text = `🏷️ Kategoriyalar (${categories.length} ta)\n\n`;
  categories.forEach((c) => {
    text += `${c.icon} ${c.name}${c.isDefault ? ' ⭐' : ''}\n`;
  });
  text += '\n⭐ = standart (nomi o\'zgartiriladi, o\'chirib bo\'lmaydi)';

  const rows = categories.map((cat) => {
    const row: ReturnType<typeof Markup.button.callback>[] = [];
    row.push(Markup.button.callback(`${cat.icon} ${cat.name}`, 'cat:noop'));
    row.push(Markup.button.callback('✏️', `cat:edit:${cat.id}`));
    if (!cat.isDefault) row.push(Markup.button.callback('🗑️', `cat:del:${cat.id}`));
    return row;
  });

  rows.push([Markup.button.callback('➕ Yangi kategoriya qo\'shish', 'cat:add')]);
  rows.push([Markup.button.callback('⬅️ Orqaga', 'back:main')]);

  await ctx.reply(text, Markup.inlineKeyboard(rows));
}
