import { Prisma } from '@prisma/client';
import { LocalDate, compareLocalDate, dateColumns, localDateToStorage, parseIsoDate } from '@expense-tracker/shared';

export interface ExpenseChange {
  amount?: number;
  currency?: string;
  description?: string;
  categoryId?: string | null;
  accountId?: string | null;
  type?: 'EXPENSE' | 'INCOME';
  /** "YYYY-MM-DD" — guruh mintaqasidagi kalendar kuni. */
  date?: string;
}

export class ExpenseChangeError extends Error {}

/**
 * Mini App tahriri → Prisma update. Toza funksiya (baza yo'q): kategoriya va
 * hisobning guruhga tegishliligi chaqiruvchida tekshiriladi.
 * - sana kelajakda bo'lmaydi (bot bilan bir xil qoida);
 * - daromadga kategoriya qo'yilmaydi — botdagi kabi, statistikaga aralashmasin;
 * - null — "olib tashlash", undefined — "tegma".
 */
export function buildExpenseUpdate(change: ExpenseChange, today: LocalDate): Prisma.ExpenseUncheckedUpdateInput {
  const data: Prisma.ExpenseUncheckedUpdateInput = {};
  if (change.amount !== undefined) {
    if (!(change.amount > 0) || !Number.isFinite(change.amount)) throw new ExpenseChangeError("Summa musbat son bo'lishi kerak");
    data.amount = new Prisma.Decimal(change.amount);
  }
  if (change.currency !== undefined) data.currency = change.currency;
  if (change.description !== undefined) {
    const d = change.description.trim();
    if (!d) throw new ExpenseChangeError("Izoh bo'sh bo'lmasin");
    data.description = d;
  }
  if (change.categoryId !== undefined) data.categoryId = change.categoryId;
  if (change.accountId !== undefined) data.accountId = change.accountId;
  if (change.type !== undefined) {
    data.type = change.type;
    if (change.type === 'INCOME') data.categoryId = null;
  }
  if (change.date !== undefined) {
    const day = parseIsoDate(change.date);
    if (!day) throw new ExpenseChangeError(`Noto'g'ri sana: ${change.date}`);
    if (compareLocalDate(day, today) > 0) throw new ExpenseChangeError('Kelajak sanasini qo\'yib bo\'lmaydi');
    Object.assign(data, dateColumns(localDateToStorage(day), day));
  }
  return data;
}
