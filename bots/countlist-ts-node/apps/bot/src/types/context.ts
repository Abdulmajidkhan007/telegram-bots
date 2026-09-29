import { Context } from 'telegraf';
import { User, Group } from '@prisma/client';

export interface SessionData {
  step?: 'cat:add' | 'cat:edit';
  editingCategoryId?: string;
}

export interface BotContext extends Context {
  dbUser?: User;
  dbGroup?: Group;
  session: SessionData;
}
