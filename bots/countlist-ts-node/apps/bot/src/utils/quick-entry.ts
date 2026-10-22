// Tezkor kiritish (guruhda shunchaki "- 10 ming taksiga" yozish) uchun toza
// yordamchilar — Telegram va bazasiz test qilinadi.

import { LocalDate, addDays, formatIsoDate, formatShortDate, parseIsoDate } from '@expense-tracker/shared';

// Yozuvdan keyin tugmalar (Bekor qilish, hisob, sana, kategoriya) shu muddat
// ichida ishlaydi. Eski xabardagi tugma bir oydan keyin bosilib, hisobot
// jimgina o'zgarib ketmasin.
export const UNDO_WINDOW_MS = 24 * 60 * 60 * 1000;

// Prisma cuid() — kichik lotin harf va raqamlar. callback_data foydalanuvchi
// qo'lida (soxta tugma yasash mumkin), shuning uchun format qat'iy tekshiriladi.
const ID = '[a-z0-9]{20,32}';
const ID_RE = new RegExp(`^${ID}$`);
const CALLBACK_MAX_BYTES = 64;

function assertId(id: string): void {
  if (!ID_RE.test(id)) throw new Error(`Kutilmagan ID formati: ${id}`);
}

function checked(data: string): string {
  // Telegram cheklovi: callback_data ≤ 64 bayt — oshsa tugma umuman yuborilmaydi.
  if (Buffer.byteLength(data) > CALLBACK_MAX_BYTES) {
    throw new Error(`callback_data juda uzun (${Buffer.byteLength(data)} bayt): ${data}`);
  }
  return data;
}

// ── Bekor qilish ─────────────────────────────────────────────────
export const UNDO_CALLBACK_RE = new RegExp(`^exp:undo:(${ID})$`);

export function undoCallbackData(expenseId: string): string {
  assertId(expenseId);
  return checked(`exp:undo:${expenseId}`);
}

export function parseUndoCallback(data: string | undefined): string | null {
  const m = data ? UNDO_CALLBACK_RE.exec(data) : null;
  return m ? m[1] : null;
}

// ── Ko'p yozuvni birdan bekor qilish ─────────────────────────────
// Bitta xabardan chiqqan yozuvlar bir xil telegramMsgId ga ega — alohida
// "partiya" ustuni yo'q. "exp:ball:<groupId>:<msgId>": 10 + 32 + 1 + 12 ≤ 64 bayt.
export const BATCH_UNDO_CALLBACK_RE = new RegExp(`^exp:ball:(${ID}):(\\d{1,12})$`);

export function batchUndoCallbackData(groupId: string, telegramMsgId: number): string {
  assertId(groupId);
  if (!Number.isSafeInteger(telegramMsgId) || telegramMsgId <= 0 || telegramMsgId >= 1e12) {
    throw new Error(`Kutilmagan xabar ID: ${telegramMsgId}`);
  }
  return checked(`exp:ball:${groupId}:${telegramMsgId}`);
}

export function parseBatchUndoCallback(data: string | undefined): { groupId: string; msgId: bigint } | null {
  const m = data ? BATCH_UNDO_CALLBACK_RE.exec(data) : null;
  return m ? { groupId: m[1], msgId: BigInt(m[2]) } : null;
}

// ── Yozuvni tahrirlash tugmalari ─────────────────────────────────
// Qisqa prefikslar: ikki cuid (25+25) + prefiks 64 baytga sig'ishi kerak.
export const TX_ACCOUNT_RE = new RegExp(`^ta:(${ID}):(${ID})$`);
export const TX_DATE_MENU_RE = new RegExp(`^tdm:(${ID})$`);
export const TX_DATE_RE = new RegExp(`^td:(${ID}):(\\d{4}-\\d{2}-\\d{2})$`);
export const TX_CAT_MENU_RE = new RegExp(`^tcm:(${ID})$`);
export const TX_CAT_RE = new RegExp(`^tc:(${ID}):(${ID})$`);
export const TX_NEW_CAT_RE = new RegExp(`^tcn:(${ID})$`);
export const TX_BACK_RE = new RegExp(`^tb:(${ID})$`);

export const txCallback = {
  account(expenseId: string, accountId: string): string {
    assertId(expenseId);
    assertId(accountId);
    return checked(`ta:${expenseId}:${accountId}`);
  },
  dateMenu(expenseId: string): string {
    assertId(expenseId);
    return checked(`tdm:${expenseId}`);
  },
  date(expenseId: string, d: LocalDate): string {
    assertId(expenseId);
    return checked(`td:${expenseId}:${formatIsoDate(d)}`);
  },
  categoryMenu(expenseId: string): string {
    assertId(expenseId);
    return checked(`tcm:${expenseId}`);
  },
  category(expenseId: string, categoryId: string): string {
    assertId(expenseId);
    assertId(categoryId);
    return checked(`tc:${expenseId}:${categoryId}`);
  },
  newCategory(expenseId: string): string {
    assertId(expenseId);
    return checked(`tcn:${expenseId}`);
  },
  back(expenseId: string): string {
    assertId(expenseId);
    return checked(`tb:${expenseId}`);
  },
};

/** Callback'dagi sana: format to'g'ri, mavjud kun va kelajakda emas. */
export function parseCallbackDate(raw: string, today: LocalDate): LocalDate | null {
  const d = parseIsoDate(raw);
  if (!d) return null;
  const future = d.year * 10000 + d.month * 100 + d.day > today.year * 10000 + today.month * 100 + today.day;
  return future ? null : d;
}

// Sana tanlash tugmalari: bugun, kecha va undan oldingi 5 kun. Eskiroq sana
// uchun matnda "12.10" yoziladi — 30 ta tugma chatni to'ldirib yuboradi.
export const DATE_PICKER_DAYS = 7;

export function datePickerOptions(today: LocalDate): Array<{ label: string; date: LocalDate }> {
  return Array.from({ length: DATE_PICKER_DAYS }, (_, i) => {
    const date = addDays(today, -i);
    const label = i === 0 ? 'Bugun' : i === 1 ? 'Kecha' : formatShortDate(date, today);
    return { label, date };
  });
}

/**
 * Yangi kategoriya nomi: "🌸 Gullar" yoki "Gullar". Bo'sh, juda uzun yoki
 * summaga o'xshash matn (adashib xarajat yozilgan) — null.
 */
export function parseNewCategoryName(text: string): { icon: string; name: string } | null {
  const t = text.trim().replace(/\s+/g, ' ');
  const m = /^(\p{Extended_Pictographic}[\u{FE0F}\u{200D}\p{Extended_Pictographic}]*)\s*(.*)$/u.exec(t);
  const icon = m ? m[1] : '📦';
  const name = (m ? m[2] : t).trim();
  if (!name || name.length > 32) return null;
  if (/\d/.test(name)) return null;
  // Birinchi harf katta: ro'yxatda "gullar" va "Gullar" aralashib ketmasin.
  return { icon, name: name[0].toLocaleUpperCase('uz') + name.slice(1) };
}
