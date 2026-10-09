import { Telegram, Markup } from 'telegraf';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { ExpenseService } from './expense.service';
import {
  DEFAULT_HOUR, ReminderRow, isDue, isValidHour, isGoneError, lastSentOnEnable, plainStats, tashkentNow,
} from './reminder.logic';

// Jadval schema.prisma'ga qo'shilmadi: deploy'da migratsiya ishlamaydi va
// users jadvaliga ustun qo'shilsa-yu bazaga tushmasa, butun bot yiqilardi.
// Alohida jadval ishga tushishda o'zi yaratiladi (IF NOT EXISTS) — mavjud
// jadvallarga tegmaydi.
const CREATE_SQL = `
  CREATE TABLE IF NOT EXISTS bot_reminders (
    chat_id    BIGINT PRIMARY KEY,
    enabled    BOOLEAN NOT NULL DEFAULT TRUE,
    hour       SMALLINT NOT NULL DEFAULT ${DEFAULT_HOUR},
    last_sent  DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;

const CHECK_EVERY_MS = 60_000;
const SEND_GAP_MS = 60; // Telegram: ~30 xabar/soniya chegarasidan ancha past

type Row = { chat_id: bigint; enabled: boolean; hour: number; last_sent: Date | null };

function toLogic(r: Row): ReminderRow {
  return {
    enabled: r.enabled,
    hour: Number(r.hour),
    lastSent: r.last_sent ? r.last_sent.toISOString().slice(0, 10) : null,
  };
}

export class ReminderService {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private ready = false;

  constructor(private prisma: PrismaClient, private expenseService: ExpenseService) {}

  // Har murojaatdan oldin: ishga tushishda jadval yaratilmagan bo'lsa (Railway'da
  // shunday bo'ldi: 42P01 "relation does not exist") qayta urinadi va yiqilsa —
  // ASL sababni foydalanuvchiga ko'rsatadigan xato bilan chiqadi.
  async init(): Promise<void> {
    if (this.ready) return;
    try {
      await this.prisma.$executeRawUnsafe(CREATE_SQL);
    } catch (err) {
      throw new Error(`bot_reminders jadvali yaratilmadi: ${(err as Error).message}`);
    }
    this.ready = true;
  }

  async get(chatId: bigint): Promise<ReminderRow | null> {
    await this.init();
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT chat_id, enabled, hour, last_sent FROM bot_reminders WHERE chat_id = ${chatId}`;
    return rows[0] ? toLogic(rows[0]) : null;
  }

  async setEnabled(chatId: bigint, enabled: boolean): Promise<void> {
    await this.init();
    const now = tashkentNow();
    const existing = enabled ? await this.get(chatId) : null;
    const hour = existing?.hour ?? DEFAULT_HOUR;
    const last = enabled ? lastSentOnEnable(hour, now) : null;
    await this.prisma.$executeRaw`
      INSERT INTO bot_reminders (chat_id, enabled, hour, last_sent)
      VALUES (${chatId}, ${enabled}, ${hour}, ${last}::date)
      ON CONFLICT (chat_id) DO UPDATE
        SET enabled = EXCLUDED.enabled,
            last_sent = CASE WHEN EXCLUDED.enabled THEN EXCLUDED.last_sent ELSE bot_reminders.last_sent END`;
  }

  // Soat tanlansa eslatma ham yoqiladi. Bugun allaqachon yuborilgan bo'lsa —
  // yangi (kechroq) soatda ikkinchi marta kelmasin: GREATEST eski belgini saqlaydi.
  async setHour(chatId: bigint, hour: number): Promise<void> {
    if (!isValidHour(hour)) throw new Error(`Noto'g'ri soat: ${hour}`);
    await this.init();
    const last = lastSentOnEnable(hour, tashkentNow());
    await this.prisma.$executeRaw`
      INSERT INTO bot_reminders (chat_id, enabled, hour, last_sent)
      VALUES (${chatId}, TRUE, ${hour}, ${last}::date)
      ON CONFLICT (chat_id) DO UPDATE
        SET enabled = TRUE, hour = EXCLUDED.hour,
            last_sent = GREATEST(bot_reminders.last_sent, EXCLUDED.last_sent)`;
  }

  start(telegram: Telegram): void {
    this.timer = setInterval(() => { void this.tick(telegram); }, CHECK_EVERY_MS);
    void this.tick(telegram);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick(telegram: Telegram): Promise<void> {
    // Oldingi aylanish (ko'p chat) tugamagan bo'lsa — ustma-ust ketmasin.
    if (this.running) return;
    this.running = true;
    try {
      await this.init();
      const now = tashkentNow();
      const rows = await this.prisma.$queryRaw<Row[]>`
        SELECT chat_id, enabled, hour, last_sent FROM bot_reminders
        WHERE enabled AND hour <= ${now.hour} AND (last_sent IS NULL OR last_sent < ${now.date}::date)`;
      for (const r of rows) {
        if (!isDue(toLogic(r), now)) continue;
        // Avval belgilaymiz: yuborish paytida bot qayta ishga tushsa, ikki marta ketmasin.
        await this.prisma.$executeRaw`
          UPDATE bot_reminders SET last_sent = ${now.date}::date WHERE chat_id = ${r.chat_id}`;
        await this.sendOne(telegram, r.chat_id);
        await new Promise((res) => setTimeout(res, SEND_GAP_MS));
      }
    } catch (err) {
      logger.error(`Eslatma aylanishida xato: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  private async sendOne(telegram: Telegram, chatId: bigint): Promise<void> {
    const keyboard = Markup.inlineKeyboard([[Markup.button.callback("🔕 Eslatmani o'chirish", 'rem:off')]]);
    try {
      const group = await this.prisma.group.findUnique({ where: { telegramId: chatId } });
      if (group) {
        // Guruhda bugungi holatni ham ko'rsatamiz — nima yozilmay qolgani darrov ko'rinsin.
        const stats = await this.expenseService.getTodayStats(group.id);
        await telegram.sendMessage(
          Number(chatId),
          "🔔 Bugungi xarajatlarni yozib qo'ydingizmi? 🙂\n\n" + plainStats(stats),
          keyboard,
        );
      } else {
        await telegram.sendMessage(
          Number(chatId),
          "🔔 Bugungi xarajatlarni yozib qo'ydingizmi? 🙂\n\nGuruhingizga yozing, masalan: «50k taksi».",
          keyboard,
        );
      }
    } catch (err) {
      if (isGoneError(err)) {
        await this.setEnabled(chatId, false);
        logger.warn(`Eslatma o'chirildi (chat ${chatId}): ${(err as Error).message}`);
      } else {
        logger.error(`Eslatma yuborilmadi (chat ${chatId}): ${(err as Error).message}`);
      }
    }
  }
}
