import { Controller, Get, Param, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { GroupAccessService } from '../../common/access/group-access.service';

@ApiTags('Groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('groups')
export class GroupsController {
  constructor(
    private groupsService: GroupsService,
    private access: GroupAccessService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get my groups' })
  getMyGroups(@CurrentUser() user: User) {
    return this.groupsService.findUserGroups(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get group details' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.groupsService.findOne(id, user.id);
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Get group summary stats' })
  async getSummary(@Param('id') id: string, @CurrentUser() user: User) {
    await this.access.assertMember(user.id, id);
    return this.groupsService.getGroupSummary(id);
  }

  @Patch(':id/settings')
  @ApiOperation({ summary: 'Update group settings (admin only)' })
  updateSettings(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() body: {
      allowMemberExpenses?: boolean;
      requireApproval?: boolean;
      notifyOnExpense?: boolean;
      monthlyBudget?: number;
      alertThreshold?: number;
      currency?: string;
    },
  ) {
    return this.groupsService.updateSettings(id, user.id, body);
  }
}
