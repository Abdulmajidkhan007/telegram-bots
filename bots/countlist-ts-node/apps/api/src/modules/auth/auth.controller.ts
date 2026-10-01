import {
  Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Logger,
  UnauthorizedException, ServiceUnavailableException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '@prisma/client';
import { verifyTelegramLogin } from './telegram-auth';
import { verifyLoginLink } from '@expense-tracker/shared';
import { configuration } from '../../config/configuration';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @Public()
  @Post('telegram')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Telegram Login Widget orqali kirish (imzo tekshiriladi)' })
  // Body ataylab DTO klassisiz: global ValidationPipe (whitelist) noma'lum
  // maydonlarni o'chirardi, Telegram imzosi esa HAMMA maydonlardan hisoblanadi.
  async loginTelegram(@Body() body: Record<string, unknown>) {
    const botToken = configuration().bot.token;
    if (!botToken) {
      this.logger.error("BOT_TOKEN API servisida o'rnatilmagan — Telegram kirishini tekshirib bo'lmaydi");
      throw new ServiceUnavailableException("Kirish sozlanmagan: API servisiga BOT_TOKEN qo'shing");
    }

    const result = verifyTelegramLogin(body, botToken);
    // 'in' bilan toraytiramiz: bu paketda strict o'chiq, `!result.ok` turni toraytirmaydi.
    if ('reason' in result) {
      this.logger.warn(`Telegram kirish rad etildi: ${result.reason}`);
      throw new UnauthorizedException(result.reason);
    }

    return this.authService.loginWithTelegram(
      BigInt(result.user.id),
      result.user.firstName,
      result.user.username,
    );
  }

  @Public()
  @Post('bot-link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Bot /login bergan havola orqali kirish (imzo va muddat tekshiriladi)" })
  async loginBotLink(@Body() body: { token?: string }) {
    const botToken = configuration().bot.token;
    if (!botToken) {
      this.logger.error("BOT_TOKEN API servisida o'rnatilmagan — kirish havolasini tekshirib bo'lmaydi");
      throw new ServiceUnavailableException("Kirish sozlanmagan: API servisiga BOT_TOKEN qo'shing");
    }

    const result = verifyLoginLink(body?.token, botToken);
    // 'in' bilan toraytiramiz: bu paketda strict o'chiq.
    if ('reason' in result) {
      this.logger.warn(`Havola orqali kirish rad etildi: ${result.reason}`);
      throw new UnauthorizedException(result.reason);
    }

    return this.authService.loginWithTelegram(
      BigInt(result.user.id),
      result.user.firstName,
      result.user.username,
    );
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refreshTokens(body.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: User) {
    await this.authService.logout(user.id);
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  async getMe(@CurrentUser() user: User) {
    return { ...user, telegramId: user.telegramId.toString() };
  }
}
