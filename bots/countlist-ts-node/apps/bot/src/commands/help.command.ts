import { Telegraf } from 'telegraf';
import { BotContext } from '../types/context';

export function registerHelpCommand(bot: Telegraf<BotContext>): void {
  bot.command('help', async (ctx) => {
    await ctx.reply(
      `📚 Expense Tracker — Yordam\n\n` +
      `⚡ Tezkor kiritish (guruhda, tugmasiz):\n` +
      `  - 10 ming taksiga   (xarajat)\n` +
      `  +2 mln oylik        (daromad)\n` +
      `  50k ovqat\n` +
      `  kecha 30k non  ·  12.10 50k dori  (eski sana)\n` +
      `  Keyin tugmalar: 💳 hisob, 📅 sana, 🏷 kategoriya, ↩️ bekor qilish\n` +
      `  🎙 Ovozli xabar ham bo'ladi (kalit sozlangan bo'lsa)\n\n` +
      `💳 Hisoblar (karta, naqd):\n` +
      `/hisoblar — qoldiq, ⭐ asosiy, ⬆️ tartib, 🔒 yopish / 👁 ochish\n\n` +
      `📊 Statistika:\n` +
      `/today — Bugungi xarajatlar\n` +
      `/week  — Haftalik statistika\n` +
      `/month — Oylik statistika\n` +
      `/top   — Top kategoriyalar\n\n` +
      `🏷️ Kategoriyalar:\n` +
      `/categories — Ko'rish va boshqarish\n` +
      `  ✏️ tahrirlash  🗑️ o'chirish  ➕ yangi\n` +
      `  Yozuvdagi 🏷 → ➕ Yangi kategoriya: bot saqlab, keyin o'zi taklif qiladi\n\n` +
      `📤 Export:\n` +
      `/export — CSV yoki Excel yuklab olish\n\n` +
      `⚙️ Boshqaruv:\n` +
      `/login    — Dashboard'ga kirish havolasi (shaxsiy chatda)\n` +
      `/reminder — Kunlik eslatma (soatni o'zingiz tanlaysiz, Toshkent)\n` +
      `⚙️ Sozlamalar, 💰 limitlar, 🔄 takroriy — /start menyusidagi tugmalar\n\n` +
      `🔐 Admin (faqat ADMIN_TELEGRAM_ID uchun):\n` +
      `/admin    — Admin panel va statistika\n` +
      `/allusers — Barcha foydalanuvchilar\n` +
      `/userstat {id} — Foydalanuvchi ma'lumoti\n\n` +
      `ℹ️ Bot guruh admini bo'lishi kerak!`,
    );
  });
}
