import { PrismaClient, Prisma } from '@prisma/client';
import { AccountRow, TxSum, computeBalances, reorder, sortAccounts } from '../utils/accounts';

export class AccountService {
  constructor(private prisma: PrismaClient) {}

  async list(groupId: string): Promise<AccountRow[]> {
    const rows = await this.prisma.account.findMany({ where: { groupId, deletedAt: null } });
    return sortAccounts(rows.map((a) => ({
      id: a.id,
      name: a.name,
      icon: a.icon,
      currency: a.currency,
      initialBalance: Number(a.initialBalance),
      sortOrder: a.sortOrder,
      isHidden: a.isHidden,
    })));
  }

  async visible(groupId: string): Promise<AccountRow[]> {
    return (await this.list(groupId)).filter((a) => !a.isHidden);
  }

  /** Asosiy hisob — ochiqlar ichida eng tepadagisi. Hisob bo'lmasa null. */
  async primaryId(groupId: string): Promise<string | null> {
    return (await this.visible(groupId))[0]?.id ?? null;
  }

  async listWithBalances(groupId: string): Promise<{ accounts: AccountRow[]; balances: Map<string, number> }> {
    const accounts = await this.list(groupId);
    if (accounts.length === 0) return { accounts, balances: new Map() };
    const raw = await this.prisma.expense.groupBy({
      by: ['accountId', 'type', 'currency'],
      where: { groupId, status: 'ACTIVE', accountId: { in: accounts.map((a) => a.id) } },
      _sum: { amount: true },
    });
    const sums: TxSum[] = raw.map((r) => ({
      accountId: r.accountId,
      type: r.type,
      currency: r.currency,
      amount: Number(r._sum.amount ?? 0),
    }));
    return { accounts, balances: computeBalances(accounts, sums) };
  }

  async create(groupId: string, data: { name: string; icon: string; initialBalance: number }) {
    const accounts = await this.list(groupId);
    const sortOrder = accounts.length ? Math.max(...accounts.map((a) => a.sortOrder)) + 1 : 0;
    return this.prisma.account.create({
      data: {
        groupId,
        name: data.name,
        icon: data.icon,
        initialBalance: new Prisma.Decimal(data.initialBalance),
        sortOrder,
      },
    });
  }

  /** groupId where ichida: boshqa guruh hisobini soxta callback bilan o'zgartirib bo'lmaydi. */
  async setHidden(groupId: string, accountId: string, isHidden: boolean): Promise<boolean> {
    const res = await this.prisma.account.updateMany({
      where: { id: accountId, groupId, deletedAt: null },
      data: { isHidden },
    });
    return res.count > 0;
  }

  /** Balansi aynan 0 bo'lgan ochiq hisoblarni yopadi. Nechtasi yopilganini qaytaradi. */
  async hideZero(groupId: string): Promise<number> {
    const { accounts, balances } = await this.listWithBalances(groupId);
    const ids = accounts.filter((a) => !a.isHidden && balances.get(a.id) === 0).map((a) => a.id);
    if (ids.length === 0) return 0;
    const res = await this.prisma.account.updateMany({ where: { id: { in: ids }, groupId }, data: { isHidden: true } });
    return res.count;
  }

  async move(groupId: string, accountId: string, action: 'up' | 'top'): Promise<boolean> {
    const accounts = await this.list(groupId);
    if (!accounts.some((a) => a.id === accountId)) return false;
    // Ko'tarish ochiq hisoblar ichida bo'ladi: yashirin hisob orasida turgan
    // bo'lsa "up" bosilganda ko'rinmas joy almashuvi yuz bermasin.
    const visibleIds = accounts.filter((a) => !a.isHidden).map((a) => a.id);
    const newVisible = reorder(visibleIds, accountId, action);
    const hiddenIds = accounts.filter((a) => a.isHidden).map((a) => a.id);
    const order = [...newVisible, ...hiddenIds];
    await this.prisma.$transaction(
      order.map((id, i) => this.prisma.account.updateMany({ where: { id, groupId }, data: { sortOrder: i } })),
    );
    return true;
  }

  async belongsToGroup(groupId: string, accountId: string): Promise<boolean> {
    const n = await this.prisma.account.count({ where: { id: accountId, groupId, deletedAt: null } });
    return n > 0;
  }
}
