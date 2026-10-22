import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../types/context';
import { AccountService } from '../services/account.service';
import { logger } from '../utils/logger';
import {
  ACC_ACTION_RE,
  ACC_ADD,
  ACC_HIDE_ZERO,
  ACC_LIST,
  ACC_LIST_ALL,
  ACC_TRANSFER,
  ACC_TRANSFER_CANCEL,
  ACC_TRANSFER_PICK_RE,
  TransferSide,
  applyTransferPick,
  formatTransferDone,
  parseTransferAmount,
  transferPickData,
  transferStage,
  AccountAction,
  accountActionData,
  formatAccountList,
  parseAccountInput,
  sortAccounts,
} from '../utils/accounts';

const ADD_HINT =
  "💳 Yangi hisob nomini va (ixtiyoriy) hozirgi qoldig'ini yozing:\n\n" +
  '  Humo 1,5 mln\n' +
  '  💵 Naqd 200 ming\n' +
  '  Uzcard\n\n' +
  'Bekor qilish: /cancel';

const TRANSFER_ERRORS = {
  SAME_ACCOUNT: "❌ Hisoblar bir xil bo'lmasin.",
  BAD_AMOUNT: "❌ Summa noldan katta bo'lsin.",
  CURRENCY_MISMATCH: "❌ Hisoblar valyutasi har xil — o'tkazib bo'lmaydi.",
  NOT_MEMBER: "❌ Transfer faqat guruh a'zosi uchun.",
  NOT_FOUND: '❌ Hisob topilmadi (yopilgan yoki o\'chirilgan bo\'lishi mumkin).',
} as const;

const cancelRow = () => [Markup.button.callback('❌ Bekor qilish', ACC_TRANSFER_CANCEL)];

/** Qadamga mos so'rov: hisoblar tugmalari (qayerdan / qayerga) yoki summa so'rovi. */
async function promptTransfer(ctx: BotContext, accounts: AccountService, edit: boolean) {
  if (!ctx.dbGroup) return;
  const draft = { fromId: ctx.session.transferFromId, toId: ctx.session.transferToId };
  const stage = transferStage(draft);
  const visible = await accounts.visible(ctx.dbGroup.id);
  const from = visible.find((a) => a.id === draft.fromId);
  const to = visible.find((a) => a.id === draft.toId);

  let text: string;
  let rows: ReturnType<typeof cancelRow>[] = [];
  if (stage === 'amount' && from && to) {
    text = `🔄 ${from.icon} ${from.name} → ${to.icon} ${to.name}\n\nSummani yozing (masalan: 500 000 yoki 1,5 mln).`;
    rows = [cancelRow()];
  } else {
    // Hisob o'chib/yopilib qolgan bo'lsa ham qadam qayta boshdan — jim qolmaymiz.
    const side: TransferSide = stage === 'to' && from ? 'to' : 'from';
    if (side === 'from') ctx.session = { step: 'acc:xfer' };
    const choices = visible.filter((a) => a.id !== ctx.session.transferFromId && (side === 'from' || a.currency === from?.currency));
    if (choices.length === 0) {
      ctx.session = {};
      await ctx.reply("🔄 Transfer uchun kamida 2 ta ochiq hisob (bir xil valyutada) kerak.");
      return;
    }
    text = side === 'from' ? '🔄 Qaysi hisobdan o\'tkazamiz?' : `🔄 ${from?.icon} ${from?.name} → qaysi hisobga?`;
    rows = [...choices.map((a) => [Markup.button.callback(`${a.icon} ${a.name}`, transferPickData(side, a.id))]), cancelRow()];
  }
  const kb = Markup.inlineKeyboard(rows);
  if (edit) {
    await ctx.editMessageText(text, kb).catch((err) => {
      if (!String(err?.message).includes('not modified')) logger.warn(`Transfer xabari yangilanmadi: ${err?.message ?? err}`);
    });
  } else {
    await ctx.reply(text, kb);
  }
}

async function sendAccounts(ctx: BotContext, accounts: AccountService, showHidden: boolean, edit: boolean) {
  if (!ctx.dbGroup) return;
  const { accounts: list, balances } = await accounts.listWithBalances(ctx.dbGroup.id);
  const text = formatAccountList(list, balances, showHidden);

  const visible = sortAccounts(list.filter((a) => !a.isHidden));
  const hidden = sortAccounts(list.filter((a) => a.isHidden));
  const btn = (label: string, action: AccountAction, id: string) =>
    Markup.button.callback(label, accountActionData(action, id));

  const rows = visible.map((a, i) => {
    const row = [Markup.button.callback(`${a.icon} ${a.name}`, ACC_LIST)];
    if (i > 0) row.push(btn('⭐', 'top', a.id), btn('⬆️', 'up', a.id));
    row.push(btn('🔒', 'hide', a.id));
    return row;
  });
  if (showHidden) {
    for (const a of hidden) rows.push([btn(`👁 Ochish: ${a.icon} ${a.name}`, 'show', a.id)]);
  }
  const footer = [Markup.button.callback("➕ Hisob qo'shish", ACC_ADD)];
  if (visible.length >= 2) footer.push(Markup.button.callback('🔄 Transfer', ACC_TRANSFER));
  if (visible.some((a) => balances.get(a.id) === 0)) {
    footer.push(Markup.button.callback('🔒 Nol hisoblarni yopish', ACC_HIDE_ZERO));
  }
  rows.push(footer);
  if (hidden.length > 0) {
    rows.push([showHidden
      ? Markup.button.callback('🙈 Yopilganlarni yashirish', ACC_LIST)
      : Markup.button.callback(`👁 Yopilganlar (${hidden.length})`, ACC_LIST_ALL)]);
  }

  const kb = Markup.inlineKeyboard(rows);
  if (edit) {
    await ctx.editMessageText(text, kb).catch((err) => {
      if (!String(err?.message).includes('not modified')) logger.warn(`Hisoblar ro'yxati yangilanmadi: ${err?.message ?? err}`);
    });
  } else {
    await ctx.reply(text, kb);
  }
}

export function registerAccountCommands(bot: Telegraf<BotContext>, accounts: AccountService): void {
  const groupOnly = (ctx: BotContext) => ctx.reply('💳 Hisoblar guruhda ishlaydi — botni guruhga qo\'shing.');

  const show = async (ctx: BotContext) => {
    if (!ctx.dbGroup) return groupOnly(ctx);
    await sendAccounts(ctx, accounts, false, false);
  };
  bot.command('hisoblar', show);
  bot.command('accounts', show);

  const startTransfer = async (ctx: BotContext) => {
    if (!ctx.dbGroup) return groupOnly(ctx);
    ctx.session = { step: 'acc:xfer' };
    await promptTransfer(ctx, accounts, false);
  };
  bot.command('transfer', startTransfer);
  bot.action(ACC_TRANSFER, async (ctx) => {
    await ctx.answerCbQuery();
    await startTransfer(ctx);
  });

  bot.action(ACC_TRANSFER_CANCEL, async (ctx) => {
    if (ctx.session.step === 'acc:xfer') ctx.session = {};
    await ctx.answerCbQuery('❌ Bekor qilindi');
    await ctx.editMessageText('❌ Transfer bekor qilindi.').catch((err) => {
      logger.warn(`Transfer bekori xabari yangilanmadi: ${err?.message ?? err}`);
    });
  });

  bot.action(ACC_TRANSFER_PICK_RE, async (ctx) => {
    if (!ctx.dbGroup || ctx.session.step !== 'acc:xfer') {
      return ctx.answerCbQuery('Transfer tugagan — /transfer ni qayta bosing.', { show_alert: true });
    }
    const side = ctx.match[1] as TransferSide;
    const id = ctx.match[2];
    try {
      // Hisob shu guruhniki ekani DB'da tekshiriladi (callback soxtalashtirilishi mumkin).
      if (!(await accounts.belongsToGroup(ctx.dbGroup.id, id))) {
        return ctx.answerCbQuery('Bu hisob topilmadi.', { show_alert: true });
      }
      const next = applyTransferPick({ fromId: ctx.session.transferFromId, toId: ctx.session.transferToId }, side, id);
      if (!next) return ctx.answerCbQuery("Bu qadam o'tib ketgan.", { show_alert: true });
      ctx.session = { step: 'acc:xfer', transferFromId: next.fromId, transferToId: next.toId };
      await ctx.answerCbQuery();
      await promptTransfer(ctx, accounts, true);
    } catch (err) {
      logger.error('Transfer qadamida xato:', err);
      await ctx.answerCbQuery('❌ Xatolik, qayta urinib ko\'ring.', { show_alert: true });
    }
  });

  // Har qanday kutilayotgan qadamni (yangi hisob, yangi kategoriya) bekor qiladi.
  bot.command('cancel', async (ctx) => {
    const had = !!ctx.session.step;
    ctx.session = {};
    await ctx.reply(had ? '❌ Bekor qilindi.' : 'Bekor qiladigan narsa yo\'q.');
  });

  bot.action([ACC_LIST, ACC_LIST_ALL], async (ctx) => {
    if (!ctx.dbGroup) return ctx.answerCbQuery();
    await ctx.answerCbQuery();
    await sendAccounts(ctx, accounts, ctx.match[0] === ACC_LIST_ALL, true);
  });

  bot.action(ACC_ADD, async (ctx) => {
    if (!ctx.dbGroup) return ctx.answerCbQuery();
    await ctx.answerCbQuery();
    ctx.session = { step: 'acc:add' };
    await ctx.reply(ADD_HINT);
  });

  bot.action(ACC_HIDE_ZERO, async (ctx) => {
    if (!ctx.dbGroup) return ctx.answerCbQuery();
    try {
      const n = await accounts.hideZero(ctx.dbGroup.id);
      await ctx.answerCbQuery(n ? `🔒 ${n} ta hisob yopildi (o'chirilmadi)` : "Qoldig'i 0 bo'lgan ochiq hisob yo'q");
      await sendAccounts(ctx, accounts, false, true);
    } catch (err) {
      logger.error('Nol hisoblarni yopishda xato:', err);
      await ctx.answerCbQuery('❌ Hisoblarni yopishda xato.', { show_alert: true });
    }
  });

  bot.action(ACC_ACTION_RE, async (ctx) => {
    if (!ctx.dbGroup) return ctx.answerCbQuery();
    const action = ctx.match[1] as AccountAction;
    const id = ctx.match[2];
    try {
      const ok = action === 'hide' || action === 'show'
        ? await accounts.setHidden(ctx.dbGroup.id, id, action === 'hide')
        : await accounts.move(ctx.dbGroup.id, id, action);
      if (!ok) return ctx.answerCbQuery('Bu hisob topilmadi.', { show_alert: true });
      const msg = { hide: "🔒 Yopildi — tarix saqlanadi, istalgan payt qayta ochasiz", show: '👁 Qayta ochildi',
        up: '⬆️ Ko\'tarildi', top: '⭐ Asosiy hisob' }[action];
      await ctx.answerCbQuery(msg);
      await sendAccounts(ctx, accounts, action === 'show', true);
    } catch (err) {
      logger.error(`Hisob amali (${action}) xatosi:`, err);
      await ctx.answerCbQuery('❌ Amalni bajarishda xato.', { show_alert: true });
    }
  });
}

/** acc:add qadamida kelgan matn. true — matn shu yerda ishlandi. */
export async function handleAccountText(ctx: BotContext, accounts: AccountService, text: string): Promise<boolean> {
  if (ctx.session.step === 'acc:xfer' && ctx.dbGroup && ctx.dbUser) {
    return handleTransferAmount(ctx, accounts, text);
  }
  if (ctx.session.step !== 'acc:add' || !ctx.dbGroup) return false;
  const parsed = parseAccountInput(text);
  if (!parsed) {
    await ctx.reply("❌ Hisob nomi 1–32 belgi bo'lsin.\n\n" + ADD_HINT);
    return true;
  }
  ctx.session = {};
  try {
    await accounts.create(ctx.dbGroup.id, parsed);
    await ctx.reply(`✅ «${parsed.icon} ${parsed.name}» hisobi qo'shildi.`);
    await sendAccounts(ctx, accounts, false, false);
  } catch (err) {
    logger.error('Hisob qo\'shishda xato:', err);
    await ctx.reply(`❌ Hisob qo'shilmadi: ${err instanceof Error ? err.message : String(err)}`);
  }
  return true;
}

/** acc:xfer qadamida summa kutilmoqda. Hisoblar tanlanmagan bo'lsa — matn shu oqimga tegishli emas. */
async function handleTransferAmount(ctx: BotContext, accounts: AccountService, text: string): Promise<boolean> {
  const { transferFromId: fromId, transferToId: toId } = ctx.session;
  if (!ctx.dbGroup || !ctx.dbUser || !fromId || !toId) return false;
  const amount = parseTransferAmount(text);
  if (amount === null) {
    await ctx.reply("❌ Summani raqam bilan yozing (masalan: 500 000).", Markup.inlineKeyboard([cancelRow()]));
    return true;
  }
  try {
    const res = await accounts.createTransfer({
      groupId: ctx.dbGroup.id, userId: ctx.dbUser.id, fromAccountId: fromId, toAccountId: toId, amount,
    });
    // 'in' bilan: tsconfig'da strict yo'q, ok-diskriminant toraytirmaydi.
    if ('error' in res) {
      ctx.session = {};
      await ctx.reply(TRANSFER_ERRORS[res.error]);
      return true;
    }
    ctx.session = {};
    await ctx.reply(formatTransferDone(res.from, res.to, amount));
    await sendAccounts(ctx, accounts, false, false);
  } catch (err) {
    logger.error('Transfer yaratishda xato:', err);
    await ctx.reply(`❌ Transfer bajarilmadi: ${err instanceof Error ? err.message : String(err)}`);
  }
  return true;
}
