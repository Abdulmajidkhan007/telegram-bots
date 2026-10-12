import { session } from 'telegraf';
import { BotContext, SessionData } from '../types/context';

// telegraf 4.16: defaultSession berilmasa yangi foydalanuvchida ctx.session
// undefined bo'ladi va matn handler'i birinchi qatorda (ctx.session.step)
// yiqilardi — guruhdagi xarajat yozuvi bot.catch log'iga tushib, jim qolardi.
export function botSession() {
  return session<SessionData, BotContext>({ defaultSession: () => ({}) });
}
