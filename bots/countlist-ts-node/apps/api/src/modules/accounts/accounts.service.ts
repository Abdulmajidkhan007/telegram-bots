import { Injectable } from '@nestjs/common';
import { computeBalances, sortAccounts, AccountRow } from '@expense-tracker/shared';
import { PrismaService } from '../../prisma/prisma.service';

export interface AccountWithBalance extends AccountRow {
  balance: number;
}

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  /** Bot /hisoblar bilan bir xil hisob (shared computeBalances). */
  async listWithBalances(groupId: string): Promise<AccountWithBalance[]> {
    const rows = await this.prisma.account.findMany({ where: { groupId, deletedAt: null } });
    const accounts: AccountRow[] = sortAccounts(rows.map((a) => ({
      id: a.id,
      name: a.name,
      icon: a.icon,
      currency: a.currency,
      initialBalance: Number(a.initialBalance),
      sortOrder: a.sortOrder,
      isHidden: a.isHidden,
    })));
    if (accounts.length === 0) return [];
    const raw = await this.prisma.expense.groupBy({
      by: ['accountId', 'type', 'currency'],
      where: { groupId, status: 'ACTIVE', accountId: { in: accounts.map((a) => a.id) } },
      _sum: { amount: true },
    });
    const transfers = await this.prisma.transfer.groupBy({
      by: ['fromAccountId', 'toAccountId', 'currency'],
      where: { groupId, deletedAt: null },
      _sum: { amount: true },
    });
    const balances = computeBalances(accounts, raw.map((r) => ({
      accountId: r.accountId,
      type: r.type,
      currency: r.currency,
      amount: Number(r._sum.amount ?? 0),
    })), transfers.map((t) => ({
      fromAccountId: t.fromAccountId,
      toAccountId: t.toAccountId,
      currency: t.currency,
      amount: Number(t._sum.amount ?? 0),
    })));
    return accounts.map((a) => ({ ...a, balance: balances.get(a.id) ?? 0 }));
  }
}
