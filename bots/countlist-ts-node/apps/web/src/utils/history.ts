import { formatAmount } from './format';
import type { TransactionType } from '@/types/transaction';

// Bot va API default mintaqasi (Group.timezone). Guruh ro'yxati mintaqani
// qaytarmaydi; hamma guruh hozircha Toshkentda.
export const GROUP_TZ = 'Asia/Tashkent';

export function signedAmount(type: TransactionType, amount: number, currency: string): string {
  return `${type === 'INCOME' ? '+' : '−'}${formatAmount(amount, currency)}`;
}
