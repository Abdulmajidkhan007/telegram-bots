// Alohida fayl: date-token.ts ↔ expense-parser.ts aylana importi bo'lmasin.
import { getDayOfYear, getWeekNumber } from './expense-parser';
import { LocalDate, localDateToStorage } from './date-token';

/**
 * Expense jadvalidagi sana ustunlari. month/year/week/dayOfYear — hisobotlar
 * shu ustunlar bo'yicha guruhlaydi; ular server soatidan emas, guruh
 * mintaqasidagi kalendar kunidan olinadi (Railway UTC da, Toshkentda
 * 00:00–05:00 orasidagi yozuv kechagi kunga tushardi).
 */
export function dateColumns(at: Date, day: LocalDate) {
  const noonUtc = localDateToStorage(day);
  return {
    date: at,
    month: day.month,
    year: day.year,
    week: getWeekNumber(noonUtc),
    dayOfYear: getDayOfYear(noonUtc),
  };
}
