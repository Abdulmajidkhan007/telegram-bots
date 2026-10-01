import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, UpdateExpenseDto, ExpenseQueryDto } from './dto/expense.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GroupAccessService } from '../../common/access/group-access.service';
import { User } from '@prisma/client';

@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(
    private expensesService: ExpensesService,
    private access: GroupAccessService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create expense' })
  async create(@CurrentUser() user: User, @Body() dto: CreateExpenseDto) {
    await this.access.assertMember(user.id, dto.groupId);
    return this.expensesService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List expenses with filters' })
  async findAll(@Query() query: ExpenseQueryDto, @CurrentUser() user: User) {
    const groupId = await this.access.assertMember(user.id, query.groupId);
    return this.expensesService.findAll({
      groupId,
      userId: query.userId,
      categoryId: query.categoryId,
      month: query.month ? Number(query.month) : undefined,
      year: query.year ? Number(query.year) : undefined,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  @Get('stats/:groupId')
  @ApiOperation({ summary: 'Get group expense statistics' })
  async getStats(
    @CurrentUser() user: User,
    @Param('groupId') groupId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    await this.access.assertMember(user.id, groupId);
    const now = new Date();
    return this.expensesService.getGroupStats(
      groupId,
      month ? parseInt(month) : now.getMonth() + 1,
      year ? parseInt(year) : now.getFullYear(),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get expense by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.expensesService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update expense' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete expense (soft delete)' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.expensesService.remove(id, user.id);
  }
}
