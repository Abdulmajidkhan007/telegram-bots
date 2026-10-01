import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Category } from '@prisma/client';

interface CreateCategoryDto {
  name: string;
  nameUz?: string;
  icon?: string;
  color?: string;
  groupId?: string;
}

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(groupId?: string): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        // Umumiy standartlar (groupId=null) + faqat so'ralgan guruhniki.
        // `groupId: undefined` ga tayanmaymiz — filtr aniq yozilgan bo'lsin.
        OR: groupId
          ? [{ isDefault: true, groupId: null }, { groupId }]
          : [{ isDefault: true, groupId: null }],
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  findById(id: string): Promise<Category | null> {
    return this.prisma.category.findUnique({ where: { id } });
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    return this.prisma.category.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreateCategoryDto>): Promise<Category> {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Category not found');
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.category.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
  }

  async seedDefaults(): Promise<void> {
    const defaults = [
      { name: 'Oziq-ovqat', icon: '🍕', color: '#f59e0b', isDefault: true },
      { name: 'Transport', icon: '🚗', color: '#3b82f6', isDefault: true },
      { name: 'Uy-joy', icon: '🏠', color: '#10b981', isDefault: true },
      { name: 'Kiyim-kechak', icon: '👗', color: '#8b5cf6', isDefault: true },
      { name: "Sog'liq", icon: '💊', color: '#ef4444', isDefault: true },
      { name: "Ta'lim", icon: '📚', color: '#06b6d4', isDefault: true },
      { name: "Ko'ngilochar", icon: '🎮', color: '#f97316', isDefault: true },
      { name: 'Texnologiya', icon: '💻', color: '#6366f1', isDefault: true },
      { name: 'Sport', icon: '⚽', color: '#84cc16', isDefault: true },
      { name: 'Boshqa', icon: '📦', color: '#94a3b8', isDefault: true },
    ];

    await this.prisma.category.createMany({ data: defaults, skipDuplicates: true });
  }
}
