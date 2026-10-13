// Eski kun xarajatini o'z sanasi bilan kiritish: "kecha 50k taksi",
// "12.10 non 8000". Toza funksiyalar — vaqt mintaqasi va "bugun" tashqaridan
// beriladi, shuning uchun test soatga bog'liq emas.

export interface LocalDate {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
}

export type DateTokenError = 'future';

export interface DateTokenResult {
  /** Sana so'zi olib tashlangan matn. */
  text: string;
  date: LocalDate | null;
  error?: DateTokenError;
}

/** `now` lahzasi `timeZone` dagi qaysi kalendar kuniga to'g'ri keladi. */
export function localDateInTz(now: Date, timeZone: string): LocalDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

export function addDays(d: LocalDate, n: number): LocalDate {
  const t = new Date(Date.UTC(d.year, d.month - 1, d.day + n));
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
}

export function compareLocalDate(a: LocalDate, b: LocalDate): number {
  return (a.year - b.year) || (a.month - b.month) || (a.day - b.day);
}

function isValidDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  const t = new Date(Date.UTC(year, month - 1, day));
  return t.getUTCMonth() === month - 1 && t.getUTCDate() === day;
}

/**
 * Bazaga yoziladigan lahza: o'sha kunning 12:00 UTC si. ±11 soatlik har qanday
 * mintaqada (Toshkent +5 ham) bu bir xil kalendar kuni — server UTC da
 * getMonth()/getDate() qilsa ham kun siljimaydi.
 */
export function localDateToStorage(d: LocalDate): Date {
  return new Date(Date.UTC(d.year, d.month - 1, d.day, 12));
}

/** "2026-10-12" — callback_data va API uchun qisqa, tartiblanadigan ko'rinish. */
export function formatIsoDate(d: LocalDate): string {
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
}

export function parseIsoDate(s: string): LocalDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return isValidDate(year, month, day) ? { year, month, day } : null;
}

/** "12.10" yoki "12.10.2025" — foydalanuvchiga ko'rsatish uchun. */
export function formatShortDate(d: LocalDate, today?: LocalDate): string {
  const dm = `${String(d.day).padStart(2, '0')}.${String(d.month).padStart(2, '0')}`;
  return today && today.year === d.year ? dm : `${dm}.${d.year}`;
}

// So'z chegarasi: o'zbek apostroflari ham harf hisoblanadi, aks holda
// "kechagi" ichidan "kecha" topilardi.
const L = "\\p{L}\\p{N}'`‘’ʻ";
const word = (body: string): RegExp => new RegExp(`(?<![${L}])(?:${body})(?![${L}])`, 'iu');

const APOS = "['`‘’ʻ]?";
// Tartib muhim: "o'tgan kuni" "kecha" dan oldin tekshirilmasa ham farqi yo'q,
// lekin "N kun oldin" — oddiy so'zlardan oldin, raqami bilan birga olinsin.
const RELATIVE_WORDS: Array<{ re: RegExp; offset: number }> = [
  { re: word('bugun|бугун|сегодня'), offset: 0 },
  { re: word('kecha|кеча|вчера'), offset: -1 },
  { re: word(`o${APOS}tgan\\s+kuni|otgan\\s+kuni|ўтган\\s+куни|утган\\s+куни|позавчера`), offset: -2 },
];

const DAYS_AGO_RE = word('(\\d{1,2})\\s*(?:kun\\s+(?:oldin|avval)|кун\\s+(?:олдин|аввал)|(?:день|дня|дней)\\s+назад)');

// Ko'paytiruvchi/valyuta bilan davom etsa bu sana emas, summa: "1.10 mln".
const AMOUNT_TAIL = "\\s*(?:k|ming|mln|million|milion|mlrd|минг|мин|тыс\\p{L}*|млн|миллиард|so['`‘’ʻ]?m|сум|uzs|usd|\\$|eur|€|rub|₽)(?![\\p{L}])";
// Oy qismi aniq ikki xonali: "1.5 mln" va "2,5k" sanaga aylanib qolmasin.
const NUMERIC_DATE_RE = new RegExp(
  `(?<![\\d.,])(\\d{1,2})[./](\\d{2})(?:[./](\\d{4}|\\d{2}))?(?![\\d.,])(?!${AMOUNT_TAIL})`,
  'iu',
);

function cut(text: string, index: number, length: number): string {
  return (text.slice(0, index) + ' ' + text.slice(index + length)).replace(/\s+/g, ' ').trim();
}

/**
 * Matndan bitta sana belgisini ajratadi. Topilmasa — matn o'zgarmaydi,
 * `date: null`. Yilsiz sana kelajakka tushsa — o'tgan yil deb olinadi
 * ("02.01" da yozilgan "30.12" — o'tgan dekabr).
 */
export function extractDateToken(text: string, today: LocalDate): DateTokenResult {
  const ago = DAYS_AGO_RE.exec(text);
  if (ago && ago.index !== undefined) {
    const n = Number(ago[1]);
    return { text: cut(text, ago.index, ago[0].length), date: addDays(today, -n) };
  }

  for (const { re, offset } of RELATIVE_WORDS) {
    const m = re.exec(text);
    if (m) return { text: cut(text, m.index, m[0].length), date: addDays(today, offset) };
  }

  const m = NUMERIC_DATE_RE.exec(text);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const rest = cut(text, m.index, m[0].length);
    if (m[3]) {
      const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
      if (!isValidDate(year, month, day)) return { text, date: null };
      const date = { year, month, day };
      if (compareLocalDate(date, today) > 0) return { text: rest, date: null, error: 'future' };
      return { text: rest, date };
    }
    // Yilsiz: avval joriy yilni, keyin o'tgan yilni sinaymiz (29.02 uchun ham).
    for (const year of [today.year, today.year - 1]) {
      if (!isValidDate(year, month, day)) continue;
      const date = { year, month, day };
      if (compareLocalDate(date, today) <= 0) return { text: rest, date };
    }
    // Oy/kun noto'g'ri ("12.40") — sana emas, matnni tegmasdan qaytaramiz.
  }

  return { text, date: null };
}
