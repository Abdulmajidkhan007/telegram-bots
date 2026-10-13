// API javoblari (Expense jadvali — xarajat ham, daromad ham).
export type TransactionType = 'EXPENSE' | 'INCOME';
export type TypeFilter = TransactionType | 'ALL';

export interface CategoryRef {
  id: string;
  name: string;
  icon: string;
}

export interface AccountRef {
  id: string;
  name: string;
  icon: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: string | number;
  currency: string;
  description: string;
  date: string;
  userId: string;
  categoryId: string | null;
  accountId: string | null;
  category: CategoryRef | null;
  account: AccountRef | null;
  user: { id: string; firstName: string } | null;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface AccountWithBalance extends AccountRef {
  currency: string;
  isHidden: boolean;
  sortOrder: number;
  balance: number;
}

export interface TransactionPatch {
  amount?: number;
  description?: string;
  type?: TransactionType;
  categoryId?: string | null;
  accountId?: string | null;
  /** "YYYY-MM-DD" */
  date?: string;
}
