// Paketlar va to'lov — TOZA mantiq (baza va Telegram'siz, to'liq test qilinadi).
// Obuna birligi — GURUH. Stars/karta qoidalari hr-bot'dan ko'chirilgan (billing.py).

export type Plan = 'FREE' | 'PLUS' | 'PRO' | 'MAX';
export type PaidPlan = Exclude<Plan, 'FREE'>;
export type Feature = 'voice' | 'accounts';

export const PLAN_ORDER: readonly Plan[] = ['FREE', 'PLUS', 'PRO', 'MAX'];
export const PAID_PLANS: readonly PaidPlan[] = ['PLUS', 'PRO', 'MAX'];

export const PLAN_NAMES: Record<Plan, string> = {
  FREE: 'Free', PLUS: 'Plus', PRO: 'Pro', MAX: 'Max',
};

/** Oyiga, guruhga. «Cheksiz» yo'q — Max uchun ham texnik chegara (API xarajati nazoratda). */
export const LIMITS: Record<Feature, Record<Plan, number>> = {
  voice: { FREE: 30, PLUS: 300, PRO: 1000, MAX: 3000 },
  accounts: { FREE: 3, PLUS: 10, PRO: 30, MAX: 100 },
};

export const STARS = 'XTR';
export const UZS = 'UZS';
/** Bot API createInvoiceLink.subscription_period: hozircha faqat shu qiymat ruxsat etilgan. */
export const SUBSCRIPTION_SECONDS = 2592000;
export const PERIOD_DAYS = SUBSCRIPTION_SECONDS / 86400; // 30
const DAY_MS = 86_400_000;
const BILLING_TZ = 'Asia/Tashkent';

export interface SubscriptionLike {
  plan: Plan;
  expiresAt: Date;
}

export function isPaidPlan(v: unknown): v is PaidPlan {
  return v === 'PLUS' || v === 'PRO' || v === 'MAX';
}

export function planRank(plan: Plan): number {
  return PLAN_ORDER.indexOf(plan);
}

/** Obuna yo'q yoki muddati o'tgan (expiresAt <= now) — FREE. */
export function effectivePlan(sub: SubscriptionLike | null | undefined, now: Date): Plan {
  if (!sub || sub.plan === 'FREE') return 'FREE';
  return sub.expiresAt.getTime() > now.getTime() ? sub.plan : 'FREE';
}

/** Hisoblagich davri 'YYYY-MM' — Toshkent bo'yicha: oy 31-kun 23:30 (UTC+5) hali o'sha oy. */
export function period(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: BILLING_TZ, year: 'numeric', month: '2-digit' })
    .formatToParts(now);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  if (!year || !month) throw new Error('period: Intl yil/oyni qaytarmadi');
  return `${year}-${month}`;
}

export interface LimitResult {
  allowed: boolean;
  used: number;
  limit: number;
}

export function checkLimit(plan: Plan, feature: Feature, used: number): LimitResult {
  const limit = LIMITS[feature][plan];
  return { allowed: used < limit, used, limit };
}

// ─── Muddat ──────────────────────────────────────────────────────────────────

export type PurchaseResult =
  | { ok: true; plan: PaidPlan; expiresAt: Date }
  | { ok: false; reason: 'downgrade' | 'invalid' };

export type PriceTable = Partial<Record<PaidPlan, number>>;

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * DAY_MS);
}

/**
 * Sotib olish natijasi (30 kun):
 *  - o'sha plan aktiv → qolgan muddat ustiga +30;
 *  - yuqoriroq plan → now+30 + eski qolgan KUNLAR narx nisbatida (floor). Narx yo'q bo'lsa 1:1.
 *    Nisbat >1 bo'lib ketsa (noto'g'ri sozlangan narx) qolgan kundan oshirilmaydi;
 *  - pastroq plan aktiv yuqori obuna paytida → rad (pul-kunni yo'qotib qo'ymaslik uchun).
 */
export function applyPurchase(
  sub: SubscriptionLike | null | undefined,
  plan: Plan,
  now: Date,
  prices: PriceTable = {},
): PurchaseResult {
  if (!isPaidPlan(plan)) return { ok: false, reason: 'invalid' };
  const current = effectivePlan(sub, now);
  if (current === 'FREE' || !sub) return { ok: true, plan, expiresAt: addDays(now, PERIOD_DAYS) };

  if (plan === current) return { ok: true, plan, expiresAt: addDays(sub.expiresAt, PERIOD_DAYS) };
  if (planRank(plan) < planRank(current)) return { ok: false, reason: 'downgrade' };

  const remainingDays = Math.floor((sub.expiresAt.getTime() - now.getTime()) / DAY_MS);
  const oldPrice = prices[current as PaidPlan];
  const newPrice = prices[plan];
  const carry = oldPrice && newPrice
    ? Math.min(remainingDays, Math.floor((remainingDays * oldPrice) / newPrice))
    : remainingDays;
  return { ok: true, plan, expiresAt: addDays(now, PERIOD_DAYS + carry) };
}

/** Admin sovg'asi: o'sha plan aktiv bo'lsa uzaytiradi, aks holda now+days dan yangi plan. */
export function applyGrant(sub: SubscriptionLike | null | undefined, plan: PaidPlan, days: number, now: Date): Date {
  const current = effectivePlan(sub, now);
  return current === plan && sub ? addDays(sub.expiresAt, days) : addDays(now, days);
}

// ─── Payload / invoice ───────────────────────────────────────────────────────

// groupId — bazadagi cuid (kichik harf+raqam). Qat'iy regex: boshqa bot/eski havola payload'i o'tmasin.
const GROUP_ID = '[a-z0-9]{8,32}';
const PAYLOAD_RE = new RegExp(`^sub:(${GROUP_ID}):(PLUS|PRO|MAX)$`);
const PAY_START_RE = new RegExp(`^pay_(${GROUP_ID})_(PLUS|PRO|MAX)$`);
const DECISION_RE = /^pay:(ok|no):([a-z0-9]{8,32})$/;
const STARS_CB_RE = /^tarif:stars:(PLUS|PRO|MAX)$/;

export function makePayload(groupId: string, plan: PaidPlan): string {
  return `sub:${groupId}:${plan}`;
}

export interface PlanTarget {
  groupId: string;
  plan: PaidPlan;
}

function toTarget(m: RegExpExecArray | null): PlanTarget | null {
  return m ? { groupId: m[1], plan: m[2] as PaidPlan } : null;
}

export function parsePayload(payload: string | null | undefined): PlanTarget | null {
  return toTarget(PAYLOAD_RE.exec(payload ?? ''));
}

/** Deep-link `start=pay_<groupId>_<plan>`. */
export function parsePayStart(payload: string | null | undefined): PlanTarget | null {
  return toTarget(PAY_START_RE.exec(payload ?? ''));
}

export function payStartParam(groupId: string, plan: PaidPlan): string {
  return `pay_${groupId}_${plan}`;
}

export function parseStarsCallback(data: string | null | undefined): PaidPlan | null {
  const m = STARS_CB_RE.exec(data ?? '');
  return m ? (m[1] as PaidPlan) : null;
}

export function decisionData(action: 'ok' | 'no', paymentId: string): string {
  return `pay:${action}:${paymentId}`;
}

export function parseDecision(data: string | null | undefined): { action: 'ok' | 'no'; paymentId: string } | null {
  const m = DECISION_RE.exec(data ?? '');
  return m ? { action: m[1] as 'ok' | 'no', paymentId: m[2] } : null;
}

/** Callback'ni istalgan odam yasab yuborishi mumkin — admin'likni har safar tekshiramiz. */
export function isAdminCallback(fromId: bigint | number | undefined | null, adminId: bigint | null): boolean {
  if (adminId === null || fromId === undefined || fromId === null) return false;
  return BigInt(fromId) === adminId;
}

export type InvoiceError = 'bad_invoice' | 'price_changed';

/** hr-bot check_invoice: valyuta XTR va summa JORIY narxga teng bo'lishi shart. */
export function checkInvoice(
  payload: string,
  currency: string,
  totalAmount: number,
  currentPrice: number | undefined,
): { target: PlanTarget | null; error: InvoiceError | null } {
  const target = parsePayload(payload);
  if (!target) return { target: null, error: 'bad_invoice' };
  if (currency !== STARS || !currentPrice || currentPrice <= 0 || totalAmount !== currentPrice) {
    return { target, error: 'price_changed' };
  }
  return { target, error: null };
}

// ─── Admin: /grant ───────────────────────────────────────────────────────────

export interface GrantArgs {
  groupTelegramId: bigint;
  plan: PaidPlan;
  days: number;
}

export const MAX_GRANT_DAYS = 3650;

export function parseGrantArgs(text: string): GrantArgs | null {
  const parts = text.trim().split(/\s+/);
  if (parts.length !== 4) return null;
  const [, id, plan, days] = parts;
  const planUp = plan.toUpperCase();
  if (!/^-?[0-9]{1,18}$/.test(id) || !isPaidPlan(planUp) || !/^[0-9]{1,4}$/.test(days)) return null;
  const n = Number(days);
  if (n < 1 || n > MAX_GRANT_DAYS) return null;
  return { groupTelegramId: BigInt(id), plan: planUp, days: n };
}

// ─── Sozlama (env) ───────────────────────────────────────────────────────────

export interface BillingConfig {
  enabled: boolean;
  /** So'm narxlari — faqat musbat butun son bo'lsa; aks holda plan sotilmaydi. */
  prices: PriceTable;
  starsPrices: PriceTable;
  starsEnabled: boolean;
  card: { number: string; holder: string } | null;
  /** Noto'g'ri qiymatli env nomlari — ishga tushishda log'ga yoziladi (jim yutilmaydi). */
  invalid: string[];
}

type Env = Record<string, string | undefined>;

/** Musbat butun son ('0', '-5', '1.5', '1e3', bo'sh → null). */
export function parsePrice(raw: string | undefined): number | null {
  const v = (raw ?? '').trim();
  if (!/^[1-9][0-9]{0,11}$/.test(v)) return null;
  return Number(v);
}

export function loadBillingConfig(env: Env): BillingConfig {
  const invalid: string[] = [];
  const read = (keys: Record<PaidPlan, string>): PriceTable => {
    const out: PriceTable = {};
    for (const plan of PAID_PLANS) {
      const raw = env[keys[plan]];
      if (!raw || !raw.trim()) continue; // bo'sh — plan sotilmaydi (xato emas)
      const n = parsePrice(raw);
      if (n === null) invalid.push(keys[plan]);
      else out[plan] = n;
    }
    return out;
  };
  const prices = read({ PLUS: 'TARIF_PLUS_NARX', PRO: 'TARIF_PRO_NARX', MAX: 'TARIF_MAX_NARX' });
  const starsPrices = read({ PLUS: 'TARIF_PLUS_STARS', PRO: 'TARIF_PRO_STARS', MAX: 'TARIF_MAX_STARS' });
  const number = (env.TOLOV_KARTA ?? '').trim();
  return {
    enabled: env.BILLING_ENABLED === '1',
    prices,
    starsPrices,
    starsEnabled: env.TOLOV_STARS === '1',
    card: number ? { number, holder: (env.TOLOV_KARTA_EGASI ?? '').trim() } : null,
    invalid,
  };
}

export function cardPrice(cfg: BillingConfig, plan: PaidPlan): number | null {
  return cfg.card ? (cfg.prices[plan] ?? null) : null;
}

export function starsPrice(cfg: BillingConfig, plan: PaidPlan): number | null {
  return cfg.starsEnabled ? (cfg.starsPrices[plan] ?? null) : null;
}

/** Hech bo'lmaganda bitta usulda sotiladigan paketlar. */
export function sellablePlans(cfg: BillingConfig): PaidPlan[] {
  return PAID_PLANS.filter((p) => cardPrice(cfg, p) !== null || starsPrice(cfg, p) !== null);
}

export function formatUzs(amount: number): string {
  return `${amount.toLocaleString('en-US').replace(/,/g, ' ')} so'm`;
}

export function limitReachedText(feature: Feature, r: LimitResult): string {
  return feature === 'voice'
    ? `🎙 Oylik ovozli limit tugadi (${Math.min(r.used, r.limit)}/${r.limit}). /tarif`
    : `💳 Hisoblar limiti tugadi (${Math.min(r.used, r.limit)}/${r.limit}). /tarif`;
}
