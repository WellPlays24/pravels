import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('public')
export class PublicSettingsController {
  constructor(private readonly prisma: PrismaService) {}

  private toWhatsappUrl(phone: string) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return null;
    if (digits.startsWith('593')) return `https://wa.me/${digits}`;
    if (digits.startsWith('0')) return `https://wa.me/593${digits.slice(1)}`;
    return `https://wa.me/593${digits}`;
  }

  @Get('settings')
  async get() {
    const s = await this.prisma.generalSetting.upsert({
      where: { id: 'global' },
      update: {},
      create: { id: 'global', communityName: 'Pravels' },
      select: { communityName: true, logoUrl: true, supportUserId: true, updatedAt: true },
    });

    const supportUser = s.supportUserId
      ? await this.prisma.userProfile.findUnique({
          where: { id: s.supportUserId },
          select: {
            id: true,
            email: true,
            phone: true,
            displayName: true,
            nickname: true,
            displayNamePreference: true,
          },
        })
      : await this.prisma.userProfile.findFirst({
          where: { role: 'SUPER_ADMIN', status: 'APPROVED', phone: { not: null } },
          select: {
            id: true,
            email: true,
            phone: true,
            displayName: true,
            nickname: true,
            displayNamePreference: true,
          },
          orderBy: { createdAt: 'asc' },
        });

    const displayLabel = supportUser
      ? supportUser.displayNamePreference === 'NICKNAME' && supportUser.nickname?.trim()
        ? supportUser.nickname.trim()
        : supportUser.displayName?.trim()
          ? supportUser.displayName.trim()
          : supportUser.email
      : null;

    const whatsappUrl = supportUser?.phone ? this.toWhatsappUrl(supportUser.phone) : null;

    return {
      communityName: s.communityName,
      logoUrl: s.logoUrl,
      updatedAt: s.updatedAt,
      support: supportUser
        ? {
            userId: supportUser.id,
            displayLabel,
            phone: supportUser.phone,
            whatsappUrl,
          }
        : null,
    };
  }
}
