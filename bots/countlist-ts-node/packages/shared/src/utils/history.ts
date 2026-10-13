// Mini App «Tarix»: tranzaksiyalarni kunlar bo'yicha guruhlash va kunlik jami.
// Toza funksiya — web, test va kerak bo'lsa bot bir xil natija oladi.

import { LocalDate, addDays, compareLocalDate, formatIsoDate, localDateInTz } from './date-token';

export interface HistoryItem {
  type: 'EXPENSE' | 'INCOME';
  amount: number | string;
  currency: string;
  date: string | Date;
}

export interface DayTotals {
  expense: number;
  income: number;
}

export interface DayGroup<T> {
  /** "2026-10-12" — React key va tartib uchun. */
  key: string;
  day: LocalDate;
  items: T[];
  /** Valyuta bo'yicha alohida: so'm va dollarni qo'shib bo'lmaydi. */
  totals: Record<string, DayTotals>;
}

/**
 * Kelgan tartib saqlanadi (API sana bo'yicha kamayish tartibida beradi);
 * kun guruh mintaqasida aniqlanadi — UTC 20:00 dagi yozuv Toshkentda ertasi kun.
 */
export function groupByDay<T extends HistoryItem>(items: T[], timeZone: string): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  const byKey = new Map<string, DayGroup<T>>();
  for (const item of items) {
    const day = localDateInTz(new Date(item.date), timeZone);
    const key = formatIsoDate(day);
    let g = byKey.get(key);
    if (!g) {
      g = { key, day, items: [], totals: {} };
      byKey.set(key, g);
      groups.push(g);
    }
    g.items.push(item);
    const t = (g.totals[item.currency] ??= { expense: 0, income: 0 });
    const amount = Number(item.amount);
    if (item.type === 'INCOME') t.income += amount;
    else t.expense += amount;
  }
  return groups;
}

const WEEKDAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

/** "Bugun", "Kecha", "11-oktabr, yakshanba", boshqa yil bo'lsa yili bilan. */
export function historyDayLabel(day: LocalDate, today: LocalDate): string {
  if (compareLocalDate(day, today) === 0) return 'Bugun';
  if (compareLocalDate(day, addDays(today, -1)) === 0) return 'Kecha';
  const weekday = WEEKDAYS[new Date(Date.UTC(day.year, day.month - 1, day.day)).getUTCDay()];
  const year = day.year === today.year ? '' : ` ${day.year}`;
  return `${day.day}-${MONTHS[day.month - 1]}${year}, ${weekday}`;
}
