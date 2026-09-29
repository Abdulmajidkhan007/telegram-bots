import { PrismaClient } from '@prisma/client';

export class ExportService {
  constructor(private prisma: PrismaClient) {}

  private async getExpenses(groupId: string) {
    return this.prisma.expense.findMany({
      where: { groupId, status: 'ACTIVE' },
      include: { category: true, user: true },
      orderBy: { date: 'desc' },
      take: 5000,
    });
  }

  async generateCsv(groupId: string): Promise<Buffer> {
    const expenses = await this.getExpenses(groupId);
    const lines = ['Sana,Miqdor,Valyuta,Tavsif,Kategoriya,Foydalanuvchi'];

    for (const e of expenses) {
      const date = new Date(e.date).toISOString().split('T')[0];
      const desc = `"${e.description.replace(/"/g, '""')}"`;
      const cat = `"${(e.category?.name ?? 'Boshqa').replace(/"/g, '""')}"`;
      const user = `"${e.user.firstName.replace(/"/g, '""')}"`;
      lines.push(`${date},${Number(e.amount)},${e.currency},${desc},${cat},${user}`);
    }

    return Buffer.from('﻿' + lines.join('\n'), 'utf-8');
  }

  async generateExcel(groupId: string): Promise<Buffer> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ExcelJS = require('exceljs');
    const expenses = await this.getExpenses(groupId);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Expense Tracker Bot';
    const sheet = workbook.addWorksheet('Xarajatlar');

    sheet.columns = [
      { header: 'Sana', key: 'date', width: 14 },
      { header: 'Miqdor', key: 'amount', width: 16, style: { numFmt: '#,##0' } },
      { header: 'Valyuta', key: 'currency', width: 10 },
      { header: 'Tavsif', key: 'description', width: 35 },
      { header: 'Kategoriya', key: 'category', width: 20 },
      { header: 'Foydalanuvchi', key: 'user', width: 20 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };

    for (const e of expenses) {
      sheet.addRow({
        date: new Date(e.date).toLocaleDateString('ru-RU'),
        amount: Number(e.amount),
        currency: e.currency,
        description: e.description,
        category: e.category?.name ?? 'Boshqa',
        user: e.user.firstName,
      });
    }

    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 6 } };

    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.from(buf);
  }
}
