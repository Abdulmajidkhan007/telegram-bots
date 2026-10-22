// Hisoblar (karta, naqd) — toza mantiq: balans, tartib, kiritish, callback.
// Bazasiz test qilinadi (test/accounts.test.js).

import { formatAmount, splitTrailingAmount, Currency, AccountRow, sortAccounts } from '@expense-tracker/shared';

const ID = '[a-z0-9]{20,32}';

export const ACC_LIST = 'acc:list';
export const ACC_LIST_ALL = 'acc:all';
export const ACC_ADD = 'acc:add';
export const ACC_HIDE_ZERO = 'acc:hidezero';
export const ACC_ACTION_RE = new RegExp(`^acc:(hide|show|up|top):(${ID})$`);

export const ACC_TRANSFER = 'acc:xfer';
export const ACC_TRANSFER_CANCEL = 'acc:xf:cancel';
// "acc:xf:from:<id>" — 7+5+4+32 < 64 bayt (Telegram chegarasi).
export const ACC_TRANSFER_PICK_RE = new RegExp(`^acc:xf:(from|to):(${ID})$`);

export type AccountAction = 'hide' | 'show' | 'up' | 'top';

export function accountActionData(action: AccountAction, accountId: string): string {
  if (!new RegExp(`^${ID}$`).test(accountId)) throw new Error(`Kutilmagan hisob ID: ${accountId}`);
  return `acc:${action}:${accountId}`;
}

export {
  AccountRow, TxSum, TransferSum, TransferError, computeBalances, sortAccounts, validateTransfer,
} from '@expense-tracker/shared';

export type TransferSide = 'from' | 'to';

export function transferPickData(side: TransferSide, accountId: string): string {
  if (!new RegExp(`^${ID}$`).test(accountId)) throw new Error(`Kutilmagan hisob ID: ${accountId}`);
  return `acc:xf:${side}:${accountId}`;
}

export interface TransferDraft {
  fromId?: string;
  toId?: string;
}

/** Transfer qaysi qadamda: qayerdan → qayerga → summa. */
export function transferStage(d: TransferDraft): 'from' | 'to' | 'amount' {
  if (!d.fromId) return 'from';
  if (!d.toId) return 'to';
  return 'amount';
}

/**
 * Tugma bosildi: faqat joriy qadamga mos tugma qabul qilinadi (eski xabardagi
 * tugma tartibni buzmasin) va "qayerga" "qayerdan" bilan bir xil bo'lmaydi.
 * Yaroqsiz bo'lsa null — draft o'zgarmaydi.
 */
export function applyTransferPick(d: TransferDraft, side: TransferSide, accountId: string): TransferDraft | null {
  if (transferStage(d) !== side) return null;
  if (side === 'from') return { fromId: accountId };
  if (accountId === d.fromId) return null;
  return { ...d, toId: accountId };
}

/**
 * Faqat summa yozilgan matn ("500 000", "1,5 mln", "50k"). splitTrailingAmount
 * oldida nom talab qiladi, shuning uchun soxta nom qo'shiladi; boshqa so'z bo'lsa — null.
 */
export function parseTransferAmount(text: string): number | null {
  const { rest, amount } = splitTrailingAmount(`x ${text.trim()}`);
  if (rest !== 'x' || amount === null || !Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}

export function formatTransferDone(from: AccountRow, to: AccountRow, amount: number): string {
  return `✅ Transfer: ${formatBalance(amount, from.currency)} · ${from.icon} ${from.name} → ${to.icon} ${to.name}`;
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
