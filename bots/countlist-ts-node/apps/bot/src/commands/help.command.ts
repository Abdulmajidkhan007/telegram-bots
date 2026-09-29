import { Telegraf } from 'telegraf';
import { BotContext } from '../types/context';

export function registerHelpCommand(bot: Telegraf<BotContext>): void {
  bot.command('help', async (ctx) => {
    await ctx.reply(
      `📚 Expense Tracker — Yordam\n\n` +
      `💬 Xarajat qo'shish (guruhda):\n` +
      `  500000 so'm ovqatga\n` +
      `  2 mln remontga\n` +
      `  50k taksi\n\n` +
      `📊 Statistika:\n` +
      `/today — Bugungi xarajatlar\n` +
      `/week  — Haftalik statistika\n` +
      `/month — Oylik statistika\n` +
      `/top   — Top kategoriyalar\n\n` +
      `🏷️ Kategoriyalar:\n` +
      `/categories — Ko'rish va boshqarish\n` +
      `  ✏️ tahrirlash  🗑️ o'chirish  ➕ yangi\n\n` +
      `📤 Export:\n` +
      `/export — CSV yoki Excel yuklab olish\n\n` +
      `⚙️ Boshqaruv:\n` +
      `/settings — Bot sozlamalari\n` +
      `/limit    — Oylik limit\n\n` +
      `🔐 Admin (faqat ADMIN_TELEGRAM_ID uchun):\n` +
      `/admin    — Admin panel va statistika\n` +
      `/allusers — Barcha foydalanuvchilar\n` +
      `/userstat {id} — Foydalanuvchi ma'lumoti\n\n` +
      `ℹ️ Bot guruh admini bo'lishi kerak!`,
    );
  });
}
