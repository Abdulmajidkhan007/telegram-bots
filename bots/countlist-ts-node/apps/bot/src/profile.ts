import { Telegram } from 'telegraf';
import { logger } from './utils/logger';

// ============================================================
//  Bot profili: tavsif, qisqa tavsif, "/" buyruqlar menyusi.
//  Bot har ishga tushganda o'zi o'rnatadi — BotFather'da qo'lda yozish
//  shart emas, matn kod bilan birga yuradi. Avval bu qilinmagani uchun
//  profil bo'sh, "/" yozilganda esa hech narsa chiqmasdi.
//  Telegram chegaralari test/profile.test.js da tekshiriladi.
// ============================================================

// Bo'sh chatda ("What can this bot do?") ko'rinadi. ≤ 512 belgi.
export const DESCRIPTION =
  "💰 Guruh va oila xarajatlarini hisoblab beruvchi bot.\n" +
  "\n" +
  "📌 Qanday ishlaydi:\n" +
  "1️⃣ Botni guruhingizga qo'shing va admin qiling\n" +
  "2️⃣ Xarajatni oddiy yozing: «50k taksi», «2 mln remont»\n" +
  "3️⃣ Bugun / hafta / oy hisoboti, kategoriyalar, limitlar\n" +
  "\n" +
  "🎙 Ovozli xabar ham tushunadi\n" +
  "📊 Telegram ichida dashboard — pastdagi tugma\n" +
  "📤 Excel / CSV / PDF eksport";

// Profilda va havola ulashilganda ko'rinadi. ≤ 120 belgi.
export const SHORT_DESCRIPTION = "💰 Guruh xarajatlarini yozing — bot hisoblaydi. Hisobot, limit, Excel eksport, dashboard.";

export type Command = { command: string; description: string };

// Faqat haqiqatan ro'yxatdan o'tgan buyruqlar (commands/*.ts). Yo'q buyruqni
// menyuga qo'yish — foydalanuvchi bosadi va javob olmaydi.
export const USER_COMMANDS: Command[] = [
  { command: 'start', description: '🏠 Bosh menyu' },
  { command: 'today', description: '📅 Bugungi xarajatlar' },
  { command: 'week', description: '📆 Haftalik statistika' },
  { command: 'month', description: '🗓 Oylik statistika' },
  { command: 'top', description: '⚡ Top kategoriyalar' },
  { command: 'stats', description: '📊 Umumiy statistika' },
  { command: 'categories', description: '🏷 Kategoriyalar' },
  { command: 'export', description: '📤 Excel / CSV / PDF' },
  { command: 'reminder', description: '🔔 Kunlik eslatma (soatni tanlang)' },
  { command: 'login', description: "🔐 Dashboard'ga kirish havolasi" },
  { command: 'help', description: '❓ Yordam' },
];

// Faqat ADMIN_TELEGRAM_ID chatida ko'rinadi.
export const ADMIN_COMMANDS: Command[] = [
  ...USER_COMMANDS,
  { command: 'admin', description: '🛠 Admin panel' },
  { command: 'allusers', description: '👥 Barcha foydalanuvchilar' },
  { command: 'userstat', description: "🔎 Foydalanuvchi ma'lumoti" },
];

// Profil o'rnatilmasa ham bot ishlayveradi — xato log'ga yoziladi, yutilmaydi.
export async function applyBotProfile(telegram: Telegram, adminId: bigint | null): Promise<void> {
  const steps: Array<[string, () => Promise<unknown>]> = [
    ['description', () => telegram.setMyDescription(DESCRIPTION)],
    ['short description', () => telegram.setMyShortDescription(SHORT_DESCRIPTION)],
    ['commands', () => telegram.setMyCommands(USER_COMMANDS)],
  ];
  if (adminId) {
    steps.push(['admin commands', () => telegram.setMyCommands(ADMIN_COMMANDS, {
      scope: { type: 'chat', chat_id: Number(adminId) },
    })]);
  }
  for (const [name, run] of steps) {
    try {
      await run();
    } catch (err) {
      logger.error(`Bot profili (${name}) o'rnatilmadi: ${(err as Error).message}`);
    }
  }
  logger.info('Bot profili yangilandi (tavsif, buyruqlar)');
}
