import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('public')
export class PublicStaffController {
  constructor(private readonly prisma: PrismaService) {}

  private toWhatsappUrl(phone: string) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return null;
    if (digits.startsWith('593')) return `https://wa.me/${digits}`;
    if (digits.startsWith('0')) return `https://wa.me/593${digits.slice(1)}`;
    return `https://wa.me/593${digits}`;
  }

  @Get('staff')
  async staff() {
    const users = await this.prisma.userProfile.findMany({
      where: {
        role: { in: ['SUPER_ADMIN', 'PROVINCE_ADMIN'] },
        status: 'APPROVED',
      },
      select: {
        id: true,
        email: true,
        role: true,
        phone: true,
        displayName: true,
        nickname: true,
        displayNamePreference: true,
        profilePhotoUrl: true,
        primaryProvinceId: true,
        primaryCantonId: true,
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });

    const provinceIds = Array.from(
      new Set(users.map((u) => u.primaryProvinceId).filter((x): x is number => typeof x === 'number')),
    );
    const cantonIds = Array.from(
      new Set(users.map((u) => u.primaryCantonId).filter((x): x is number => typeof x === 'number')),
    );

    const [provinces, cantons] = await Promise.all([
      provinceIds.length
        ? this.prisma.province.findMany({ where: { id: { in: provinceIds } }, select: { id: true, name: true } })
        : Promise.resolve([]),
      cantonIds.length
        ? this.prisma.canton.findMany({ where: { id: { in: cantonIds } }, select: { id: true, name: true } })
        : Promise.resolve([]),
    ]);

    const provinceById = new Map(provinces.map((p) => [p.id, p.name] as const));
    const cantonById = new Map(cantons.map((c) => [c.id, c.name] as const));

    return users
      .map((u) => {
        const pref = u.displayNamePreference;
        const displayLabel =
          pref === 'NICKNAME' && u.nickname && u.nickname.trim().length
            ? u.nickname.trim()
            : u.displayName && u.displayName.trim().length
              ? u.displayName.trim()
              : u.email;

        return {
          id: u.id,
          role: u.role,
          displayLabel,
          email: u.email,
          profilePhotoUrl: u.profilePhotoUrl,
          whatsappUrl: u.phone ? this.toWhatsappUrl(u.phone) : null,
          province: u.primaryProvinceId ? provinceById.get(u.primaryProvinceId) ?? null : null,
          canton: u.primaryCantonId ? cantonById.get(u.primaryCantonId) ?? null : null,
        };
      })
      .sort((a, b) => {
        // SUPER_ADMIN first
        const ra = a.role === 'SUPER_ADMIN' ? 0 : 1;
        const rb = b.role === 'SUPER_ADMIN' ? 0 : 1;
        if (ra !== rb) return ra - rb;
        return a.displayLabel.localeCompare(b.displayLabel);
      });
  }
}
