// Hisob balansi va tartibi — bot ham, API ham shu koddan foydalanadi,
// shunda /hisoblar va Mini App bir xil qoldiqni ko'rsatadi.

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
