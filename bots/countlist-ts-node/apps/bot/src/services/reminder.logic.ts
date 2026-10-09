// ============================================================
//  Kunlik eslatma — toza mantiq (I/O yo'q), test/reminder.test.js da sinaladi.
// ============================================================

// Toshkent UTC+5, yozgi vaqt yo'q — Intl/tz bazasiga bog'lanmaymiz:
// alpine image'da ICU to'liq bo'lmasligi mumkin.
export const TASHKENT_OFFSET_MIN = 5 * 60;
export const DEFAULT_HOUR = 22;

export interface TashkentNow {
  date: string; // 'YYYY-MM-DD' (Toshkent bo'yicha)
  hour: number; // 0..23
}

export function tashkentNow(now: Date = new Date()): TashkentNow {
  const t = new Date(now.getTime() + TASHKENT_OFFSET_MIN * 60_000);
  return { date: t.toISOString().slice(0, 10), hour: t.getUTCHours() };
}

export interface ReminderRow {
  enabled: boolean;
  hour: number;
  lastSent: string | null; // 'YYYY-MM-DD'
}

// Bugun hali yuborilmagan va soat yetgan bo'lsa — yuboriladi.
// "hour <= now" (teng emas): bot 22:00 da o'chiq bo'lib 22:40 da yongan bo'lsa
// ham o'sha kuni yetkaziladi; ertasi tong (soat < 22) — kutadi.
export function isDue(row: ReminderRow, now: TashkentNow): boolean {
  if (!row.enabled) return false;
  if (row.lastSent && row.lastSent >= now.date) return false;
  return now.hour >= row.hour;
}

// Yoqilgan payt soat allaqachon o'tgan bo'lsa (masalan 23:10 da yoqildi) —
// bugungisini "yuborilgan" deb belgilaymiz, aks holda darhol eslatma kelardi.
export function lastSentOnEnable(hour: number, now: TashkentNow): string | null {
  return now.hour >= hour ? now.date : null;
}

// Bot bloklangan / guruhdan chiqarilgan — eslatmani o'chiramiz, har kuni xato bermasin.
export function isGoneError(err: unknown): boolean {
  const e = err as { response?: { error_code?: number; description?: string }; message?: string };
  const code = e?.response?.error_code;
  const desc = String(e?.response?.description || e?.message || '').toLowerCase();
  return code === 403 || desc.includes('chat not found') || desc.includes('bot was kicked')
    || desc.includes('bot was blocked') || desc.includes('user is deactivated');
}

export function statusText(enabled: boolean, hour: number): string {
  const hh = String(hour).padStart(2, '0');
  return enabled
    ? `🔔 Kunlik eslatma: yoqilgan ✅\n\nHar kuni Toshkent vaqti bilan ${hh}:00 da:\n“Bugungi xarajatlarni yozib qo'ydingizmi? 🙂”`
    : `🔕 Kunlik eslatma: o'chirilgan\n\nYoqsangiz, har kuni Toshkent vaqti bilan ${hh}:00 da eslatib turaman.`;
}

// getTodayStats Markdown belgilari (*, _, `) bilan qaytaradi; eslatma oddiy
// matn bo'lib ketadi — parse xatosi xavfi yo'q, yulduzchalar ko'rinmaydi.
export function plainStats(md: string): string {
  return md.replace(/[*_`]/g, '');
}
