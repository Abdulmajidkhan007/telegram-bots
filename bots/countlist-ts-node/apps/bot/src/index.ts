import { Telegraf, session } from 'telegraf';
import { PrismaClient } from '@prisma/client';
import { config } from './config';
import { logger } from './utils/logger';
import { BotContext, SessionData } from './types/context';
import { groupMiddleware } from './middlewares/group.middleware';
import { UserService } from './services/user.service';
import { ExpenseService } from './services/expense.service';
import { ExportService } from './services/export.service';
import { registerStartCommand } from './commands/start.command';
import { registerHelpCommand } from './commands/help.command';
import { registerStatsCommands } from './commands/stats.command';
import { registerExportCommand } from './commands/export.command';
import { registerLoginCommand } from './commands/login.command';
import { registerCategoryCommands } from './commands/categories.command';
import { registerAdminCommands } from './commands/admin.command';
import { registerCallbackHandlers } from './handlers/callback.handler';
import { registerMessageHandlers } from './handlers/message.handler';
import { applyBotProfile } from './profile';
import { registerReminderCommand } from './commands/reminder.command';
import { ReminderService } from './services/reminder.service';

async function bootstrap() {
  const prisma = new PrismaClient();
  await prisma.$connect();
  logger.info('Database connected');

  const bot = new Telegraf<BotContext>(config.bot.token);

  const userService = new UserService(prisma);
  const expenseService = new ExpenseService(prisma);
  const exportService = new ExportService(prisma);
  const reminderService = new ReminderService(prisma, expenseService);
  // Jadval yaratilmasa bot baribir ishlaydi: har /reminder va har daqiqalik
  // tekshiruv qayta urinadi, sabab log'da va /reminder javobida ko'rinadi.
  try {
    await reminderService.init();
  } catch (err) {
    logger.error(`Kunlik eslatma: ${(err as Error).message}`);
  }

  bot.use(session<SessionData, BotContext>());
  bot.use(groupMiddleware(userService));

  registerStartCommand(bot);
  registerHelpCommand(bot);
  registerStatsCommands(bot, expenseService);
  registerExportCommand(bot);
  registerLoginCommand(bot);
  registerCategoryCommands(bot, prisma);
  registerAdminCommands(bot, prisma);
  registerReminderCommand(bot, reminderService);

  registerCallbackHandlers(bot, expenseService, exportService, prisma);
  registerMessageHandlers(bot, expenseService, prisma);

  bot.catch((err, ctx) => {
    logger.error(`Bot error for ${ctx.updateType}:`, err);
  });

  await applyBotProfile(bot.telegram, config.bot.adminId);
  reminderService.start(bot.telegram);

  if (config.bot.webhookUrl && config.nodeEnv === 'production') {
    await bot.launch({ webhook: { domain: config.bot.webhookUrl } });
    logger.info(`Bot started with webhook: ${config.bot.webhookUrl}`);
  } else {
    await bot.launch();
    logger.info('Bot started with polling');
  }

  process.once('SIGINT', () => { reminderService.stop(); bot.stop('SIGINT'); prisma.$disconnect(); });
  process.once('SIGTERM', () => { reminderService.stop(); bot.stop('SIGTERM'); prisma.$disconnect(); });
}

bootstrap().catch((err) => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
