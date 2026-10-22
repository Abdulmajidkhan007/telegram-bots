// Bitta xabardan bir nechta tranzaksiya: "27000ga banan, 31000ga non".
// Toza funksiya — har bo'lak mavjud parseQuickEntry bilan tahlil qilinadi.

import { DateTokenError, LocalDate, extractDateToken } from './date-token';
import { QuickEntryResult, parseQuickEntry } from './expense-parser';

/** Bitta xabardagi tranzaksiyalar yuqori chegarasi: spam va uzun xabarga qarshi. */
export const MAX_MULTI_ENTRIES = 20;

// Ajratgichlar: ";" va yangi qator har doim; "," — faqat raqamlar orasida
// bo'lmasa ("1,5 mln" bo'linmasin); alohida turgan "va" / "и".
const SEPARATORS = /;|\r?\n|(?<!\d),|,(?!\d)|\s+(?:va|и)\s+/iu;

// "27000ga banan" — summaga yopishgan "ga" qo'shimchasi. Bitta yozuv parseri
// buni tanimaydi (eski yo'l o'zgarmasin), shuning uchun faqat bo'lakda olib tashlanadi.
const GLUED_GA = /(\d)\s*ga(?=\s)/giu;

export type MultiEntryParse =
  | { ok: true; entries: QuickEntryResult[] }
  | { ok: false; error: DateTokenError }
  | null;

/**
 * Matnni bo'laklarga bo'lib, summasi topilganlarini qaytaradi. Ikkitadan kam
 * tanilsa null — chaqiruvchi eski bitta-yozuv yo'liga o'tadi. Sana xabarda bir
 * marta yozilsa ("kecha 27000ga banan, 31000ga non") o'z sanasi yo'q barcha
 * bo'lakka qo'llanadi; bo'lakning o'z sanasi ustun.
 */
export function parseMultiEntry(text: string, today: LocalDate): MultiEntryParse {
  const chunks = text.split(SEPARATORS).map((c) => c.replace(GLUED_GA, '$1').trim()).filter(Boolean);
  if (chunks.length < 2) return null;

  const entries: QuickEntryResult[] = [];
  let sharedDate: LocalDate | null = null;

  for (const chunk of chunks) {
    const parsed = parseQuickEntry(chunk, today);
    if (parsed) {
      if (!parsed.ok) return { ok: false, error: parsed.error };
      if (!sharedDate && parsed.entry.date) sharedDate = parsed.entry.date;
      entries.push(parsed.entry);
      continue;
    }
    // "kecha, 27000 banan, 31000 non" — sana alohida bo'lakda turishi mumkin.
    const token = extractDateToken(chunk, today);
    if (token.error) return { ok: false, error: token.error };
    if (token.date && !token.text.trim() && !sharedDate) sharedDate = token.date;
  }

  if (entries.length < 2) return null;
  return {
    ok: true,
    entries: entries.slice(0, MAX_MULTI_ENTRIES).map((e) => ({ ...e, date: e.date ?? sharedDate })),
  };
}
