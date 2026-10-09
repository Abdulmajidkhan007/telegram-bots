import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../types/context';
import { ReminderService } from '../services/reminder.service';
import { DEFAULT_HOUR, statusText } from '../services/reminder.logic';
import { logger } from '../utils/logger';

function keyboard(enabled: boolean) {
  return Markup.inlineKeyboard([
    [enabled
      ? Markup.button.callback("🔕 O'chirish", 'rem:off')
      : Markup.button.callback('🔔 Yoqish', 'rem:on')],
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
    await ctx.reply(statusText(enabled, row?.hour ?? DEFAULT_HOUR), keyboard(enabled));
  });

  bot.action(/^rem:(on|off)$/, async (ctx) => {
    if (!ctx.chat) return ctx.answerCbQuery();
    if (!(await canManage(ctx))) {
      return ctx.answerCbQuery("Guruhda eslatmani faqat admin o'zgartira oladi", { show_alert: true });
    }
    const enabled = ctx.match[1] === 'on';
    try {
      await reminders.setEnabled(BigInt(ctx.chat.id), enabled);
    } catch (err) {
      logger.error(`Eslatma saqlanmadi: ${(err as Error).message}`);
      return ctx.answerCbQuery(`Saqlab bo'lmadi: ${(err as Error).message}`, { show_alert: true });
    }
    await ctx.answerCbQuery(enabled ? '🔔 Yoqildi' : "🔕 O'chirildi");
    const text = statusText(enabled, DEFAULT_HOUR);
    // Eslatma xabarining o'zidagi tugma bosilgan bo'lsa ham shu xabar holatga aylanadi.
    await ctx.editMessageText(text, keyboard(enabled)).catch(() => ctx.reply(text, keyboard(enabled)));
  });
}
