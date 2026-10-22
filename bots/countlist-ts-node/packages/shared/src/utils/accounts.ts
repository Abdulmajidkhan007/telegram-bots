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

/** Hisoblar orasidagi o'tkazma yig'indisi (Transfer jadvalidan, from/to/valyuta bo'yicha). */
export interface TransferSum {
  fromAccountId: string;
  toAccountId: string;
  currency: string;
  amount: number;
}

/**
 * Balans = boshlang'ich + daromad − xarajat. Hisob valyutasidan boshqa
 * valyutadagi yozuvlar qo'shilmaydi: kurssiz 10$ ni so'mga qo'shish balansni
 * jimgina buzadi.
 */
export function computeBalances(
  accounts: AccountRow[],
  sums: TxSum[],
  // Ixtiyoriy: eski chaqiruvlar (transfersiz) o'zgarishsiz ishlaydi.
  transfers: TransferSum[] = [],
): Map<string, number> {
  const out = new Map<string, number>();
  for (const a of accounts) out.set(a.id, a.initialBalance);
  const currencyOf = new Map(accounts.map((a) => [a.id, a.currency]));
  for (const s of sums) {
    if (!s.accountId || !out.has(s.accountId)) continue;
    if (currencyOf.get(s.accountId) !== s.currency) continue;
    const sign = s.type === 'INCOME' ? 1 : -1;
    out.set(s.accountId, (out.get(s.accountId) ?? 0) + sign * s.amount);
  }
  // Transfer: chiqayotgan hisobdan −, kirayotganga +. Valyutasi hisobnikiga mos
  // kelmagan tomon o'tkazilmaydi (xuddi tranzaksiyalardagidek).
  for (const t of transfers) {
    if (out.has(t.fromAccountId) && currencyOf.get(t.fromAccountId) === t.currency) {
      out.set(t.fromAccountId, (out.get(t.fromAccountId) ?? 0) - t.amount);
    }
    if (out.has(t.toAccountId) && currencyOf.get(t.toAccountId) === t.currency) {
      out.set(t.toAccountId, (out.get(t.toAccountId) ?? 0) + t.amount);
    }
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

export type TransferError = 'SAME_ACCOUNT' | 'BAD_AMOUNT' | 'CURRENCY_MISMATCH';

/** Transfer kiritishini tekshiradi: xato kodi yoki null (to'g'ri). */
export function validateTransfer(
  from: Pick<AccountRow, 'id' | 'currency'>,
  to: Pick<AccountRow, 'id' | 'currency'>,
  amount: number,
): TransferError | null {
  if (from.id === to.id) return 'SAME_ACCOUNT';
  if (!Number.isFinite(amount) || amount <= 0) return 'BAD_AMOUNT';
  // Kurssiz valyuta almashtirib bo'lmaydi: bir tomonga 10$ → boshqasiga 10 so'm bo'lib qolardi.
  if (from.currency !== to.currency) return 'CURRENCY_MISMATCH';
  return null;
}
