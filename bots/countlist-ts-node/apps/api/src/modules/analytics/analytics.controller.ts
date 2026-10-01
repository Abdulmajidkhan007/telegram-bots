import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { subMonths, subDays } from 'date-fns';
import { User } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GroupAccessService } from '../../common/access/group-access.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private analyticsService: AnalyticsService,
    private access: GroupAccessService,
  ) {}

  @Get('dashboard/:groupId')
  @ApiOperation({ summary: 'Get dashboard overview stats' })
  async getDashboard(@Param('groupId') groupId: string, @CurrentUser() user: User) {
    await this.access.assertMember(user.id, groupId);
    return this.analyticsService.getDashboardStats(groupId);
  }

  @Get('full/:groupId')
  @ApiOperation({ summary: 'Get full analytics data' })
  async getFull(
    @CurrentUser() user: User,
    @Param('groupId') groupId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    await this.access.assertMember(user.id, groupId);
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : subMonths(end, 1);
    return this.analyticsService.getFullAnalytics(groupId, start, end);
  }

  @Get('trends/:groupId')
  @ApiOperation({ summary: 'Get expense trends for charts' })
  async getTrends(
    @CurrentUser() user: User,
    @Param('groupId') groupId: string,
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'monthly',
  ) {
    await this.access.assertMember(user.id, groupId);
    const end = new Date();
    const start = period === 'daily'
      ? subDays(end, 30)
      : period === 'weekly'
      ? subMonths(end, 3)
      : subMonths(end, 12);
    return this.analyticsService.getFullAnalytics(groupId, start, end);
  }
}
