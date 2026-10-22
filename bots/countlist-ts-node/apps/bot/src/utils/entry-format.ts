// Tezkor kiritish javobi: matn va tugmalar. Toza funksiyalar — Telegraf
// Markup'ga handler'da aylantiriladi, shuning uchun bazasiz test qilinadi.

import { Currency, LocalDate, compareLocalDate, formatAmount, formatShortDate, addDays } from '@expense-tracker/shared';
import { batchUndoCallbackData, datePickerOptions, txCallback, undoCallbackData } from './quick-entry';

export interface Button {
  text: string;
  data: string;
}

export interface EntryView {
  id: string;
  type: 'EXPENSE' | 'INCOME';
  amount: number;
  currency: string;
  description: string;
  /** Guruh mintaqasidagi kalendar kuni. */
  day: LocalDate;
  category: { icon: string; name: string } | null;
  account: { id: string; icon: string; name: string } | null;
  authorName: string;
}

export interface Option {
  id: string;
  icon: string;
  name: string;
}

// Ko'p hisob bo'lsa ham xabar tugmalarga ko'milib ketmasin.
export const MAX_ACCOUNT_BUTTONS = 9;

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

export function dayLabel(day: LocalDate, today: LocalDate): string {
  const short = formatShortDate(day, today);
  if (compareLocalDate(day, today) === 0) return `Bugun, ${short}`;
  if (compareLocalDate(day, addDays(today, -1)) === 0) return `Kecha, ${short}`;
  return short;
}

export function formatEntryText(v: EntryView, today: LocalDate, prefix = ''): string {
  const income = v.type === 'INCOME';
  const lines = [
    `${prefix}✅ ${income ? 'Daromad' : 'Xarajat'} yozildi`,
    '',
    `${income ? '➕' : '💵'} ${formatAmount(v.amount, v.currency as Currency)} — ${v.description}`,
  ];
  if (!income) lines.push(`🏷 ${v.category ? `${v.category.icon} ${v.category.name}` : '📦 Kategoriyasiz'}`);
  if (v.account) lines.push(`${v.account.icon} ${v.account.name}`);
  lines.push(`📅 ${dayLabel(v.day, today)}`);
  lines.push(`👤 ${v.authorName}`);
  return lines.join('\n');
}

export function entryKeyboard(v: EntryView, accounts: Option[]): Button[][] {
  const accButtons = accounts.slice(0, MAX_ACCOUNT_BUTTONS).map((a) => ({
    text: `${v.account?.id === a.id ? '✓ ' : ''}${a.icon} ${a.name}`,
    data: txCallback.account(v.id, a.id),
  }));
  const rows = chunk(accButtons, 3);
  const edit: Button[] = [{ text: '📅 Sana', data: txCallback.dateMenu(v.id) }];
  if (v.type === 'EXPENSE') edit.push({ text: '🏷 Kategoriya', data: txCallback.categoryMenu(v.id) });
  rows.push(edit);
  rows.push([{ text: '↩️ Bekor qilish', data: undoCallbackData(v.id) }]);
  return rows;
}

export function dateKeyboard(v: EntryView, today: LocalDate): Button[][] {
  const opts = datePickerOptions(today).map((o) => ({
    text: `${compareLocalDate(o.date, v.day) === 0 ? '✓ ' : ''}${o.label}`,
    data: txCallback.date(v.id, o.date),
  }));
  return [...chunk(opts, 4), [{ text: '⬅️ Orqaga', data: txCallback.back(v.id) }]];
}

export function categoryKeyboard(v: EntryView, categories: Option[], currentId: string | null): Button[][] {
  const opts = categories.map((c) => ({
    text: `${c.id === currentId ? '✓ ' : ''}${c.icon} ${c.name}`,
    data: txCallback.category(v.id, c.id),
  }));
  return [
    ...chunk(opts, 2),
    [{ text: '➕ Yangi kategoriya', data: txCallback.newCategory(v.id) }],
    [{ text: '⬅️ Orqaga', data: txCallback.back(v.id) }],
  ];
}

/**
 * Guruhning o'z kategoriyasi izohda bormi: "gulga 50k" → "Gul". So'z boshi
 * bo'yicha (o'zbek qo'shimchalari: -ga, -lar, -ni), eng uzun nom yutadi.
 * 3 harfdan qisqa nomlar e'tiborsiz — "Uy" har "uyqu" ga yopishmasin.
 */
export function matchCategoryByName(description: string, categories: Array<{ id: string; name: string }>): string | null {
  const words = description.toLocaleLowerCase('uz').split(/[^\p{L}\p{N}'`‘’ʻ-]+/u).filter(Boolean);
  const text = words.join(' ');
  let best: { id: string; len: number } | null = null;
  for (const c of categories) {
    const name = c.name.toLocaleLowerCase('uz').trim();
    if (name.length < 3) continue;
    const hit = name.includes(' ')
      ? text.includes(name)
      : words.some((w) => w.startsWith(name));
    if (hit && (!best || name.length > best.len)) best = { id: c.id, len: name.length };
  }
  return best?.id ?? null;
}

export interface BatchRow {
  type: 'EXPENSE' | 'INCOME';
  amount: number;
  currency: string;
  description: string;
  day: LocalDate;
}

/** 27000 → "27 000 so'm" (yig'ma ro'yxatda "27k" emas, aniq summa kerak). */
function exactAmount(amount: number, currency: string): string {
  if (currency !== 'UZS') return formatAmount(amount, currency as Currency);
  return `${Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so'm`;
}

function totalsLine(rows: BatchRow[], type: BatchRow['type']): string | null {
  const sums = new Map<string, number>();
  for (const r of rows) if (r.type === type) sums.set(r.currency, (sums.get(r.currency) ?? 0) + r.amount);
  if (sums.size === 0) return null;
  return [...sums].map(([cur, sum]) => exactAmount(sum, cur)).join(' + ');
}

/** Bitta xabardan bir nechta yozuv: qatorlar, jami, sana, hisob. */
export function formatBatchText(rows: BatchRow[], today: LocalDate, accountName: string | null, prefix = ''): string {
  const lines = [`${prefix}✅ ${rows.length} ta yozuv saqlandi`, ''];
  for (const r of rows) {
    lines.push(`${r.type === 'INCOME' ? '➕ Kirim' : '🔴 Chiqim'}: ${exactAmount(r.amount, r.currency)} — ${r.description}`);
  }
  lines.push('');
  const expense = totalsLine(rows, 'EXPENSE');
  const income = totalsLine(rows, 'INCOME');
  if (expense) lines.push(`📊 Jami chiqim: ${expense}`);
  if (income) lines.push(`📊 Jami kirim: ${income}`);
  const days = new Map<string, LocalDate>();
  for (const r of rows) days.set(`${r.day.year}-${r.day.month}-${r.day.day}`, r.day);
  lines.push(`📅 ${[...days.values()].map((d) => dayLabel(d, today)).join(', ')}`);
  if (accountName) lines.push(accountName);
  return lines.join('\n');
}

export function batchKeyboard(groupId: string, telegramMsgId: number): Button[][] {
  return [[{ text: '↩️ Hammasini bekor qilish', data: batchUndoCallbackData(groupId, telegramMsgId) }]];
}
