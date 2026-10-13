// Hisoblar (karta, naqd) — toza mantiq: balans, tartib, kiritish, callback.
// Bazasiz test qilinadi (test/accounts.test.js).

import { formatAmount, splitTrailingAmount, Currency } from '@expense-tracker/shared';

const ID = '[a-z0-9]{20,32}';

export const ACC_LIST = 'acc:list';
export const ACC_LIST_ALL = 'acc:all';
export const ACC_ADD = 'acc:add';
export const ACC_HIDE_ZERO = 'acc:hidezero';
export const ACC_ACTION_RE = new RegExp(`^acc:(hide|show|up|top):(${ID})$`);

export type AccountAction = 'hide' | 'show' | 'up' | 'top';

export function accountActionData(action: AccountAction, accountId: string): string {
  if (!new RegExp(`^${ID}$`).test(accountId)) throw new Error(`Kutilmagan hisob ID: ${accountId}`);
  return `acc:${action}:${accountId}`;
}

export interface AccountRow {
  id: string;
  name: string;
  icon: string;
  currency: string;
  initialBalance: number;
  sortOrder: number;
  isHidden: boolean;
}

export interface TxSum {
  accountId: string | null;
  type: 'EXPENSE' | 'INCOME';
  currency: string;
  amount: number;
}

/**
 * Balans = boshlang'ich + daromad − xarajat. Hisob valyutasidan boshqa
 * valyutadagi yozuvlar qo'shilmaydi: kurssiz 10$ ni so'mga qo'shish balansni
 * jimgina buzadi.
 */
export function computeBalances(accounts: AccountRow[], sums: TxSum[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const a of accounts) out.set(a.id, a.initialBalance);
  const currencyOf = new Map(accounts.map((a) => [a.id, a.currency]));
  for (const s of sums) {
    if (!s.accountId || !out.has(s.accountId)) continue;
    if (currencyOf.get(s.accountId) !== s.currency) continue;
    const sign = s.type === 'INCOME' ? 1 : -1;
    out.set(s.accountId, (out.get(s.accountId) ?? 0) + sign * s.amount);
  }
  // Decimal yig'indisidagi suzuvchi nuqta qoldig'i: 0.30000000000000004.
  // "|| 0": -0 ni oddiy 0 ga aylantiradi.
  for (const [id, v] of out) out.set(id, Math.round(v * 100) / 100 || 0);
  return out;
}

/** Tartib bo'yicha: kichik sortOrder tepada; teng bo'lsa — nom bo'yicha. */
export function sortAccounts<T extends Pick<AccountRow, 'sortOrder' | 'name'>>(accounts: T[]): T[] {
  return [...accounts].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

/**
 * Yangi tartib: "up" — bir pog'ona yuqoriga, "top" — eng tepaga (asosiy).
 * Qaytgan ro'yxat indeksi = yangi sortOrder. Yashirilganlar ham ro'yxatda
 * qoladi — qayta ochilganda o'z joyiga tushsin.
 */
export function reorder(ids: string[], id: string, action: 'up' | 'top'): string[] {
  const i = ids.indexOf(id);
  if (i <= 0) return [...ids];
  const out = [...ids];
  out.splice(i, 1);
  out.splice(action === 'top' ? 0 : i - 1, 0, id);
  return out;
}

/**
 * "💳 Humo 1,5 mln" → icon, nom, boshlang'ich balans. Nom bo'lmasa yoki juda
 * uzun bo'lsa — null (foydalanuvchiga format qayta ko'rsatiladi).
 */
export function parseAccountInput(text: string): { icon: string; name: string; initialBalance: number } | null {
  const t = text.trim().replace(/\s+/g, ' ');
  const em = /^(\p{Extended_Pictographic}[\u{FE0F}\u{200D}\p{Extended_Pictographic}]*)\s*(.*)$/u.exec(t);
  const icon = em ? em[1] : '💳';
  const { rest, amount } = splitTrailingAmount(em ? em[2] : t);
  const name = rest.trim();
  if (!name || name.length > 32) return null;
  // "50k taksi" — adashib xarajat yozilgan, hisob nomi emas.
  if (/^[-−–—+]?\s*\d/.test(name)) return null;
  return { icon, name, initialBalance: amount ?? 0 };
}

export function formatBalance(amount: number, currency: string): string {
  const sign = amount < 0 ? '−' : '';
  return sign + formatAmount(Math.abs(amount), currency as Currency);
}

export function formatAccountList(accounts: AccountRow[], balances: Map<string, number>, showHidden: boolean): string {
  const visible = sortAccounts(accounts.filter((a) => !a.isHidden));
  const hidden = sortAccounts(accounts.filter((a) => a.isHidden));

  if (accounts.length === 0) {
    return (
      "💳 Hisoblar hali yo'q.\n\n" +
      "Hisob — karta yoki naqd pul. Xarajat qaysi hisobdan ketganini belgilasangiz, " +
      "bot har birining qoldig'ini hisoblab boradi.\n\n" +
      '➕ tugmasini bosing.'
    );
  }

  let text = '💳 Hisoblar\n\n';
  visible.forEach((a, i) => {
    const star = i === 0 ? ' ⭐' : '';
    text += `${a.icon} ${a.name}${star} — ${formatBalance(balances.get(a.id) ?? 0, a.currency)}\n`;
  });
  if (visible.length === 0) text += "Ochiq hisob yo'q.\n";
  if (hidden.length > 0) {
    if (showHidden) {
      text += `\n🔒 Yopilgan (${hidden.length}):\n`;
      for (const a of hidden) text += `${a.icon} ${a.name} — ${formatBalance(balances.get(a.id) ?? 0, a.currency)}\n`;
    } else {
      text += `\n🔒 Yopilgan: ${hidden.length} ta`;
    }
  }
  return text.trimEnd() + "\n\n⭐ — asosiy: tezkor kiritishda avtomatik tanlanadi.";
}
