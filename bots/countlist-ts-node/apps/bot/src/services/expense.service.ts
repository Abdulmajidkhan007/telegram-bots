import { PrismaClient, Expense, Prisma } from '@prisma/client';
import {
  formatAmount,
  getWeekNumber,
  getDayOfYear,
  dateColumns,
  parseQuickEntry,
  localDateInTz,
  localDateToStorage,
  LocalDate,
  DateTokenError,
} from '@expense-tracker/shared';
import { logger } from '../utils/logger';
import { deleteCacheValue } from '../utils/redis';
import { matchCategoryByName } from '../utils/entry-format';

export type CreateResult = { ok: true; expense: Expense } | { ok: false; error: DateTokenError };

export class ExpenseService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Tezkor kiritish: matn (yoki ovozdan olingan matn) → xarajat/daromad.
   * Sana matnda bo'lsa ("kecha", "12.10") — o'sha kun, bo'lmasa hozir.
   * Hisob — guruhning asosiy (eng tepadagi ochiq) hisobi, tugma bilan o'zgaradi.
   */
  async createFromText(params: {
    rawText: string;
    userId: string;
    groupId: string;
    timeZone: string;
    telegramMsgId?: bigint;
    source?: 'TEXT' | 'VOICE';
  }): Promise<CreateResult | null> {
    const today = localDateInTz(new Date(), params.timeZone);
    const parsed = parseQuickEntry(params.rawText, today);
    if (!parsed) return null;
    if ('error' in parsed) return { ok: false, error: parsed.error };
    const entry = parsed.entry;

    // Daromadga xarajat kategoriyasi qo'yilmaydi: "oylik" ichidagi tasodifiy
    // kalit so'z daromadni "Uy-joy" qilib qo'ymasin.
    const categoryId = entry.kind === 'expense'
      ? await this.resolveCategoryId(params.groupId, entry.description, entry.categoryHint)
      : null;
    const accountId = await this.primaryAccountId(params.groupId);

    const at = entry.date ? localDateToStorage(entry.date) : new Date();
    const expense = await this.prisma.expense.create({
      data: {
        userId: params.userId,
        groupId: params.groupId,
        categoryId,
        accountId,
        type: entry.kind === 'income' ? 'INCOME' : 'EXPENSE',
        amount: new Prisma.Decimal(entry.amount),
        currency: entry.currency,
        description: entry.description,
        rawText: params.rawText,
        ...dateColumns(at, entry.date ?? today),
        source: params.source ?? 'TEXT',
        telegramMsgId: params.telegramMsgId,
      },
    });

    await this.invalidateGroupCache(params.groupId);
    logger.info(`${expense.type} created: ${expense.id} - ${entry.amount} ${entry.currency}`);
    return { ok: true, expense };
  }

  private async primaryAccountId(groupId: string): Promise<string | null> {
    const acc = await this.prisma.account.findFirst({
      where: { groupId, isHidden: false, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true },
    });
    return acc?.id ?? null;
  }

  /**
   * Kategoriya tanlash tartibi:
   * 1) kalit so'z lug'ati (taksi → Transport);
   * 2) guruhning o'z kategoriyasi nomi izohda bor ("gul" → 🌸 Gul);
   * 3) shu guruhda xuddi shu izoh bilan oxirgi marta tanlangan kategoriya —
   *    foydalanuvchi bir marta tugma bilan tanlasa, keyingi safar o'zi qo'yiladi.
   */
  private async resolveCategoryId(groupId: string, description: string, hint?: string): Promise<string | null> {
    const scope = { OR: [{ groupId }, { isDefault: true }], deletedAt: null };
    if (hint) {
      const cat = await this.prisma.category.findFirst({ where: { ...scope, name: hint }, select: { id: true } });
      if (cat) return cat.id;
    }

    const custom = await this.prisma.category.findMany({
      where: { groupId, deletedAt: null, isDefault: false },
      select: { id: true, name: true },
    });
    const byName = matchCategoryByName(description, custom);
    if (byName) return byName;

    const prev = await this.prisma.expense.findFirst({
      where: {
        groupId,
        type: 'EXPENSE',
        status: 'ACTIVE',
        categoryId: { not: null },
        description: { equals: description, mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
      select: { categoryId: true },
    });
    return prev?.categoryId ?? null;
  }

  /**
   * Yozuv tugmalari (hisob, sana, kategoriya): faqat muallif, shu guruhda,
   * faol va UNDO_WINDOW_MS ichidagi yozuv. Shart where ichida — tekshiruv va
   * yozish orasida holat o'zgarsa ham boshqaning yozuvi o'zgarmaydi.
   */
  async updateByAuthor(
    params: { expenseId: string; userId: string; groupId: string; notBefore: Date },
    change: { accountId?: string; categoryId?: string; date?: LocalDate },
  ): Promise<boolean> {
    const data: Prisma.ExpenseUncheckedUpdateManyInput = {};
    if (change.accountId) data.accountId = change.accountId;
    if (change.categoryId) data.categoryId = change.categoryId;
    if (change.date) Object.assign(data, dateColumns(localDateToStorage(change.date), change.date));
    const res = await this.prisma.expense.updateMany({
      where: {
        id: params.expenseId,
        userId: params.userId,
        groupId: params.groupId,
        status: 'ACTIVE',
        createdAt: { gte: params.notBefore },
      },
      data,
    });
    if (res.count > 0) await this.invalidateGroupCache(params.groupId);
    return res.count > 0;
  }

  async findForRender(expenseId: string, groupId: string) {
    return this.prisma.expense.findFirst({
      where: { id: expenseId, groupId },
      include: { category: true, user: true, account: true },
    });
  }

  /**
   * "Bekor qilish" tugmasi: faqat muallifning o'zi, faqat shu guruhda, faqat
   * faol va UNDO_WINDOW_MS ichidagi xarajat. Shart where ichida — tekshiruv
   * va yozish orasida holat o'zgarsa ham ikki marta o'chmaydi.
   * API'dagi o'chirish bilan bir xil: status DELETED + deletedAt.
   */
  async cancelByAuthor(params: {
    expenseId: string;
    userId: string;
    groupId: string;
    notBefore: Date;
  }): Promise<boolean> {
    const res = await this.prisma.expense.updateMany({
      where: {
        id: params.expenseId,
        userId: params.userId,
        groupId: params.groupId,
        status: 'ACTIVE',
        createdAt: { gte: params.notBefore },
      },
      data: { status: 'DELETED', deletedAt: new Date() },
    });
    if (res.count > 0) await this.invalidateGroupCache(params.groupId);
    return res.count > 0;
  }

  async getTodayStats(groupId: string): Promise<string> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 86400000 - 1);

    const [expenses, total] = await Promise.all([
      this.prisma.expense.findMany({
        where: {
          groupId,
          date: { gte: startOfDay, lte: endOfDay },
          type: 'EXPENSE', status: 'ACTIVE',
        },
        include: { user: true, category: true },
        orderBy: { date: 'desc' },
        take: 10,
      }),
      this.prisma.expense.aggregate({
        where: {
          groupId,
          date: { gte: startOfDay, lte: endOfDay },
          type: 'EXPENSE', status: 'ACTIVE',
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    if (expenses.length === 0) {
      return '📅 *Bugun hech qanday xarajat yo\'q*\n\nXarajat qo\'shish uchun:\n`500000 so\'m ovqatga`';
    }

    const totalAmount = formatAmount(Number(total._sum.amount || 0));
    let msg = `📅 *Bugungi xarajatlar*\n`;
    msg += `💰 Jami: *${totalAmount}* (${total._count} ta)\n\n`;

    for (const exp of expenses.slice(0, 5)) {
      const amt = formatAmount(Number(exp.amount));
      const cat = exp.category ? `${exp.category.icon}` : '📦';
      msg += `${cat} ${exp.description} — *${amt}*\n`;
      msg += `   👤 ${exp.user.firstName}\n`;
    }

    if (expenses.length > 5) {
      msg += `\n_va yana ${expenses.length - 5} ta..._`;
    }

    return msg;
  }

  async getWeekStats(groupId: string): Promise<string> {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const [total, byDay] = await Promise.all([
      this.prisma.expense.aggregate({
        where: { groupId, date: { gte: weekStart }, type: 'EXPENSE', status: 'ACTIVE' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.expense.groupBy({
        by: ['dayOfYear'],
        where: { groupId, date: { gte: weekStart }, type: 'EXPENSE', status: 'ACTIVE' },
        _sum: { amount: true },
        orderBy: { dayOfYear: 'asc' },
      }),
    ]);

    const totalAmount = formatAmount(Number(total._sum.amount || 0));
    const dayNames = ['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha', 'Yak'];

    let msg = `📆 *Haftalik xarajatlar*\n`;
    msg += `💰 Jami: *${totalAmount}* (${total._count} ta)\n\n`;

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + i);
      const dayNum = getDayOfYear(dayDate);
      const dayData = byDay.find((d) => d.dayOfYear === dayNum);
      const dayTotal = dayData ? formatAmount(Number(dayData._sum.amount || 0)) : '—';
      const bar = dayData ? '▓'.repeat(Math.min(10, Math.floor(Number(dayData._sum.amount || 0) / 100000))) : '';
      msg += `${dayNames[i]}: ${dayTotal} ${bar}\n`;
    }

    return msg;
  }

  async getMonthStats(groupId: string): Promise<string> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const [total, income, byCategory, topUsers] = await Promise.all([
      this.prisma.expense.aggregate({
        where: { groupId, month, year, type: 'EXPENSE', status: 'ACTIVE' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.expense.aggregate({
        where: { groupId, month, year, type: 'INCOME', status: 'ACTIVE' },
        _sum: { amount: true },
      }),
      this.prisma.expense.groupBy({
        by: ['categoryId'],
        where: { groupId, month, year, type: 'EXPENSE', status: 'ACTIVE' },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 5,
      }),
      this.prisma.expense.groupBy({
        by: ['userId'],
        where: { groupId, month, year, type: 'EXPENSE', status: 'ACTIVE' },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 5,
      }),
    ]);

    const totalAmount = formatAmount(Number(total._sum.amount || 0));
    const monthName = now.toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' });

    let msg = `🗓 *${monthName} xarajatlari*\n`;
    msg += `💰 Jami: *${totalAmount}* (${total._count} ta)\n`;
    const incomeSum = Number(income._sum.amount || 0);
    if (incomeSum > 0) msg += `➕ Daromad: *${formatAmount(incomeSum)}*\n`;
    msg += '\n';

    if (byCategory.length > 0) {
      msg += `📊 *Kategoriyalar bo'yicha:*\n`;
      const catIds = byCategory.map((c) => c.categoryId).filter(Boolean) as string[];
      const cats = await this.prisma.category.findMany({ where: { id: { in: catIds } } });
      const catMap = new Map(cats.map((c) => [c.id, c]));

      for (const cat of byCategory) {
        const catInfo = cat.categoryId ? catMap.get(cat.categoryId) : null;
        const icon = catInfo?.icon || '📦';
        const name = catInfo?.name || 'Boshqa';
        const pct = total._sum.amount
          ? Math.round((Number(cat._sum.amount) / Number(total._sum.amount)) * 100)
          : 0;
        msg += `${icon} ${name}: *${formatAmount(Number(cat._sum.amount))}* (${pct}%)\n`;
      }
    }

    if (topUsers.length > 0) {
      msg += `\n👥 *Top sarflovchilar:*\n`;
      const userIds = topUsers.map((u) => u.userId);
      const users = await this.prisma.user.findMany({ where: { id: { in: userIds } } });
      const userMap = new Map(users.map((u) => [u.id, u]));

      for (let i = 0; i < topUsers.length; i++) {
        const u = topUsers[i];
        const userInfo = userMap.get(u.userId);
        const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i];
        msg += `${medal} ${userInfo?.firstName || 'User'}: *${formatAmount(Number(u._sum.amount))}*\n`;
      }
    }

    return msg;
  }

  async getTopCategories(groupId: string, month?: number, year?: number): Promise<string> {
    const now = new Date();
    const m = month || now.getMonth() + 1;
    const y = year || now.getFullYear();

    const data = await this.prisma.expense.groupBy({
      by: ['categoryId'],
      where: { groupId, month: m, year: y, type: 'EXPENSE', status: 'ACTIVE' },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
    });

    if (data.length === 0) {
      return '📊 Hozircha xarajat kategoriyalari mavjud emas';
    }

    const catIds = data.map((d) => d.categoryId).filter(Boolean) as string[];
    const cats = await this.prisma.category.findMany({ where: { id: { in: catIds } } });
    const catMap = new Map(cats.map((c) => [c.id, c]));

    const total = data.reduce((s, d) => s + Number(d._sum.amount || 0), 0);

    let msg = `📊 *Kategoriyalar reytingi*\n`;
    msg += `📅 ${now.toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' })}\n\n`;

    data.forEach((d, i) => {
      const cat = d.categoryId ? catMap.get(d.categoryId) : null;
      const icon = cat?.icon || '📦';
      const name = cat?.name || 'Boshqa';
      const amount = formatAmount(Number(d._sum.amount || 0));
      const pct = total ? Math.round((Number(d._sum.amount) / total) * 100) : 0;
      const bar = '█'.repeat(Math.floor(pct / 10));
      msg += `${i + 1}. ${icon} *${name}*\n`;
      msg += `   ${amount} • ${pct}% ${bar}\n`;
      msg += `   ${d._count} ta xarajat\n\n`;
    });

    return msg;
  }

  private async invalidateGroupCache(groupId: string): Promise<void> {
    await Promise.all([
      deleteCacheValue(`stats:today:${groupId}`),
      deleteCacheValue(`stats:week:${groupId}`),
      deleteCacheValue(`stats:month:${groupId}`),
    ]);
  }
}
