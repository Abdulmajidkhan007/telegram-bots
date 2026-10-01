import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GroupAccessService } from '../../common/access/group-access.service';

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(
    private categoriesService: CategoriesService,
    private access: GroupAccessService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List categories' })
  async findAll(@CurrentUser() user: User, @Query('groupId') groupId?: string) {
    // groupId siz — faqat umumiy standart kategoriyalar.
    if (groupId) await this.access.assertMember(user.id, groupId);
    return this.categoriesService.findAll(groupId);
  }

  @Post()
  @ApiOperation({ summary: 'Create category' })
  async create(
    @CurrentUser() user: User,
    @Body() body: { name: string; nameUz?: string; icon?: string; color?: string; groupId?: string },
  ) {
    // groupId siz kategoriya hech bir guruhga tegishli bo'lmay qolardi.
    await this.access.assertMember(user.id, body.groupId);
    return this.categoriesService.create(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update category' })
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { name?: string; icon?: string; color?: string },
  ) {
    await this.access.assertMemberOfRecord(user.id, await this.categoriesService.findById(id), 'Category not found');
    return this.categoriesService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete category' })
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    await this.access.assertMemberOfRecord(user.id, await this.categoriesService.findById(id), 'Category not found');
    return this.categoriesService.remove(id);
  }
}
