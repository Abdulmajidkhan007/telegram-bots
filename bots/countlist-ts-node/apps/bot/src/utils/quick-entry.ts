// Tezkor kiritish (guruhda shunchaki "- 10 ming taksiga" yozish) uchun toza
// yordamchilar — Telegram va bazasiz test qilinadi.

// Xarajat yozilgach "Bekor qilish" shu muddat ichida ishlaydi. Eski xabardagi
// tugma bir oydan keyin bosilib, hisobot jimgina o'zgarib ketmasin.
export const UNDO_WINDOW_MS = 24 * 60 * 60 * 1000;

const UNDO_PREFIX = 'exp:undo:';
// Prisma cuid() — kichik lotin harf va raqamlar. callback_data foydalanuvchi
// qo'lida (soxta tugma yasash mumkin), shuning uchun format qat'iy tekshiriladi.
const EXPENSE_ID_RE = /^[a-z0-9]{20,32}$/;

export const UNDO_CALLBACK_RE = /^exp:undo:([a-z0-9]{20,32})$/;

export function undoCallbackData(expenseId: string): string {
  if (!EXPENSE_ID_RE.test(expenseId)) {
    throw new Error(`Kutilmagan xarajat ID formati: ${expenseId}`);
  }
  // Telegram cheklovi: callback_data ≤ 64 bayt.
  return UNDO_PREFIX + expenseId;
}

export function parseUndoCallback(data: string | undefined): string | null {
  const m = data ? UNDO_CALLBACK_RE.exec(data) : null;
  return m ? m[1] : null;
}

export const INCOME_NOT_SUPPORTED =
  "➕ Daromad yozuvi hali qo'llanmaydi — bot faqat xarajatlarni hisoblaydi. " +
  'Xarajat uchun: "- 10 ming taksiga" yoki "10 ming taksiga".';
