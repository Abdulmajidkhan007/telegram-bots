import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../types/context';
import { BillingService } from '../services/billing.service';
import { AccountService } from '../services/account.service';
import {
  LIMITS, PLAN_NAMES, PERIOD_DAYS, SUBSCRIPTION_SECONDS, STARS,
  cardPrice, checkInvoice, effectivePlan, formatUzs, makePayload, parsePayload, parseStarsCallback,
  payStartParam, sellablePlans, starsPrice,
} from '../services/billing.logic';
import { logger } from '../utils/logger';
import { registerCardPayment, notifyAdmin } from './tarif.card';

const NOT_ENABLED = 'ℹ️ Pullik paketlar hali yoqilmagan.';

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { timeZone: 'Asia/Tashkent' });
}

/** /tarif matni: joriy plan, muddat, shu oy ishlatilgan/limit, paketlar narxi bilan. */
export async function tarifText(billing: BillingService, accounts: AccountService, groupId: string): Promise<string> {
  const now = new Date();
  const sub = await billing.subscription(groupId);
  const plan = effectivePlan(sub, now);
  const [voiceUsed, accountCount] = await Promise.all([
    billing.used(groupId, 'voice', now),
    accounts.visible(groupId).then((a) => a.length),
  ]);
  const lines = [`📦 Joriy paket: ${PLAN_NAMES[plan]}`];
  if (plan !== 'FREE' && sub) lines.push(`⏳ Amal qilish muddati: ${fmtDate(sub.expiresAt)} gacha`);
  lines.push(
    '',
    `Shu oy (guruh bo'yicha):`,
    `🎙 Ovozli xabar: ${voiceUsed}/${LIMITS.voice[plan]}`,
    `💳 Hisoblar: ${accountCount}/${LIMITS.accounts[plan]}`,
    `✍️ Matnli yozuv va transfer — cheksiz`,
  );

  const sellable = sellablePlans(billing.cfg);
  if (sellable.length === 0) {
    lines.push('', "Pullik paketlar hozircha sotilmayapti.");
  } else {
    lines.push('', `Paketlar (${PERIOD_DAYS} kun):`);
    for (const p of sellable) {
      const prices = [
        cardPrice(billing.cfg, p) !== null ? formatUzs(cardPrice(billing.cfg, p)!) : null,
        starsPrice(billing.cfg, p) !== null ? `${starsPrice(billing.cfg, p)} ⭐` : null,
      ].filter(Boolean).join(' · ');
      lines.push(`• ${PLAN_NAMES[p]}: 🎙 ${LIMITS.voice[p]}, 💳 ${LIMITS.accounts[p]} hisob — ${prices}`);
    }
  }
  return lines.join('\n');
}

export function registerTarifCommand(
  bot: Telegraf<BotContext>,
  billing: BillingService,
  accounts: AccountService,
  adminId: bigint | null,
): void {
  bot.command('tarif', async (ctx) => {
    if (!billing.enabled) return ctx.reply(NOT_ENABLED);
    if (!ctx.dbGroup) return ctx.reply('Bu komanda faqat guruhda ishlaydi. Botni guruhda /tarif deb ishlating.');
    try {
      const text = await tarifText(billing, accounts, ctx.dbGroup.id);
      const username = ctx.botInfo?.username;
      const rows = sellablePlans(billing.cfg).map((p) => {
        const row = [];
        if (starsPrice(billing.cfg, p) !== null) {
          row.push(Markup.button.callback(`⭐ ${PLAN_NAMES[p]}`, `tarif:stars:${p}`));
        }
        if (cardPrice(billing.cfg, p) !== null && username) {
          row.push(Markup.button.url(`💳 ${PLAN_NAMES[p]}`, `https://t.me/${username}?start=${payStartParam(ctx.dbGroup!.id, p)}`));
        }
        return row;
      }).filter((r) => r.length > 0);
      await ctx.reply(text, rows.length ? Markup.inlineKeyboard(rows) : undefined);
    } catch (err) {
      logger.error('/tarif xatosi:', err);
      await ctx.reply("❌ Tarif ma'lumotini olib bo'lmadi. Birozdan keyin urinib ko'ring.");
    }
  });

  // ─── ⭐ Stars ──────────────────────────────────────────────────────────────

  bot.action(/^tarif:stars:(PLUS|PRO|MAX)$/, async (ctx) => {
    const plan = parseStarsCallback(ctx.match[0]);
    const price = plan ? starsPrice(billing.cfg, plan) : null;
    if (!billing.enabled || !plan || price === null || !ctx.dbGroup) {
      return ctx.answerCbQuery('Bu usul hozir mavjud emas.', { show_alert: true });
    }
    try {
      // Telegraf 4.16 typings'da subscription_period yo'q — callApi (Bot API maydoni bor, 30 kun).
      const payload = {
        title: `Countlist ${PLAN_NAMES[plan]} — ${PERIOD_DAYS} kun`,
        description: `«${ctx.dbGroup.title}» guruhi uchun ${PLAN_NAMES[plan]} paketi (${PERIOD_DAYS} kunlik obuna).`.slice(0, 255),
        payload: makePayload(ctx.dbGroup.id, plan),
        provider_token: '',
        currency: STARS,
        prices: [{ label: `${PLAN_NAMES[plan]}`, amount: price }], // Stars uchun aynan bitta element
        subscription_period: SUBSCRIPTION_SECONDS,
      };
      const link = await ctx.telegram.callApi('createInvoiceLink', payload);
      await ctx.answerCbQuery();
      await ctx.reply(`⭐ ${PLAN_NAMES[plan]} — ${price} Stars / ${PERIOD_DAYS} kun`,
        Markup.inlineKeyboard([[Markup.button.url('⭐ To\'lash', link)]]));
    } catch (err) {
      logger.error(`createInvoiceLink yiqildi (guruh ${ctx.dbGroup.id}):`, err);
      await ctx.answerCbQuery("❌ To'lov havolasini yaratib bo'lmadi.", { show_alert: true });
    }
  });

  bot.on('pre_checkout_query', async (ctx) => {
    // Telegram 10 soniya kutadi — har holatda javob beramiz (xatoda ham).
    const q = ctx.preCheckoutQuery;
    try {
      const target = parsePayload(q.invoice_payload);
      const { error } = checkInvoice(q.invoice_payload, q.currency, q.total_amount,
        target && billing.enabled ? starsPrice(billing.cfg, target.plan) ?? undefined : undefined);
      if (error || !target) {
        return await ctx.answerPreCheckoutQuery(false, error === 'price_changed'
          ? "Narx o'zgargan. /tarif orqali yangi havola oling." : "Noto'g'ri to'lov havolasi.");
      }
      const can = await billing.canPurchase(target.groupId, target.plan);
      if (can !== 'ok') {
        return await ctx.answerPreCheckoutQuery(false, can === 'downgrade'
          ? 'Guruhda yuqoriroq paket faol — pastroqni sotib olib bo\'lmaydi.' : 'Guruh topilmadi.');
      }
      await ctx.answerPreCheckoutQuery(true);
    } catch (err) {
      logger.error('pre_checkout xatosi:', err);
      await ctx.answerPreCheckoutQuery(false, 'Vaqtinchalik xato. Birozdan keyin urinib ko\'ring.').catch(
        (e) => logger.error(`pre_checkout javobi ketmadi: ${e?.message ?? e}`));
    }
  });

  bot.on('successful_payment', async (ctx) => {
    const sp = ctx.message.successful_payment;
    const target = parsePayload(sp.invoice_payload);
    if (!target || sp.currency !== STARS || !ctx.dbUser) {
      // Pul tushgan, lekin bizning havolamiz emas — yo'qotmaslik uchun adminga aytamiz.
      logger.error(`Noma'lum to'lov: user ${ctx.from?.id}, charge ${sp.telegram_payment_charge_id}`);
      await notifyAdmin(ctx.telegram, adminId, `⚠️ Noma'lum to'lov: user ${ctx.from?.id}, ${sp.total_amount} ${sp.currency}, charge ${sp.telegram_payment_charge_id}`);
      return;
    }
    try {
      const res = await billing.recordStars({
        groupId: target.groupId, userId: ctx.dbUser.id, plan: target.plan,
        amount: sp.total_amount, chargeId: sp.telegram_payment_charge_id,
      });
      if (res.kind === 'duplicate') {
        logger.info(`Takroriy successful_payment e'tiborsiz: ${sp.telegram_payment_charge_id}`);
        return;
      }
      if (res.kind === 'unapplied') {
        logger.error(`Stars to'lov qo'llanmadi (to'lov ${res.payment.id}): guruh ${target.groupId}`);
        await ctx.reply("⚠️ To'lov qabul qilindi, lekin paketni yoqib bo'lmadi. Admin ko'rib chiqadi.");
        await notifyAdmin(ctx.telegram, adminId, `⚠️ Stars to'lov qo'llanmadi (yuqoriroq obuna faol): to'lov ${res.payment.id}, charge ${sp.telegram_payment_charge_id}, ${sp.total_amount} ⭐. Qaytarish kerak.`);
        return;
      }
      const group = await billing.groupById(target.groupId);
      const text = `✅ ${PLAN_NAMES[res.plan]} paketi yoqildi — ${fmtDate(res.expiresAt)} gacha.`;
      await ctx.reply(text);
      if (group) {
        await ctx.telegram.sendMessage(Number(group.telegramId), `${text}\nRahmat! /tarif`).catch(
          (e) => logger.warn(`Guruhga (${group.id}) to'lov xabari ketmadi: ${e?.message ?? e}`));
      }
    } catch (err) {
      logger.error(`successful_payment xatosi (charge ${sp.telegram_payment_charge_id}):`, err);
      await notifyAdmin(ctx.telegram, adminId, `⚠️ successful_payment saqlanmadi: charge ${sp.telegram_payment_charge_id}, user ${ctx.from?.id}, ${sp.total_amount} ⭐. Qo'lda /grant kerak.`);
      await ctx.reply("⚠️ To'lov qabul qilindi, lekin saqlashda xato bo'ldi. Admin sizga yordam beradi.").catch(
        (e) => logger.error(`Xato xabari ketmadi: ${e?.message ?? e}`));
    }
  });

  registerCardPayment(bot, billing, adminId);
}
