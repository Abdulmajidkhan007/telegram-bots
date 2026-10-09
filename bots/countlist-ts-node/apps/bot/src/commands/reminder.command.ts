import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../types/context';
import { ReminderService } from '../services/reminder.service';
import { DEFAULT_HOUR, HOUR_OPTIONS, isValidHour, statusWithHint } from '../services/reminder.logic';
import { logger } from '../utils/logger';

function keyboard(enabled: boolean, hour: number) {
  const hourBtns = HOUR_OPTIONS.map((h) =>
    Markup.button.callback(`${enabled && h === hour ? '✅ ' : ''}${String(h).padStart(2, '0')}:00`, `rem:h:${h}`));
  return Markup.inlineKeyboard([
    hourBtns.slice(0, 4),
    hourBtns.slice(4),
    [enabled
      ? Markup.button.callback("🔕 O'chirish", 'rem:off')
      : Markup.button.callback(`🔔 Yoqish (${String(hour).padStart(2, '0')}:00)`, 'rem:on')],
    [Markup.button.callback('⬅️ Orqaga', 'back:main')],
  ]);
}

// Guruhda eslatmani faqat guruh admini yoqadi/o'chiradi: u hammaga keladi.
async function canManage(ctx: BotContext): Promise<boolean> {
  const type = ctx.chat?.type;
  if (type === 'private') return true;
  if (!ctx.from) return false;
  try {
    const m = await ctx.getChatMember(ctx.from.id);
    return m.status === 'creator' || m.status === 'administrator';
  } catch (err) {
    logger.warn(`Eslatma: admin holatini tekshirib bo'lmadi: ${(err as Error).message}`);
    return false;
  }
}

export function registerReminderCommand(bot: Telegraf<BotContext>, reminders: ReminderService): void {
  bot.command('reminder', async (ctx) => {
    let row;
    try {
      row = await reminders.get(BigInt(ctx.chat.id));
    } catch (err) {
      logger.error(`Eslatma holati o'qilmadi: ${(err as Error).message}`);
      return ctx.reply(`⚠️ Eslatma hozir ishlamayapti: ${(err as Error).message}`);
    }
    const enabled = !!row?.enabled;
    const hour = row?.hour ?? DEFAULT_HOUR;
    await ctx.reply(statusWithHint(enabled, hour), keyboard(enabled, hour));
  });

  bot.action(/^rem:(on|off|h:(\d{1,2}))$/, async (ctx) => {
    if (!ctx.chat) return ctx.answerCbQuery();
    if (!(await canManage(ctx))) {
      return ctx.answerCbQuery("Guruhda eslatmani faqat admin o'zgartira oladi", { show_alert: true });
    }
    const chatId = BigInt(ctx.chat.id);
    let row;
    try {
      if (ctx.match[2] !== undefined) {
        const hour = Number(ctx.match[2]);
        if (!isValidHour(hour)) return ctx.answerCbQuery("Noto'g'ri soat", { show_alert: true });
        await reminders.setHour(chatId, hour);
      } else {
        await reminders.setEnabled(chatId, ctx.match[1] === 'on');
      }
      row = await reminders.get(chatId);
    } catch (err) {
      logger.error(`Eslatma saqlanmadi: ${(err as Error).message}`);
      return ctx.answerCbQuery(`Saqlab bo'lmadi: ${(err as Error).message}`.slice(0, 200), { show_alert: true });
    }
    const enabled = !!row?.enabled;
    const hour = row?.hour ?? DEFAULT_HOUR;
    await ctx.answerCbQuery(enabled ? `🔔 ${String(hour).padStart(2, '0')}:00 da eslataman` : "🔕 O'chirildi");
    const text = statusWithHint(enabled, hour);
    // Eslatma xabarining o'zidagi tugma bosilgan bo'lsa ham shu xabar holatga aylanadi.
    await ctx.editMessageText(text, keyboard(enabled, hour)).catch(() => ctx.reply(text, keyboard(enabled, hour)));
  });
}
