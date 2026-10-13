import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { AccountsService } from './accounts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GroupAccessService } from '../../common/access/group-access.service';

// Hisoblar botda (/hisoblar) boshqariladi; Mini App faqat o'qiydi — tahrirda
// hisob tanlash uchun. Ikki joyda boshqaruv bo'lsa tartib/yopish chalkashadi.
@ApiTags('Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(
    private accounts: AccountsService,
    private access: GroupAccessService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Group accounts with balances' })
  async list(@CurrentUser() user: User, @Query('groupId') groupId: string) {
    const id = await this.access.assertMember(user.id, groupId);
    return this.accounts.listWithBalances(id);
  }
}
