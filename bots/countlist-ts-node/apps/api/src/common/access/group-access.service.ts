import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Guruh ma'lumotiga kim tegishi mumkinligini BITTA joyda hal qilamiz.
// Avval har endpoint groupId ni so'rovdan olib, tekshirmasdan ishlatardi —
// tizimga kirgan istalgan odam boshqa guruh ID sini bersa, uning xarajatlari,
// analitikasi, limitlari va eksportini olardi.
@Injectable()
export class GroupAccessService {
  constructor(private prisma: PrismaService) {}

  async assertMember(userId: string, groupId: string | undefined | null): Promise<string> {
    if (!groupId || typeof groupId !== 'string') {
      throw new BadRequestException('groupId majburiy');
    }
    const member = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    // Guruh yo'qligi va a'zo emaslik bir xil javob beradi: aks holda javobdan
    // qaysi guruh ID lari mavjudligini bilib olish mumkin bo'lardi.
    if (!member || !member.isActive) {
      throw new ForbiddenException("Siz bu guruh a'zosi emassiz");
    }
    return groupId;
  }

  /** Guruhga tegishli yozuvni topib, foydalanuvchi o'sha guruh a'zosi ekanini tekshiradi. */
  async assertMemberOfRecord(
    userId: string,
    record: { groupId: string | null } | null,
    notFoundMessage: string,
  ): Promise<string> {
    if (!record) throw new NotFoundException(notFoundMessage);
    if (!record.groupId) {
      // groupId siz yozuv — hamma guruhlar uchun umumiy (masalan, standart
      // kategoriya). Uni bitta foydalanuvchi hamma uchun o'zgartirmasin.
      throw new ForbiddenException("Umumiy yozuvni o'zgartirib bo'lmaydi");
    }
    return this.assertMember(userId, record.groupId);
  }
}
