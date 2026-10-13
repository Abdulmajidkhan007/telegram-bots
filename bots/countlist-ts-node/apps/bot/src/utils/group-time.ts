import { LocalDate, localDateInTz } from '@expense-tracker/shared';
import { logger } from './logger';

export const DEFAULT_TZ = 'Asia/Tashkent';

/**
 * Guruh mintaqasi (bazada; default Asia/Tashkent). Noto'g'ri qiymat bo'lsa
 * Intl RangeError beradi — log qilamiz va Toshkentga qaytamiz, aks holda
 * guruhdagi har bir yozuv yiqilardi.
 */
export function groupTimeZone(tz: string | null | undefined): string {
  if (!tz) return DEFAULT_TZ;
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return tz;
  } catch (err) {
    logger.warn(`Guruh vaqt mintaqasi noto'g'ri ("${tz}"), ${DEFAULT_TZ} ishlatiladi: ${(err as Error).message}`);
    return DEFAULT_TZ;
  }
}

export function todayIn(tz: string): LocalDate {
  return localDateInTz(new Date(), tz);
}
