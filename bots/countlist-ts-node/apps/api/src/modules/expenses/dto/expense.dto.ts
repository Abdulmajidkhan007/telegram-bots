import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, IsPositive, MaxLength, Matches, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExpenseDto {
  @ApiProperty({ example: 500000 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ enum: ['UZS', 'USD', 'EUR', 'RUB'] })
  @IsOptional()
  @IsEnum(['UZS', 'USD', 'EUR', 'RUB'])
  currency?: 'UZS' | 'USD' | 'EUR' | 'RUB';

  @ApiProperty({ example: 'Ovqat uchun' })
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty()
  @IsString()
  groupId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ enum: ['TEXT', 'VOICE', 'OCR', 'RECURRING', 'MANUAL'] })
  @IsOptional()
  @IsEnum(['TEXT', 'VOICE', 'OCR', 'RECURRING', 'MANUAL'])
  source?: 'TEXT' | 'VOICE' | 'OCR' | 'RECURRING' | 'MANUAL';
}

// Mini App tahriri. Sana — "YYYY-MM-DD" (guruh mintaqasidagi kun), ISO lahza
// emas: telefon mintaqasi boshqa bo'lsa ham kun siljimasin.
export class UpdateExpenseDto {
  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @ApiPropertyOptional({ enum: ['UZS', 'USD', 'EUR', 'RUB'] })
  @IsOptional()
  @IsEnum(['UZS', 'USD', 'EUR', 'RUB'])
  currency?: 'UZS' | 'USD' | 'EUR' | 'RUB';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({ nullable: true, description: 'null — kategoriyani olib tashlash' })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  categoryId?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'null — hisobsiz' })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  accountId?: string | null;

  @ApiPropertyOptional({ enum: ['EXPENSE', 'INCOME'] })
  @IsOptional()
  @IsEnum(['EXPENSE', 'INCOME'])
  type?: 'EXPENSE' | 'INCOME';

  @ApiPropertyOptional({ example: '2026-10-12' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;
}

export class ExpenseQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  month?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  year?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ enum: ['EXPENSE', 'INCOME', 'ALL'], default: 'EXPENSE' })
  @IsOptional()
  @IsEnum(['EXPENSE', 'INCOME', 'ALL'])
  type?: 'EXPENSE' | 'INCOME' | 'ALL';

  @ApiPropertyOptional({ description: "Izoh, kategoriya yoki hisob nomi bo'yicha" })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  search?: string;
}
