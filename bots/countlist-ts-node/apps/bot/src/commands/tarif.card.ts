import { Telegraf, Markup, Telegram } from 'telegraf';
import { BotContext } from '../types/context';
import { BillingService } from '../services/billing.service';
import {
  PLAN_NAMES, PaidPlan, PlanTarget, applyPurchase, cardPrice, decisionData, formatUzs,
  isAdminCallback, parseDecision, parsePayStart,
} from '../services/billing.logic';
import { logger } from '../utils/logger';

const RECEIPT_MAX_BYTES = 10 * 1024 * 1024;
const RECEIPT_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const REASON_MAX = 200;

export async function notifyAdmin(telegram: Telegram, adminId: bigint | null, text: string): Promise<void> {
  if (!adminId) {
    logger.error(`ADMIN_TELEGRAM_ID yo'q, xabar yetkazilmadi: ${text}`);
    return;
  }
  await telegram.sendMessage(Number(adminId), text).catch(
    (e) => logger.error(`Adminga xabar ketmadi: ${e?.message ?? e}`));
}

interface Receipt {
  fileId: string;
  uniqueId: string;
  kind: 'photo' | 'document';
}

/** Rasm — eng katta o'lcham; hujjat — faqat PDF/rasm, ≤ 10 MB. */
function pickReceipt(msg: unknown): Receipt | null {
  const m = msg as {
    photo?: { file_id: string; file_unique_id: string }[];
    document?: { file_id: string; file_unique_id: string; mime_type?: string; file_size?: number };
  };
  if (m.photo?.length) {
    const p = m.photo[m.photo.length - 1];
    return { fileId: p.file_id, uniqueId: p.file_unique_id, kind: 'photo' };
  }
  const d = m.document;
  if (d && d.mime_type && RECEIPT_MIME.has(d.mime_type) && (d.file_size ?? 0) <= RECEIPT_MAX_BYTES) {
    return { fileId: d.file_id, uniqueId: d.file_unique_id, kind: 'document' };
  }
  return null;
}

/** Karta to'lovi boshlanishi va chek qabuli uchun umumiy tekshiruv. */
async function precheck(billing: BillingService, userId: string, adminId: bigint | null, t: PlanTarget) {
  const price = cardPrice(billing.cfg, t.plan);
  if (!billing.enabled || price === null) return { error: "Bu paket karta orqali sotilmayapti." } as const;
  if (!adminId) return { error: "Karta to'lovi hozir qabul qilinmaydi (admin sozlanmagan)." } as const;
  const group = await billing.groupById(t.groupId);
  if (!group) return { error: 'Guruh topilmadi.' } as const;
  if (!(await billing.isMember(userId, group.id))) {
    return { error: "Siz bu guruh a'zosi emassiz (guruhda botga biror xabar yozib ko'ring)." } as const;
  }
  if (await billing.pendingOf(userId)) {
    return { error: "Oldingi chekingiz hali tekshirilmoqda. Natijani kuting." } as const;
  }
  const res = applyPurchase(await billing.subscription(group.id), t.plan, new Date(), billing.cfg.prices);
  if (!res.ok) return { error: "Guruhda yuqoriroq paket faol — pastroqni sotib olib bo'lmaydi." } as const;
  return { price, group } as const;
}

/** start=pay_<groupId>_<plan> — shaxsiy chatda karta ma'lumotini beradi. true: payload shu oqimga tegishli edi. */
export async function handlePayStart(
  ctx: BotContext, billing: BillingService, adminId: bigint | null, startPayload: string,
): Promise<boolean> {
  if (!startPayload.startsWith('pay_')) return false;
  const target = parsePayStart(startPayload);
  if (!target || !ctx.dbUser || ctx.chat?.type !== 'private') {
    await ctx.reply("❌ To'lov havolasi noto'g'ri. Guruhda /tarif ni qayta oching.");
    return true;
  }
  if (!billing.enabled) {
    await ctx.reply('ℹ️ Pullik paketlar hali yoqilmagan.');
    return true;
  }
  try {
    const pre = await precheck(billing, ctx.dbUser.id, adminId, target);
    if ('error' in pre) {
      await ctx.reply(`❌ ${pre.error}`);
      return true;
    }
    ctx.session = { step: 'pay:receipt', payGroupId: target.groupId, payPlan: target.plan };
    const card = billing.cfg.card!;
    await ctx.reply(
      `💳 ${PLAN_NAMES[target.plan]} — «${pre.group.title}» guruhi, 30 kun\n\n` +
      `Summa: ${formatUzs(pre.price)}\n` +
      `Karta: ${card.number}\n` +
      (card.holder ? `Egasi: ${card.holder}\n` : '') +
      `Izoh: ${pre.group.telegramId}\n\n` +
      `O'tkazgach, chek skrinshotini (rasm yoki PDF) shu yerga yuboring. ` +
      `Admin pul tushganini tekshirib tasdiqlaydi (odatda 1–12 soat).\n/cancel — bekor qilish`,
    );
  } catch (err) {
    logger.error('Karta to\'lovi boshlanmadi:', err);
    await ctx.reply("❌ Xatolik yuz berdi. Birozdan keyin qayta urinib ko'ring.");
  }
  return true;
}

export function registerCardPayment(bot: Telegraf<BotContext>, billing: BillingService, adminId: bigint | null): void {
  // Chek: rasm/hujjat. Boshqa holatda handler zanjirini buzmaymiz.
  bot.on(['photo', 'document'], async (ctx, next) => {
    const { step, payGroupId, payPlan } = ctx.session;
    if (step !== 'pay:receipt' || !payGroupId || !payPlan || !ctx.dbUser || ctx.chat.type !== 'private') return next();

    const receipt = pickReceipt(ctx.message);
    if (!receipt) {
      return ctx.reply("❌ Chek rasm (skrinshot) yoki PDF bo'lsin (10 MB gacha). /cancel — bekor qilish");
    }
    ctx.session = {};
    try {
      const pre = await precheck(billing, ctx.dbUser.id, adminId, { groupId: payGroupId, plan: payPlan });
      if ('error' in pre) return await ctx.reply(`❌ ${pre.error}`);

      const seen = await billing.seenReceipt(receipt.uniqueId);
      const payment = await billing.createPendingCard({
        groupId: pre.group.id, userId: ctx.dbUser.id, plan: payPlan, amount: pre.price,
        receiptFileId: receipt.fileId, receiptUniqueId: receipt.uniqueId,
      });
      await ctx.reply("✅ Chek qabul qilindi, tekshirilmoqda (odatda 1–12 soat). Natijani shu yerda yozaman.");

      const u = ctx.dbUser;
      const caption =
        `💳 Yangi chek #${payment.id}\n` +
        `Guruh: ${pre.group.title} (${pre.group.telegramId})\n` +
        `Foydalanuvchi: ${u.firstName}${u.username ? ` @${u.username}` : ''} (${u.telegramId})\n` +
        `Paket: ${PLAN_NAMES[payPlan]} — ${formatUzs(pre.price)}\n` +
        (seen ? `\n⚠️ Bu chek (rasm) oldin ham yuborilgan: to'lov #${seen.id} (${seen.status}). Ehtiyot bo'ling!\n` : '') +
        `\nPul bank ilovasida kelganini tekshirib bosing.`;
      const kb = Markup.inlineKeyboard([[
        Markup.button.callback('✅ Tasdiqlash', decisionData('ok', payment.id)),
        Markup.button.callback('❌ Rad etish', decisionData('no', payment.id)),
      ]]);
      const to = Number(adminId);
      try {
        if (receipt.kind === 'photo') await ctx.telegram.sendPhoto(to, receipt.fileId, { caption, ...kb });
        else await ctx.telegram.sendDocument(to, receipt.fileId, { caption, ...kb });
      } catch (err) {
        logger.error(`Adminga chek ketmadi (to'lov ${payment.id}):`, err);
        await ctx.reply("⚠️ Chek saqlandi, lekin adminga yetkazib bo'lmadi. Admin bilan bog'laning.");
      }
    } catch (err) {
      logger.error('Chekni qabul qilishda xato:', err);
      await ctx.reply("❌ Chekni saqlab bo'lmadi. Birozdan keyin qayta yuboring.");
    }
  });

  // Callback'ni istalgan odam yasab yuborishi mumkin — admin'likni har safar tekshiramiz.
  bot.action(/^pay:(ok|no):[a-z0-9]{8,32}$/, async (ctx) => {
    if (!isAdminCallback(ctx.from?.id, adminId)) return ctx.answerCbQuery('Ruxsat yo\'q.', { show_alert: true });
    const decision = parseDecision(ctx.match[0]);
    if (!decision) return ctx.answerCbQuery('Noto\'g\'ri tugma.');
    try {
      if (decision.action === 'no') {
        ctx.session = { step: 'pay:reject', payRejectId: decision.paymentId };
        await ctx.answerCbQuery();
        await ctx.reply("❌ Rad etish sababini yozing (foydalanuvchiga yuboriladi). /cancel — bekor qilish");
        return;
      }
      const res = await billing.approveCard(decision.paymentId, adminId!);
      if (res.kind === 'missing') return await ctx.answerCbQuery('To\'lov topilmadi.', { show_alert: true });
      if (res.kind === 'decided') return await ctx.answerCbQuery(`Allaqachon hal qilingan: ${res.payment.status}`, { show_alert: true });
      if (res.kind === 'rejected') {
        return await ctx.answerCbQuery("Guruhda yuqoriroq paket faol — tasdiqlab bo'lmaydi. ❌ bilan rad eting yoki /grant.", { show_alert: true });
      }
      await ctx.answerCbQuery('✅ Tasdiqlandi');
      await ctx.editMessageReplyMarkup(undefined).catch((e) => logger.warn(`Tugmalarni olib bo'lmadi: ${e?.message ?? e}`));
      await ctx.reply(`✅ #${res.payment.id}: ${PLAN_NAMES[res.plan]} — ${res.payment.group.title}, ${res.expiresAt.toISOString().slice(0, 10)} gacha.`);
      const text = `✅ To'lov tasdiqlandi: ${PLAN_NAMES[res.plan]} paketi ${res.expiresAt.toISOString().slice(0, 10)} gacha yoqildi.`;
      await ctx.telegram.sendMessage(Number(res.payment.user.telegramId), text).catch(
        (e) => logger.warn(`Foydalanuvchiga (${res.payment.userId}) xabar ketmadi: ${e?.message ?? e}`));
      await ctx.telegram.sendMessage(Number(res.payment.group.telegramId), `${text}\n/tarif`).catch(
        (e) => logger.warn(`Guruhga (${res.payment.groupId}) xabar ketmadi: ${e?.message ?? e}`));
    } catch (err) {
      logger.error('Chekni tasdiqlashda xato:', err);
      await ctx.answerCbQuery('❌ Xatolik, loglarni ko\'ring.', { show_alert: true });
    }
  });

  // Admin rad etish sababini yozadi (shaxsiy chatda).
  bot.on('text', async (ctx, next) => {
    const text = ctx.message.text.trim();
    const id = ctx.session.payRejectId;
    if (ctx.session.step !== 'pay:reject' || !id || text.startsWith('/')) return next();
    if (!isAdminCallback(ctx.from?.id, adminId)) return next();
    ctx.session = {};
    try {
      const res = await billing.rejectCard(id, adminId!);
      if (!res) return await ctx.reply("To'lov topilmadi.");
      if (!res.changed) return await ctx.reply(`Allaqachon hal qilingan: ${res.payment.status}`);
      await ctx.reply(`❌ #${id} rad etildi.`);
      await ctx.telegram.sendMessage(
        Number(res.payment.user.telegramId),
        `❌ To'lovingiz (${PLAN_NAMES[res.payment.plan as PaidPlan]}) rad etildi.\nSabab: ${text.slice(0, REASON_MAX)}`,
      ).catch((e) => logger.warn(`Foydalanuvchiga (${res.payment.userId}) xabar ketmadi: ${e?.message ?? e}`));
    } catch (err) {
      logger.error('Chekni rad etishda xato:', err);
      await ctx.reply('❌ Xatolik, loglarni ko\'ring.');
    }
  });
}
