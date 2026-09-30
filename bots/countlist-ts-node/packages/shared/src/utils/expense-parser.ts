import { Currency, ExpenseParseResult } from '../types';

const MULTIPLIERS: Record<string, number> = {
  k: 1_000,
  ming: 1_000,
  мин: 1_000,
  mln: 1_000_000,
  млн: 1_000_000,
  million: 1_000_000,
  milion: 1_000_000,
  mlrd: 1_000_000_000,
  миллиард: 1_000_000_000,
};

const CURRENCY_MAP: Record<string, Currency> = {
  som: 'UZS',
  "so'm": 'UZS',
  "so`m": 'UZS',
  uzs: 'UZS',
  сум: 'UZS',
  usd: 'USD',
  dollar: 'USD',
  доллар: 'USD',
  '$': 'USD',
  eur: 'EUR',
  euro: 'EUR',
  евро: 'EUR',
  '€': 'EUR',
  rub: 'RUB',
  rubl: 'RUB',
  рубль: 'RUB',
  '₽': 'RUB',
};

// Qiymatlar packages/database/prisma/seed.ts dagi kategoriya NOMLARI bilan
// harfma-harf bir xil bo'lishi shart: bot kategoriyani name bo'yicha qidiradi,
// mos kelmasa xarajat kategoriyasiz saqlanadi (test shuni tekshiradi).
// Tartib muhim: birinchi mos kelgan kalit so'z yutadi.
const CATEGORY_KEYWORDS: Record<string, string> = {
  ovqat: 'Oziq-ovqat',
  taom: 'Oziq-ovqat',
  yeyish: 'Oziq-ovqat',
  non: 'Oziq-ovqat',
  "go'sht": 'Oziq-ovqat',
  gosht: 'Oziq-ovqat',
  sabzavot: 'Oziq-ovqat',
  meva: 'Oziq-ovqat',
  bozor: 'Oziq-ovqat',
  supermarket: 'Oziq-ovqat',
  "do'kon": 'Oziq-ovqat',
  mahsulot: 'Oziq-ovqat',
  qahva: 'Oziq-ovqat',
  choy: 'Oziq-ovqat',
  // "gaz" (Uy-joy) dan oldin turishi shart: "maGAZin" ichida "gaz" bor.
  magazin: 'Oziq-ovqat',
  transport: 'Transport',
  taksi: 'Transport',
  metro: 'Transport',
  avtobus: 'Transport',
  benzin: 'Transport',
  yoqilg: 'Transport',
  marshrutka: 'Transport',
  yandex: 'Transport',
  uber: 'Transport',
  telefon: 'Texnologiya',
  internet: 'Texnologiya',
  kompyuter: 'Texnologiya',
  remont: 'Uy-joy',
  ijara: 'Uy-joy',
  kvartira: 'Uy-joy',
  mebel: 'Uy-joy',
  kommunal: 'Uy-joy',
  elektr: 'Uy-joy',
  gaz: 'Uy-joy',
  suv: 'Uy-joy',
  uy: 'Uy-joy',
  kiyim: 'Kiyim-kechak',
  oyoq: 'Kiyim-kechak',
  poyabzal: 'Kiyim-kechak',
  "ko'ylak": 'Kiyim-kechak',
  kurtka: 'Kiyim-kechak',
  sumka: 'Kiyim-kechak',
  sport: 'Sport',
  gym: 'Sport',
  dori: "Sog'liq",
  kasalxona: "Sog'liq",
  shifoxona: "Sog'liq",
  klinika: "Sog'liq",
  shifokor: "Sog'liq",
  "o'qish": "Ta'lim",
  oqish: "Ta'lim",
  kurs: "Ta'lim",
  kitob: "Ta'lim",
  "ta'lim": "Ta'lim",
  talim: "Ta'lim",
  dars: "Ta'lim",
  repetitor: "Ta'lim",
  maktab: "Ta'lim",
  kino: "Ko'ngilochar",
  teatr: "Ko'ngilochar",
  konsert: "Ko'ngilochar",
  restoran: "Ko'ngilochar",
  cafe: "Ko'ngilochar",
  kafe: "Ko'ngilochar",
  sayohat: 'Sayohat',
  "sovg'a": "Sovg'a",
  sovga: "Sovg'a",
};

const MULT = 'mln|million|milion|млн|mlrd|миллиард|k|ming|мин';
const CUR = "so['`]?m|uzs|usd|dollar|доллар|\\$|eur|euro|евро|€|rub|rubl|рубль|₽|сум";
const NUM = '\\d[\\d\\s,.]*';

// Summa oxirida, valyuta va ko'paytiruvchisiz yozilganda shundan kichik son
// xarajat hisoblanmaydi: guruhdagi "soat 5", "xona 12" kabi gaplar yozilib
// qolmasin. 500 so'mdan kichik xarajat amalda bo'lmaydi.
const MIN_BARE_TRAILING_AMOUNT = 500;

/**
 * "1,5" -> 1.5 (o'nlik), "1,500,000" / "15 000" -> 1500000 (minglik ajratgich).
 * Avval vergul butunlay o'chirilardi va "1,5 mln" 15 mln bo'lib qolardi.
 */
function parseNumber(raw: string): number {
  const s = raw.replace(/\s/g, '');
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) return parseFloat(s.replace(/[.,]/g, ''));
  return parseFloat(s.replace(',', '.'));
}

function build(
  rawAmount: string,
  multiplierKey: string | undefined,
  currencyKey: string | undefined,
  description: string,
): ExpenseParseResult | null {
  let amount = parseNumber(rawAmount);
  if (isNaN(amount)) return null;

  const mult = multiplierKey?.toLowerCase();
  if (mult && MULTIPLIERS[mult]) amount *= MULTIPLIERS[mult];
  if (amount <= 0) return null;

  const cur = currencyKey?.toLowerCase();
  const currency: Currency = cur && CURRENCY_MAP[cur] ? CURRENCY_MAP[cur] : 'UZS';

  const desc = description.trim().replace(/\s+(uchun|ga)$/i, '').trim();
  if (!desc) return null;

  return { amount, currency, description: desc, categoryHint: detectCategory(desc) };
}

export function parseExpenseText(text: string): ExpenseParseResult | null {
  const t = text.toLowerCase().trim();

  // 1) Summa boshida: "500000 so'm ovqatga", "2 mln remontga", "50k non"
  const lead = t.match(new RegExp(`^(${NUM})\\s*(${MULT})?\\s*(${CUR})?\\s+(.+)$`, 'i'));
  if (lead) {
    const r = build(lead[1], lead[2], lead[3], lead[4]);
    if (r) return r;
  }

  // 2) Summa oxirida: "taksi 15000", "remont uchun 2 mln", "kitob 10$"
  const trail = t.match(new RegExp(`^(.*?\\D)\\s*(${NUM})\\s*(${MULT})?\\s*(${CUR})?$`, 'i'));
  if (trail) {
    const bare = !trail[3] && !trail[4];
    const r = build(trail[2], trail[3], trail[4], trail[1]);
    if (r && !(bare && r.amount < MIN_BARE_TRAILING_AMOUNT)) return r;
  }

  return null;
}

function detectCategory(description: string): string | undefined {
  const lower = description.toLowerCase();
  for (const [keyword, category] of Object.entries(CATEGORY_KEYWORDS)) {
    if (lower.includes(keyword)) return category;
  }
  return undefined;
}

export function formatAmount(amount: number, currency: Currency = 'UZS'): string {
  if (currency === 'UZS') {
    if (amount >= 1_000_000) {
      return `${(amount / 1_000_000).toFixed(1)} mln so'm`;
    }
    if (amount >= 1_000) {
      return `${(amount / 1_000).toFixed(0)}k so'm`;
    }
    return `${amount.toLocaleString()} so'm`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
