import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LimitsService } from './limits.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GroupAccessService } from '../../common/access/group-access.service';

@ApiTags('Limits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('limits')
export class LimitsController {
  constructor(
    private limitsService: LimitsService,
    private access: GroupAccessService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Set monthly limit' })
  async setLimit(
    @CurrentUser() user: User,
    @Body()
    body: {
      amount: number;
      currency?: string;
      categoryId?: string;
      userId?: string;
      month: number;
      year: number;
      groupId: string;
    },
  ) {
    await this.access.assertMember(user.id, body.groupId);
    return this.limitsService.setLimit(body);
  }

  @Get()
  @ApiOperation({ summary: 'Get limits with usage' })
  async getLimits(
    @CurrentUser() user: User,
    @Query('groupId') groupId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    await this.access.assertMember(user.id, groupId);
    const now = new Date();
    return this.limitsService.getLimitsWithUsage(
      groupId,
      month ? parseInt(month) : now.getMonth() + 1,
      year ? parseInt(year) : now.getFullYear(),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete limit' })
  async deleteLimit(@CurrentUser() user: User, @Param('id') id: string) {
    await this.access.assertMemberOfRecord(user.id, await this.limitsService.findById(id), 'Limit not found');
    return this.limitsService.deleteLimit(id);
  }
}
