import { Telegraf, Markup } from 'telegraf';
import { PrismaClient } from '@prisma/client';
import { localDateInTz } from '@expense-tracker/shared';
import { BotContext } from '../types/context';
import { ExpenseService, CreateManyResult } from '../services/expense.service';
import { AccountService } from '../services/account.service';
import { logger } from '../utils/logger';
import { groupTimeZone, todayIn } from '../utils/group-time';
import {
  UNDO_WINDOW_MS,
  BATCH_UNDO_CALLBACK_RE,
  TX_ACCOUNT_RE,
  TX_BACK_RE,
  TX_CAT_MENU_RE,
  TX_CAT_RE,
  TX_DATE_MENU_RE,
  TX_DATE_RE,
  TX_NEW_CAT_RE,
  parseCallbackDate,
  parseNewCategoryName,
} from '../utils/quick-entry';
import {
  Button,
  EntryView,
  batchKeyboard,
  formatBatchText,
  Option,
  categoryKeyboard,
  dateKeyboard,
  entryKeyboard,
  formatEntryText,
} from '../utils/entry-format';

const NOT_ALLOWED =
  "O'zgartirib bo'lmadi: faqat yozgan odam, 24 soat ichida va bekor qilinmagan yozuvni o'zgartira oladi.";

function markup(rows: Button[][]) {
  return Markup.inlineKeyboard(rows.map((r) => r.map((b) => Markup.button.callback(b.text, b.data))));
}

/**
 * Tezkor kiritish yozuvi: javob xabari, hisob/sana/kategoriya tugmalari va
 * yangi kategoriya nomini qabul qilish. Barcha o'zgarishlar
 * ExpenseService.updateByAuthor orqali — muallif va 24 soat sharti bitta joyda.
 */
export class EntryUi {
  constructor(
    private prisma: PrismaClient,
    private expenses: ExpenseService,
    private accounts: AccountService,
  ) {}

  async view(expenseId: string, groupId: string, tz: string): Promise<EntryView | null> {
    const e = await this.expenses.findForRender(expenseId, groupId);
    if (!e) return null;
    return {
      id: e.id,
      type: e.type,
      amount: Number(e.amount),
      currency: e.currency,
      description: e.description,
      day: localDateInTz(e.date, tz),
      category: e.category ? { icon: e.category.icon, name: e.category.name } : null,
      account: e.account ? { id: e.account.id, icon: e.account.icon, name: e.account.name } : null,
      authorName: e.user.firstName,
    };
  }

  private async accountOptions(groupId: string): Promise<Option[]> {
    return (await this.accounts.visible(groupId)).map((a) => ({ id: a.id, icon: a.icon, name: a.name }));
  }

  async categoryOptions(groupId: string): Promise<Option[]> {
    const cats = await this.prisma.category.findMany({
      where: { OR: [{ groupId }, { isDefault: true }], deletedAt: null, isActive: true },
      orderBy: [{ groupId: 'asc' }, { name: 'asc' }],
      select: { id: true, icon: true, name: true, groupId: true },
    });
    // Guruh nusxasi global standartdan ustun: bir xil nom ikki marta chiqmasin.
    const byName = new Map<string, Option>();
    for (const c of cats) {
      const key = c.name.toLocaleLowerCase('uz');
      if (!byName.has(key) || c.groupId) byName.set(key, { id: c.id, icon: c.icon, name: c.name });
    }
    return [...byName.values()].slice(0, 24);
  }

  /** Yangi yozuvga javob: matn + tugmalar. */
  async reply(ctx: BotContext, expenseId: string, replyTo: number, prefix = ''): Promise<void> {
    if (!ctx.dbGroup) return;
    const tz = groupTimeZone(ctx.dbGroup.timezone);
    const v = await this.view(expenseId, ctx.dbGroup.id, tz);
    if (!v) throw new Error(`Yangi yozuv topilmadi: ${expenseId}`);
    const kb = entryKeyboard(v, await this.accountOptions(ctx.dbGroup.id));
    await ctx.reply(formatEntryText(v, todayIn(tz), prefix), {
      reply_parameters: { message_id: replyTo },
      ...markup(kb),
    });
  }

  /** Bir xabardan ≥2 yozuv: bitta umumiy javob va "Hammasini bekor qilish" tugmasi. */
  async replyBatch(
    ctx: BotContext,
    created: Extract<CreateManyResult, { ok: true }>,
    replyTo: number,
    prefix = '',
  ): Promise<void> {
    if (!ctx.dbGroup) return;
    const tz = groupTimeZone(ctx.dbGroup.timezone);
    const account = created.accountId
      ? await this.prisma.account.findUnique({ where: { id: created.accountId }, select: { icon: true, name: true } })
      : null;
    const rows = created.expenses.map((e) => ({
      type: e.type,
      amount: Number(e.amount),
      currency: e.currency,
      description: e.description,
      day: localDateInTz(e.date, tz),
    }));
    const text = formatBatchText(rows, todayIn(tz), account ? `${account.icon} ${account.name}` : null, prefix);
    await ctx.reply(text, {
      reply_parameters: { message_id: replyTo },
      ...markup(batchKeyboard(ctx.dbGroup.id, replyTo)),
    });
  }

  /** Mavjud xabarni yangilangan yozuv bilan qayta chizadi. */
  async rerender(ctx: BotContext, expenseId: string, messageId?: number): Promise<void> {
    if (!ctx.dbGroup || !ctx.chat) return;
    const tz = groupTimeZone(ctx.dbGroup.timezone);
    const v = await this.view(expenseId, ctx.dbGroup.id, tz);
    if (!v) return;
    const old = ctx.callbackQuery?.message && 'text' in ctx.callbackQuery.message ? ctx.callbackQuery.message.text : '';
    // Ovozli yozuvda birinchi qator "🎙 matn" — uni saqlab qolamiz.
    const prefix = old.startsWith('🎙') ? old.split('\n\n')[0] + '\n\n' : '';
    const text = formatEntryText(v, todayIn(tz), prefix);
    const kb = markup(entryKeyboard(v, await this.accountOptions(ctx.dbGroup.id)));
    const edit = messageId
      ? ctx.telegram.editMessageText(ctx.chat.id, messageId, undefined, text, kb)
      : ctx.editMessageText(text, kb);
    await edit.catch((err) => {
      // "message is not modified" — o'sha tugma qayta bosilgan, xato emas.
      if (!String(err?.message).includes('not modified')) {
        logger.warn(`Yozuv xabarini yangilab bo'lmadi: ${err?.message ?? err}`);
      }
    });
  }

  /** Menyuni faqat muallif ochadi — boshqalar tugmani bosib chalg'itmasin. */
  private async ownView(ctx: BotContext, expenseId: string): Promise<EntryView | null> {
    if (!ctx.dbGroup || !ctx.dbUser) return null;
    const e = await this.prisma.expense.findFirst({
      where: { id: expenseId, groupId: ctx.dbGroup.id, userId: ctx.dbUser.id, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!e) return null;
    return this.view(expenseId, ctx.dbGroup.id, groupTimeZone(ctx.dbGroup.timezone));
  }

  private change(ctx: BotContext, expenseId: string, change: Parameters<ExpenseService['updateByAuthor']>[1]) {
    return this.expenses.updateByAuthor(
      {
        expenseId,
        userId: ctx.dbUser!.id,
        groupId: ctx.dbGroup!.id,
        notBefore: new Date(Date.now() - UNDO_WINDOW_MS),
      },
      change,
    );
  }

  /**
   * tx:newcat qadamida kelgan matn: kategoriya yaratiladi (yoki shu nomli
   * mavjudi olinadi) va yozuvga qo'yiladi. true — matn shu yerda ishlandi.
   */
  async handleNewCategoryText(ctx: BotContext, text: string): Promise<boolean> {
    const { editingExpenseId: expenseId, entryMessageId } = ctx.session;
    if (ctx.session.step !== 'tx:newcat' || !expenseId || !ctx.dbGroup || !ctx.dbUser) return false;

    const parsed = parseNewCategoryName(text);
    if (!parsed) {
      await ctx.reply(
        "❌ Kategoriya nomi 1–32 harf bo'lsin, raqamsiz. Masalan: 🌸 Gullar\n" +
        'Bekor qilish uchun /cancel yozing.',
      );
      return true;
    }

    ctx.session = {};
    const groupId = ctx.dbGroup.id;
    const existing = await this.prisma.category.findFirst({
      where: { groupId, deletedAt: null, name: { equals: parsed.name, mode: 'insensitive' } },
    });
    const cat = existing ?? await this.prisma.category.create({
      data: { groupId, name: parsed.name, icon: parsed.icon, color: '#6366f1', isDefault: false },
    });

    const ok = await this.change(ctx, expenseId, { categoryId: cat.id });
    await ctx.reply(
      existing
        ? `🏷 «${cat.icon} ${cat.name}» allaqachon bor edi — yozuvga qo'yildi.`
        : `✅ «${cat.icon} ${cat.name}» kategoriyasi saqlandi${ok ? ' va yozuvga qo\'yildi' : ''}.\n` +
          'Endi izohda shu so\'z bo\'lsa, bot uni o\'zi tanlaydi.',
    );
    if (!ok) await ctx.reply(`⚠️ ${NOT_ALLOWED}`);
    else await this.rerender(ctx, expenseId, entryMessageId);
    return true;
  }

  register(bot: Telegraf<BotContext>): void {
    // Ko'p yozuvni birdan bekor qilish. Guruh ID callback'da bor, lekin
    // ishonilmaydi: faqat joriy guruh bilan mos kelsa ishlaydi.
    bot.action(BATCH_UNDO_CALLBACK_RE, async (ctx) => {
      if (!ctx.dbGroup || !ctx.dbUser) return ctx.answerCbQuery();
      const [, groupId, rawMsgId] = ctx.match;
      if (groupId !== ctx.dbGroup.id) return ctx.answerCbQuery(NOT_ALLOWED, { show_alert: true });
      try {
        const count = await this.expenses.cancelBatchByAuthor({
          telegramMsgId: BigInt(rawMsgId),
          userId: ctx.dbUser.id,
          groupId,
          notBefore: new Date(Date.now() - UNDO_WINDOW_MS),
        });
        if (count === 0) {
          return ctx.answerCbQuery(
            "Bekor qilib bo'lmadi: faqat yozgan odam, 24 soat ichida va bir marta bekor qila oladi.",
            { show_alert: true },
          );
        }
        await ctx.answerCbQuery(`Bekor qilindi (${count} ta)`);
        const old = ctx.callbackQuery.message && 'text' in ctx.callbackQuery.message
          ? ctx.callbackQuery.message.text : '';
        await ctx.editMessageText(`❌ Hammasi bekor qilindi\n\n${old}`).catch((err) =>
          logger.warn(`Bekor qilish xabarini yangilab bo'lmadi: ${err?.message ?? err}`));
      } catch (err) {
        logger.error('Batch undo error:', err);
        await ctx.answerCbQuery("❌ Bekor qilishda xato. Qayta urinib ko'ring.", { show_alert: true });
      }
    });

    // Hisob tanlash.
    bot.action(TX_ACCOUNT_RE, async (ctx) => {
      if (!ctx.dbGroup || !ctx.dbUser) return ctx.answerCbQuery();
      const [, expenseId, accountId] = ctx.match;
      try {
        if (!(await this.accounts.belongsToGroup(ctx.dbGroup.id, accountId))) {
          return ctx.answerCbQuery("Bu hisob topilmadi (o'chirilgan yoki boshqa guruhniki).", { show_alert: true });
        }
        if (!(await this.change(ctx, expenseId, { accountId }))) {
          return ctx.answerCbQuery(NOT_ALLOWED, { show_alert: true });
        }
        await ctx.answerCbQuery('💳 Hisob tanlandi');
        await this.rerender(ctx, expenseId);
      } catch (err) {
        logger.error('Hisob tanlashda xato:', err);
        await ctx.answerCbQuery("❌ Hisobni o'zgartirishda xato. Qayta urinib ko'ring.", { show_alert: true });
      }
    });

    // Sana menyusi.
    bot.action(TX_DATE_MENU_RE, async (ctx) => {
      const v = await this.ownView(ctx, ctx.match[1]);
      if (!v) return ctx.answerCbQuery(NOT_ALLOWED, { show_alert: true });
      await ctx.answerCbQuery("Eskiroq sana uchun yozing: «12.10 50k taksi»");
      const today = todayIn(groupTimeZone(ctx.dbGroup!.timezone));
      await ctx.editMessageReplyMarkup(markup(dateKeyboard(v, today)).reply_markup)
        .catch((err) => logger.warn(`Sana menyusi ochilmadi: ${err?.message ?? err}`));
    });

    bot.action(TX_DATE_RE, async (ctx) => {
      if (!ctx.dbGroup || !ctx.dbUser) return ctx.answerCbQuery();
      const [, expenseId, raw] = ctx.match;
      const date = parseCallbackDate(raw, todayIn(groupTimeZone(ctx.dbGroup.timezone)));
      if (!date) return ctx.answerCbQuery("Noto'g'ri sana (kelajak sanasi qabul qilinmaydi).", { show_alert: true });
      try {
        if (!(await this.change(ctx, expenseId, { date }))) {
          return ctx.answerCbQuery(NOT_ALLOWED, { show_alert: true });
        }
        await ctx.answerCbQuery('📅 Sana o\'zgardi');
        await this.rerender(ctx, expenseId);
      } catch (err) {
        logger.error('Sana o\'zgartirishda xato:', err);
        await ctx.answerCbQuery("❌ Sanani o'zgartirishda xato. Qayta urinib ko'ring.", { show_alert: true });
      }
    });

    // Kategoriya menyusi.
    bot.action(TX_CAT_MENU_RE, async (ctx) => {
      const v = await this.ownView(ctx, ctx.match[1]);
      if (!v) return ctx.answerCbQuery(NOT_ALLOWED, { show_alert: true });
      await ctx.answerCbQuery();
      const e = await this.expenses.findForRender(v.id, ctx.dbGroup!.id);
      const cats = await this.categoryOptions(ctx.dbGroup!.id);
      await ctx.editMessageReplyMarkup(markup(categoryKeyboard(v, cats, e?.categoryId ?? null)).reply_markup)
        .catch((err) => logger.warn(`Kategoriya menyusi ochilmadi: ${err?.message ?? err}`));
    });

    bot.action(TX_CAT_RE, async (ctx) => {
      if (!ctx.dbGroup || !ctx.dbUser) return ctx.answerCbQuery();
      const [, expenseId, categoryId] = ctx.match;
      try {
        const cat = await this.prisma.category.findFirst({
          where: { id: categoryId, OR: [{ groupId: ctx.dbGroup.id }, { isDefault: true }], deletedAt: null },
          select: { id: true },
        });
        if (!cat) return ctx.answerCbQuery('Bu kategoriya topilmadi.', { show_alert: true });
        if (!(await this.change(ctx, expenseId, { categoryId }))) {
          return ctx.answerCbQuery(NOT_ALLOWED, { show_alert: true });
        }
        await ctx.answerCbQuery('🏷 Kategoriya tanlandi');
        await this.rerender(ctx, expenseId);
      } catch (err) {
        logger.error('Kategoriya tanlashda xato:', err);
        await ctx.answerCbQuery("❌ Kategoriyani o'zgartirishda xato.", { show_alert: true });
      }
    });

    bot.action(TX_NEW_CAT_RE, async (ctx) => {
      const v = await this.ownView(ctx, ctx.match[1]);
      if (!v) return ctx.answerCbQuery(NOT_ALLOWED, { show_alert: true });
      await ctx.answerCbQuery();
      const msg = ctx.callbackQuery.message;
      ctx.session = { step: 'tx:newcat', editingExpenseId: v.id, entryMessageId: msg?.message_id };
      await ctx.reply(
        "🏷 Yangi kategoriya nomini yozing — saqlab qo'yaman va keyingi safar o'zim taklif qilaman.\n\n" +
        'Masalan: 🌸 Gullar  yoki  Gullar\n' +
        'Bekor qilish: /cancel',
      );
    });

    bot.action(TX_BACK_RE, async (ctx) => {
      await ctx.answerCbQuery();
      await this.rerender(ctx, ctx.match[1]);
    });
  }
}
