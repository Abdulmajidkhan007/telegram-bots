import { Telegraf } from 'telegraf';
import { PrismaClient } from '@prisma/client';
import { BotContext } from '../types/context';
import { ExpenseService } from '../services/expense.service';
import { logger } from '../utils/logger';
import { sendCategoryList } from '../commands/categories.command';
import { config } from '../config';
import { transcribeVoice, VoiceError, MAX_VOICE_SECONDS } from '../services/voice.service';
import { DateTokenError } from '@expense-tracker/shared';
import { AccountService } from '../services/account.service';
import { handleAccountText } from '../commands/accounts.command';
import { EntryUi } from './entry.handler';
import { groupTimeZone } from '../utils/group-time';
import { BillingService } from '../services/billing.service';
import { limitReachedText, shouldSendLimitNotice } from '../services/billing.logic';

function dateErrorText(error: DateTokenError): string {
  // Hozircha yagona xato turi — kelajak sana; switch yangi tur qo'shilsa TS ogohlantiradi.
  switch (error) {
    case 'future':
      return "📅 Bu sana hali kelmagan — yozilmadi. Kelajakdagi xarajatni oldindan yozib bo'lmaydi.";
  }
}

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
  accountService: AccountService,
  entryUi: EntryUi,
  prisma: PrismaClient,
  billing: BillingService,
): void {
  bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    if (!text || text.startsWith('/')) return;

    try {
      if (await handleAccountText(ctx, accountService, text)) return;
      if (await entryUi.handleNewCategoryText(ctx, text)) return;
    } catch (err) {
      logger.error('Kutilayotgan qadam (hisob/kategoriya) xatosi:', err);
      ctx.session = {};
      await ctx.reply(`❌ Saqlanmadi: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

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
      const many = await expenseService.createManyFromText({
        rawText: text,
        userId: ctx.dbUser.id,
        groupId: ctx.dbGroup.id,
        timeZone: groupTimeZone(ctx.dbGroup.timezone),
        telegramMsgId: BigInt(ctx.message.message_id),
      });
      if (many) {
        if ('error' in many) {
          await ctx.reply(dateErrorText(many.error), { reply_parameters: { message_id: ctx.message.message_id } });
          return;
        }
        await entryUi.replyBatch(ctx, many, ctx.message.message_id);
        return;
      }

      const result = await expenseService.createFromText({
        rawText: text,
        userId: ctx.dbUser.id,
        groupId: ctx.dbGroup.id,
        timeZone: groupTimeZone(ctx.dbGroup.timezone),
        telegramMsgId: BigInt(ctx.message.message_id),
      });
      if (!result) return;
      if ('error' in result) {
        await ctx.reply(dateErrorText(result.error), { reply_parameters: { message_id: ctx.message.message_id } });
        return;
      }
      await entryUi.reply(ctx, result.expense.id, ctx.message.message_id);
    } catch (error) {
      // Foydalanuvchi yozildi deb o'ylamasin: jim qolish o'rniga sababini aytamiz.
      logger.error('Message handler error:', error);
      await ctx.reply("❌ Yozuv saqlanmadi (server xatosi). Birozdan keyin qayta yuboring.", {
        reply_parameters: { message_id: ctx.message.message_id },
      }).catch((err) => logger.error(`Xato xabari ham yuborilmadi: ${err?.message ?? err}`));
    }
  });

  if (config.voice) {
    logger.info(`Ovozli xabarlar yoqilgan: ${config.voice.name}`);
  } else {
    logger.info('GEMINI_API_KEY ham, OPENAI_API_KEY ham yo\'q — ovozli xabarlar orqali xarajat qo\'shish o\'chiq.');
  }

  // Guruh → oxirgi «limit tugadi» xabari vaqti (kuniga bir marta).
  const limitNoticeAt = new Map<string, number>();

  bot.on('voice', async (ctx) => {
    // Kalit bo'lmasa jim turamiz: guruhdagi har ovozli xabarga "sozlanmagan"
    // deb javob berish suhbatni buzadi. Holat ishga tushishda log'da ko'rinadi.
    if (!config.voice || !ctx.dbGroup || !ctx.dbUser) return;

    const voice = ctx.message.voice;
    if (voice.duration > MAX_VOICE_SECONDS) return;

    try {
      // Paket limiti: transkripsiyadan OLDIN (API xarajati ketmasin). Flag o'chiq → DB'ga tegmaydi.
      const gate = await billing.gate(ctx.dbGroup.id, 'voice');
      if (!gate.allowed) {
        if (shouldSendLimitNotice(limitNoticeAt, ctx.dbGroup.id, Date.now())) {
          await ctx.reply(limitReachedText('voice', gate), { reply_parameters: { message_id: ctx.message.message_id } });
        }
        return;
      }
      const link = await ctx.telegram.getFileLink(voice.file_id);
      const text = await transcribeVoice(link.toString(), config.voice);
      // Muvaffaqiyatli transkripsiyadan KEYIN (atomik increment). Hisoblash xatosi yozuvni to'xtatmasin.
      await billing.recordUsage(ctx.dbGroup.id, 'voice').catch(
        (err) => logger.error(`Ovoz hisoblagichi yozilmadi (guruh ${ctx.dbGroup!.id}):`, err));

      const many = text
        ? await expenseService.createManyFromText({
            rawText: text,
            userId: ctx.dbUser.id,
            groupId: ctx.dbGroup.id,
            timeZone: groupTimeZone(ctx.dbGroup.timezone),
            telegramMsgId: BigInt(ctx.message.message_id),
            source: 'VOICE',
          })
        : null;
      if (many) {
        if ('error' in many) {
          await ctx.reply(`🎙 ${text}\n\n${dateErrorText(many.error)}`, {
            reply_parameters: { message_id: ctx.message.message_id },
          });
          return;
        }
        await entryUi.replyBatch(ctx, many, ctx.message.message_id, `🎙 ${text}\n\n`);
        return;
      }

      const result = text
        ? await expenseService.createFromText({
            rawText: text,
            userId: ctx.dbUser.id,
            groupId: ctx.dbGroup.id,
            timeZone: groupTimeZone(ctx.dbGroup.timezone),
            telegramMsgId: BigInt(ctx.message.message_id),
            source: 'VOICE',
          })
        : null;

      // Ovozda summa topilmasa javob bermaymiz — oddiy suhbat bo'lishi mumkin.
      if (!result) {
        logger.debug(`Ovozda tranzaksiya topilmadi: "${text}"`);
        return;
      }
      if ('error' in result) {
        await ctx.reply(`🎙 ${text}\n\n${dateErrorText(result.error)}`, {
          reply_parameters: { message_id: ctx.message.message_id },
        });
        return;
      }

      await entryUi.reply(ctx, result.expense.id, ctx.message.message_id, `🎙 ${text}\n\n`);
    } catch (error) {
      logger.error('Voice handler error:', error);
      if (error instanceof VoiceError) {
        await ctx.reply(`❌ ${error.userMessage}`, {
          reply_parameters: { message_id: ctx.message.message_id },
        });
      }
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
