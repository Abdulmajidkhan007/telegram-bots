import { Context } from 'telegraf';
import { User, Group } from '@prisma/client';

export interface SessionData {
  step?: 'cat:add' | 'cat:edit' | 'tx:newcat' | 'acc:add' | 'acc:xfer';
  editingCategoryId?: string;
  /** tx:newcat — qaysi yozuvga yangi kategoriya qo'yiladi va qaysi xabar yangilanadi. */
  editingExpenseId?: string;
  entryMessageId?: number;
  /** acc:xfer — transfer qadamlari: qayerdan / qayerga (hisob ID'lari). */
  transferFromId?: string;
  transferToId?: string;
}

export interface BotContext extends Context {
  dbUser?: User;
  dbGroup?: Group;
  session: SessionData;
}
