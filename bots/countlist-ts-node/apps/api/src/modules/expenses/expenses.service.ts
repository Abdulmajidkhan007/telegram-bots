import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, Expense } from '@prisma/client';
import { getWeekNumber, getDayOfYear, localDateInTz } from '@expense-tracker/shared';
import { buildExpenseUpdate, ExpenseChangeError } from './expense-update';

const logger = new Logger('ExpensesService');

/** Bazadagi noto'g'ri mintaqa butun tahrirni yiqitmasin — log va Toshkent. */
function safeTimeZone(tz: string | undefined): string {
  if (!tz) return 'Asia/Tashkent';
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return tz;
  } catch (err) {
    logger.warn(`Guruh vaqt mintaqasi noto'g'ri ("${tz}"): ${(err as Error).message}`);
    return 'Asia/Tashkent';
  }
}
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';
import { PaginationMeta } from '@expense-tracker/shared';
import { GroupAccessService } from '../../common/access/group-access.service';

@Injectable()
export class ExpensesService {
  constructor(
    private prisma: PrismaService,
    private access: GroupAccessService,
  ) {}

  async create(userId: string, dto: CreateExpenseDto): Promise<Expense> {
    const now = dto.date ? new Date(dto.date) : new Date();

    return this.prisma.expense.create({
      data: {
        userId,
        groupId: dto.groupId,
        categoryId: dto.categoryId,
        amount: new Prisma.Decimal(dto.amount),
        currency: dto.currency || 'UZS',
        description: dto.description,
        date: now,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        week: getWeekNumber(now),
        dayOfYear: getDayOfYear(now),
        source: dto.source || 'MANUAL',
      },
      include: { category: true, user: true, group: true },
    });
  }

  async findAll(params: {
    groupId: string;
    userId?: string;
    categoryId?: string;
    month?: number;
    year?: number;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    /** Default EXPENSE: eski dashboard sahifalari daromadni xarajat deb ko'rsatmasin. */
    type?: 'EXPENSE' | 'INCOME' | 'ALL';
    search?: string;
  }): Promise<{ data: Expense[]; meta: PaginationMeta }> {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ExpenseWhereInput = {
      groupId: params.groupId,
      status: 'ACTIVE',
      deletedAt: null,
    };

    const type = params.type ?? 'EXPENSE';
    if (type !== 'ALL') where.type = type;
    const search = params.search?.trim();
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { category: { name: { contains: search, mode: 'insensitive' } } },
        { account: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (params.userId) where.userId = params.userId;
    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.month) where.month = params.month;
    if (params.year) where.year = params.year;
    if (params.startDate || params.endDate) {
      where.date = {};
      if (params.startDate) where.date.gte = params.startDate;
      if (params.endDate) where.date.lte = params.endDate;
    }

    const orderBy: Prisma.ExpenseOrderByWithRelationInput = {
      [params.sortBy || 'date']: params.sortOrder || 'desc',
    };

    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: { category: true, user: true, account: true },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, userId: string): Promise<Expense> {
    const expense = await this.prisma.expense.findFirst({
      where: { id, deletedAt: null },
      include: { category: true, user: true, group: true },
    });

    // Faqat o'sha guruh a'zosi ko'radi; update/remove ham shu orqali o'tadi.
    await this.access.assertMemberOfRecord(userId, expense, 'Expense not found');
    return expense;
  }

  async update(id: string, userId: string, dto: UpdateExpenseDto): Promise<Expense> {
    const expense = await this.findOne(id, userId);
    if (expense.userId !== userId) throw new ForbiddenException("Faqat o'zingiz yozgan yozuvni tahrirlay olasiz");
    if (expense.status !== 'ACTIVE') throw new NotFoundException('Expense not found');

    // Soxta ID bilan boshqa guruh kategoriyasi/hisobini ulab bo'lmasin.
    if (dto.categoryId) {
      const cat = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, OR: [{ groupId: expense.groupId }, { isDefault: true }], deletedAt: null },
        select: { id: true },
      });
      if (!cat) throw new BadRequestException('Kategoriya topilmadi');
    }
    if (dto.accountId) {
      const acc = await this.prisma.account.findFirst({
        where: { id: dto.accountId, groupId: expense.groupId, deletedAt: null },
        select: { id: true },
      });
      if (!acc) throw new BadRequestException('Hisob topilmadi');
    }

    const group = (expense as Expense & { group?: { timezone?: string } }).group;
    const today = localDateInTz(new Date(), safeTimeZone(group?.timezone));
    let data: Prisma.ExpenseUncheckedUpdateInput;
    try {
      data = buildExpenseUpdate(dto, today);
    } catch (err) {
      if (err instanceof ExpenseChangeError) throw new BadRequestException(err.message);
      throw err;
    }

    return this.prisma.expense.update({
      where: { id },
      data,
      include: { category: true, user: true, account: true },
    });
  }

  async remove(id: string, userId: string): Promise<void> {
    const expense = await this.findOne(id, userId);
    if (expense.userId !== userId) throw new ForbiddenException('Not your expense');

    await this.prisma.expense.update({
      where: { id },
      data: { status: 'DELETED', deletedAt: new Date() },
    });
  }

  async getGroupStats(groupId: string, month: number, year: number) {
    const [total, byCategory, byUser, daily] = await Promise.all([
      this.prisma.expense.aggregate({
        where: { groupId, month, year, type: 'EXPENSE', status: 'ACTIVE' },
        _sum: { amount: true },
        _count: true,
        _avg: { amount: true },
      }),

      this.prisma.expense.groupBy({
        by: ['categoryId'],
        where: { groupId, month, year, type: 'EXPENSE', status: 'ACTIVE' },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
      }),

      this.prisma.expense.groupBy({
        by: ['userId'],
        where: { groupId, month, year, type: 'EXPENSE', status: 'ACTIVE' },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
      }),

      this.prisma.expense.groupBy({
        by: ['dayOfYear'],
        where: { groupId, month, year, type: 'EXPENSE', status: 'ACTIVE' },
        _sum: { amount: true },
        _count: true,
        orderBy: { dayOfYear: 'asc' },
      }),
    ]);

    const catIds = byCategory.map((c) => c.categoryId).filter(Boolean) as string[];
    const userIds = byUser.map((u) => u.userId);

    const [categories, users] = await Promise.all([
      this.prisma.category.findMany({ where: { id: { in: catIds } } }),
      this.prisma.user.findMany({ where: { id: { in: userIds } } }),
    ]);

    const catMap = new Map(categories.map((c) => [c.id, c]));
    const userMap = new Map(users.map((u) => [u.id, u]));
    const totalAmt = Number(total._sum.amount || 0);

    return {
      total: {
        amount: totalAmt,
        count: total._count,
        avg: Number(total._avg.amount || 0),
      },
      byCategory: byCategory.map((c) => {
        const cat = c.categoryId ? catMap.get(c.categoryId) : null;
        const amt = Number(c._sum.amount || 0);
        return {
          categoryId: c.categoryId,
          categoryName: cat?.name || 'Boshqa',
          icon: cat?.icon || '📦',
          color: cat?.color || '#94a3b8',
          amount: amt,
          count: c._count,
          percentage: totalAmt ? Math.round((amt / totalAmt) * 100) : 0,
        };
      }),
      byUser: byUser.map((u) => {
        const user = userMap.get(u.userId);
        const amt = Number(u._sum.amount || 0);
        return {
          userId: u.userId,
          firstName: user?.firstName || 'Unknown',
          username: user?.username || null,
          amount: amt,
          count: u._count,
          percentage: totalAmt ? Math.round((amt / totalAmt) * 100) : 0,
        };
      }),
      daily: daily.map((d) => ({
        dayOfYear: d.dayOfYear,
        amount: Number(d._sum.amount || 0),
        count: d._count,
      })),
    };
  }
}
