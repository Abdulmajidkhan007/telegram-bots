import { Prisma, PrismaClient, Group, Payment, GroupSubscription } from '@prisma/client';
import {
  BillingConfig, Feature, LimitResult, PaidPlan, Plan, STARS, UZS,
  applyGrant, applyPurchase, checkLimit, effectivePlan, period,
} from './billing.logic';

/** BILLING_ENABLED=1 bo'lmasa har metod bazaga TEGMASDAN qaytadi (test shuni tekshiradi). */
export class BillingService {
  constructor(private prisma: PrismaClient, readonly cfg: BillingConfig) {}

  get enabled(): boolean {
    return this.cfg.enabled;
  }

  // ─── Gate ──────────────────────────────────────────────────────────────────

  /** Flag o'chiq → har doim ruxsat, DB so'rovi yo'q. */
  async gate(groupId: string, feature: Feature, now = new Date()): Promise<LimitResult & { plan: Plan }> {
    if (!this.cfg.enabled) return { allowed: true, used: 0, limit: Infinity, plan: 'FREE' };
    const [plan, used] = await Promise.all([this.plan(groupId, now), this.used(groupId, feature, now)]);
    return { ...checkLimit(plan, feature, used), plan };
  }

  /** Hisoblar soni boshqa jadvaldan keladi — chaqiruvchi `current` ni beradi. */
  async gateCount(groupId: string, feature: Feature, current: number, now = new Date()): Promise<LimitResult> {
    if (!this.cfg.enabled) return { allowed: true, used: 0, limit: Infinity };
    return checkLimit(await this.plan(groupId, now), feature, current);
  }

  /** Atomik: parallel ikki ovoz ikki marta hisoblanadi (upsert + increment). */
  async recordUsage(groupId: string, feature: Feature, now = new Date()): Promise<void> {
    if (!this.cfg.enabled) return;
    await this.prisma.usageCounter.upsert({
      where: { groupId_feature_period: { groupId, feature, period: period(now) } },
      create: { groupId, feature, period: period(now), count: 1 },
      update: { count: { increment: 1 } },
    });
  }

  async used(groupId: string, feature: Feature, now = new Date()): Promise<number> {
    const row = await this.prisma.usageCounter.findUnique({
      where: { groupId_feature_period: { groupId, feature, period: period(now) } },
    });
    return row?.count ?? 0;
  }

  async subscription(groupId: string): Promise<GroupSubscription | null> {
    return this.prisma.groupSubscription.findUnique({ where: { groupId } });
  }

  async plan(groupId: string, now = new Date()): Promise<Plan> {
    return effectivePlan(await this.subscription(groupId), now);
  }

  // ─── Qidiruv ───────────────────────────────────────────────────────────────

  groupById(id: string): Promise<Group | null> {
    return this.prisma.group.findUnique({ where: { id } });
  }

  async isMember(userId: string, groupId: string): Promise<boolean> {
    const m = await this.prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } });
    return !!m && m.isActive;
  }

  pendingOf(userId: string): Promise<Payment | null> {
    return this.prisma.payment.findFirst({ where: { userId, status: 'PENDING' } });
  }

  /** Bir xil chek (file_unique_id) oldin kelganmi — soxta/takroriy chekni aniqlash. */
  seenReceipt(uniqueId: string): Promise<Payment | null> {
    return this.prisma.payment.findFirst({ where: { receiptUniqueId: uniqueId }, orderBy: { createdAt: 'asc' } });
  }

  // ─── Karta ─────────────────────────────────────────────────────────────────

  createPendingCard(data: {
    groupId: string; userId: string; plan: PaidPlan; amount: number;
    receiptFileId: string; receiptUniqueId: string;
  }): Promise<Payment> {
    return this.prisma.payment.create({
      data: { ...data, method: 'CARD', currency: UZS, status: 'PENDING' },
    });
  }

  /**
   * ✅: PENDING → APPROVED va obuna — bitta tranzaksiyada. Ikki admin bosishi ham,
   * pastroq planga to'g'ri kelib qolgan chek ham obunani buzmaydi (rollback).
   */
  async approveCard(paymentId: string, adminTelegramId: bigint, now = new Date()) {
    return this.prisma.$transaction(async (tx) => {
      const pay = await tx.payment.findUnique({ where: { id: paymentId }, include: { group: true, user: true } });
      if (!pay || pay.method !== 'CARD') return { kind: 'missing' as const };
      if (pay.status !== 'PENDING') return { kind: 'decided' as const, payment: pay };
      const sub = await tx.groupSubscription.findUnique({ where: { groupId: pay.groupId } });
      const res = applyPurchase(sub, pay.plan, now, this.cfg.prices);
      if (!res.ok) return { kind: 'rejected' as const, payment: pay };
      // Shartli yangilash: ikki marta tez bosilsa ikkala tranzaksiya ham yuqorida
      // PENDING ko'rishi mumkin (READ COMMITTED) — faqat birinchisi obunani uzaytiradi.
      const claimed = await tx.payment.updateMany({
        where: { id: pay.id, status: 'PENDING' },
        data: { status: 'APPROVED', decidedBy: adminTelegramId, decidedAt: now },
      });
      if (claimed.count !== 1) return { kind: 'decided' as const, payment: pay };
      await tx.groupSubscription.upsert({
        where: { groupId: pay.groupId },
        create: { groupId: pay.groupId, plan: res.plan, expiresAt: res.expiresAt, source: 'CARD' },
        update: { plan: res.plan, expiresAt: res.expiresAt, source: 'CARD' },
      });
      return { kind: 'approved' as const, payment: pay, plan: res.plan, expiresAt: res.expiresAt };
    });
  }

  /** ❌: faqat PENDING rad etiladi (allaqachon hal bo'lganini qayta o'zgartirmaydi). */
  async rejectCard(paymentId: string, adminTelegramId: bigint, now = new Date()) {
    const pay = await this.prisma.payment.findUnique({ where: { id: paymentId }, include: { group: true, user: true } });
    if (!pay || pay.method !== 'CARD') return null;
    const res = await this.prisma.payment.updateMany({
      where: { id: paymentId, status: 'PENDING' },
      data: { status: 'REJECTED', decidedBy: adminTelegramId, decidedAt: now },
    });
    return { payment: pay, changed: res.count === 1 };
  }

  // ─── Stars ─────────────────────────────────────────────────────────────────

  /** pre_checkout uchun: shu guruh va plan hozir sotib olinishi mumkinmi. */
  async canPurchase(groupId: string, plan: PaidPlan, now = new Date()): Promise<'ok' | 'no_group' | 'downgrade'> {
    if (!(await this.groupById(groupId))) return 'no_group';
    const res = applyPurchase(await this.subscription(groupId), plan, now, this.cfg.starsPrices);
    return res.ok ? 'ok' : 'downgrade';
  }

  /**
   * successful_payment. telegram_charge_id UNIQUE: takroriy yetkazilsa 'duplicate' —
   * obuna ikki marta qo'shilmaydi. Qo'llab bo'lmasa (poyga: pastroq plan) to'lov
   * REJECTED sifatida yoziladi va chaqiruvchi adminni ogohlantiradi (pul qaytarish kerak).
   */
  async recordStars(data: {
    groupId: string; userId: string; plan: PaidPlan; amount: number; chargeId: string;
  }, now = new Date()) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const sub = await tx.groupSubscription.findUnique({ where: { groupId: data.groupId } });
        const res = applyPurchase(sub, data.plan, now, this.cfg.starsPrices);
        const base = {
          groupId: data.groupId, userId: data.userId, plan: data.plan, method: 'STARS' as const,
          amount: data.amount, currency: STARS, telegramChargeId: data.chargeId, decidedAt: now,
        };
        if (!res.ok) {
          const payment = await tx.payment.create({ data: { ...base, status: 'REJECTED' } });
          return { kind: 'unapplied' as const, payment };
        }
        const payment = await tx.payment.create({ data: { ...base, status: 'APPROVED' } });
        await tx.groupSubscription.upsert({
          where: { groupId: data.groupId },
          create: { groupId: data.groupId, plan: res.plan, expiresAt: res.expiresAt, source: 'STARS' },
          update: { plan: res.plan, expiresAt: res.expiresAt, source: 'STARS' },
        });
        return { kind: 'applied' as const, payment, plan: res.plan, expiresAt: res.expiresAt };
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return { kind: 'duplicate' as const };
      }
      throw err;
    }
  }

  // ─── Admin ─────────────────────────────────────────────────────────────────

  async grant(groupTelegramId: bigint, plan: PaidPlan, days: number, now = new Date()) {
    const group = await this.prisma.group.findUnique({ where: { telegramId: groupTelegramId } });
    if (!group) return null;
    const sub = await this.subscription(group.id);
    const expiresAt = applyGrant(sub, plan, days, now);
    await this.prisma.groupSubscription.upsert({
      where: { groupId: group.id },
      create: { groupId: group.id, plan, expiresAt, source: 'ADMIN' },
      update: { plan, expiresAt, source: 'ADMIN' },
    });
    return { group, plan, expiresAt };
  }
}
