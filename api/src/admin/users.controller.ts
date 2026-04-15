import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequireAuth } from '../auth/auth.guard';
import type { AuthedRequest } from '../auth/auth.guard';

@Controller('admin/users')
@RequireAuth('SUPER_ADMIN', 'PROVINCE_ADMIN')
export class AdminUsersController {
  constructor(private readonly prisma: PrismaService) {}

  async allowedProvinceIds(req: AuthedRequest) {
    if (req.user.role !== 'PROVINCE_ADMIN') return null;
    const adminProvinces = await this.prisma.adminProvince.findMany({
      where: { userId: req.user.id },
      select: { provinceId: true },
    });
    return adminProvinces.map((x) => x.provinceId);
  }

  @Get()
  async list(
    @Req() req: AuthedRequest,
    @Query('role') roleRaw?: string,
    @Query('status') statusRaw?: string,
    @Query('provinceId') provinceIdRaw?: string,
    @Query('cantonId') cantonIdRaw?: string,
    @Query('q') qRaw?: string,
  ) {
    const where: any = {};

    if (roleRaw && ['SUPER_ADMIN', 'PROVINCE_ADMIN', 'MEMBER'].includes(roleRaw)) {
      where.role = roleRaw;
    }
    if (statusRaw && ['PENDING', 'APPROVED', 'REJECTED', 'DISABLED'].includes(statusRaw)) {
      where.status = statusRaw;
    }

    const provinceId = provinceIdRaw ? Number(provinceIdRaw) : undefined;
    if (provinceIdRaw && (!provinceId || Number.isNaN(provinceId))) {
      throw new BadRequestException('provinceId must be a number');
    }
    const cantonId = cantonIdRaw ? Number(cantonIdRaw) : undefined;
    if (cantonIdRaw && (!cantonId || Number.isNaN(cantonId))) {
      throw new BadRequestException('cantonId must be a number');
    }
    if (provinceId) where.primaryProvinceId = provinceId;
    if (cantonId) where.primaryCantonId = cantonId;

    const q = (qRaw ?? '').trim();
    if (q) {
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { displayName: { contains: q, mode: 'insensitive' } },
        { nickname: { contains: q, mode: 'insensitive' } },
      ];
    }

    const allowed = await this.allowedProvinceIds(req);
    if (allowed) {
      where.primaryProvinceId = { in: allowed.length ? allowed : [-1] };
    }

    return this.prisma.userProfile.findMany({
      where,
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        displayName: true,
        nickname: true,
        displayNamePreference: true,
        profilePhotoUrl: true,
        isBannedFromMain: true,
        primaryProvinceId: true,
        primaryCantonId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  @Get(':id')
  async get(@Req() req: AuthedRequest, @Param('id') id: string) {
    const user = await this.prisma.userProfile.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Not found');

    const allowed = await this.allowedProvinceIds(req);
    if (allowed && user.primaryProvinceId && !allowed.includes(user.primaryProvinceId)) {
      throw new BadRequestException('Not allowed');
    }

    return user;
  }

  @Patch(':id')
  async update(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: any) {
    const user = await this.prisma.userProfile.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Not found');

    const allowed = await this.allowedProvinceIds(req);
    if (allowed && user.primaryProvinceId && !allowed.includes(user.primaryProvinceId)) {
      throw new BadRequestException('Not allowed');
    }

    const data: any = {};

    if (body?.phone !== undefined) data.phone = body.phone ? String(body.phone).trim() : null;
    if (body?.displayName !== undefined) data.displayName = body.displayName ? String(body.displayName).trim() : null;
    if (body?.nickname !== undefined) data.nickname = body.nickname ? String(body.nickname).trim() : null;
    if (body?.displayNamePreference !== undefined) {
      const pref = String(body.displayNamePreference);
      if (pref !== 'FULL_NAME' && pref !== 'NICKNAME') throw new BadRequestException('Invalid displayNamePreference');
      data.displayNamePreference = pref;
    }
    if (body?.isBannedFromMain !== undefined) data.isBannedFromMain = Boolean(body.isBannedFromMain);

    // Only SUPER_ADMIN can change role/status and move users across provinces.
    if (req.user.role === 'SUPER_ADMIN') {
      if (body?.role !== undefined) {
        const role = String(body.role);
        if (!['SUPER_ADMIN', 'PROVINCE_ADMIN', 'MEMBER'].includes(role)) throw new BadRequestException('Invalid role');
        data.role = role;
      }
      if (body?.status !== undefined) {
        const status = String(body.status);
        if (!['PENDING', 'APPROVED', 'REJECTED', 'DISABLED'].includes(status)) throw new BadRequestException('Invalid status');
        data.status = status;
      }
      if (body?.primaryProvinceId !== undefined) {
        data.primaryProvinceId = body.primaryProvinceId ? Number(body.primaryProvinceId) : null;
      }
      if (body?.primaryCantonId !== undefined) {
        data.primaryCantonId = body.primaryCantonId ? Number(body.primaryCantonId) : null;
      }

      // Validate canton belongs to province if both are set.
      const nextProvinceId = data.primaryProvinceId === undefined ? user.primaryProvinceId : data.primaryProvinceId;
      const nextCantonId = data.primaryCantonId === undefined ? user.primaryCantonId : data.primaryCantonId;
      if (nextCantonId && nextProvinceId) {
        const canton = await this.prisma.canton.findUnique({ where: { id: nextCantonId } });
        if (!canton || canton.provinceId !== nextProvinceId) {
          throw new BadRequestException('primaryCantonId must belong to primaryProvinceId');
        }
      }
    }

    return this.prisma.userProfile.update({ where: { id }, data });
  }
}
