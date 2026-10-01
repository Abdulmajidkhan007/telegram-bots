import { Telegraf, Markup } from 'telegraf';
import { signLoginLink, LOGIN_LINK_TTL_SECONDS } from '@expense-tracker/shared';
import { BotContext } from '../types/context';
import { config } from '../config';

// Havola FAQAT shaxsiy chatda beriladi: guruhda bersak, guruhdagi har kim
// uni bosib so'ragan odam nomidan dashboard'ga kira olardi.
export async function sendLoginLink(ctx: BotContext): Promise<void> {
  const isPrivate = ctx.chat?.type === 'private';
  if (!isPrivate) {
    const botUsername = ctx.botInfo?.username;
    await ctx.reply(
      '🔐 Kirish havolasi faqat shaxsiy chatda beriladi — bu yerda bersam, guruhdagi har kim sizning nomingizdan kira olardi.',
      botUsername
        ? Markup.inlineKeyboard([[Markup.button.url('Shaxsiy chatda olish', `https://t.me/${botUsername}?start=login`)]])
        : undefined,
    );
    return;
  }

  const webUrl = process.env.WEB_URL;
  if (!webUrl) {
    await ctx.reply("Dashboard manzili sozlanmagan: bot servisiga WEB_URL qo'shing.");
    return;
  }
  if (!ctx.from) return;

  const token = signLoginLink(
    { id: String(ctx.from.id), firstName: ctx.from.first_name, username: ctx.from.username },
    config.bot.token,
  );
  // Token # dan keyin: fragment serverga yuborilmaydi, nginx loglariga ham,
  // boshqa saytlarga Referer bilan ham tushmaydi.
  const link = `${webUrl.replace(/\/+$/, '')}/login#token=${token}`;

  await ctx.reply(
    `🔐 Dashboard'ga kirish havolasi.\n\n` +
    `${Math.round(LOGIN_LINK_TTL_SECONDS / 60)} daqiqa amal qiladi. Uni hech kimga yubormang — ` +
    `havola egasi sizning nomingizdan kiradi.`,
    Markup.inlineKeyboard([[Markup.button.url('🌐 Dashboard ochish', link)]]),
  );
}

export function registerLoginCommand(bot: Telegraf<BotContext>): void {
  bot.command('login', (ctx) => sendLoginLink(ctx));
}
