import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequireAuth } from '../auth/auth.guard';
import type { AuthedRequest } from '../auth/auth.guard';
import { CreateWhatsappGroupDto, UpdateWhatsappGroupDto } from './whatsapp-groups.dto';

@Controller('admin')
@RequireAuth('SUPER_ADMIN', 'PROVINCE_ADMIN')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  private async allowedProvinceIds(req: AuthedRequest) {
    if (req.user.role !== 'PROVINCE_ADMIN') return null;
    const rows = await this.prisma.adminProvince.findMany({
      where: { userId: req.user.id },
      select: { provinceId: true },
    });
    if (rows.length) return rows.map((x) => x.provinceId);
    const me = await this.prisma.userProfile.findUnique({ where: { id: req.user.id }, select: { primaryProvinceId: true } });
    return me?.primaryProvinceId ? [me.primaryProvinceId] : [];
  }

  @Get('provinces')
  async provinces(@Req() req: AuthedRequest) {
    if (req.user.role === 'PROVINCE_ADMIN') {
      const provinceIds = (await this.allowedProvinceIds(req)) ?? [];
      return this.prisma.province.findMany({
        where: { id: { in: provinceIds.length ? provinceIds : [-1] } },
        orderBy: { name: 'asc' },
      });
    }

    return this.prisma.province.findMany({ orderBy: { name: 'asc' } });
  }

  @Get('whatsapp-groups')
  async listGroups(@Req() req: AuthedRequest) {
    // Province admins: can only manage their province groups + main groups
    if (req.user.role === 'PROVINCE_ADMIN') {
      const provinceIds = (await this.allowedProvinceIds(req)) ?? [];

        return this.prisma.whatsappGroup.findMany({
          where: {
          OR: [{ kind: 'MAIN' }, { provinceId: { in: provinceIds.length ? provinceIds : [-1] } }],
          },
          include: { province: true },
          orderBy: [{ kind: 'asc' }, { name: 'asc' }],
        });
    }

    return this.prisma.whatsappGroup.findMany({
      include: { province: true },
      orderBy: [{ kind: 'asc' }, { name: 'asc' }],
    });
  }

  @Post('whatsapp-groups')
  async createGroup(@Req() req: AuthedRequest, @Body() dto: CreateWhatsappGroupDto) {
    if (dto.kind === 'PROVINCE' && !dto.provinceId) {
      throw new BadRequestException('provinceId is required for PROVINCE groups');
    }

    if (dto.kind === 'MAIN') {
      dto.provinceId = undefined;
    }

    if (req.user.role === 'PROVINCE_ADMIN') {
      // must be within allowed provinces unless MAIN
      if (dto.kind !== 'MAIN') {
        const allowedIds = (await this.allowedProvinceIds(req)) ?? [];
        if (!allowedIds.includes(dto.provinceId!)) throw new ForbiddenException('Not allowed for this province');
      }
    }

    return this.prisma.whatsappGroup.create({
      data: {
        kind: dto.kind,
        name: dto.name,
        url: dto.url,
        isActive: dto.isActive ?? true,
        provinceId: dto.kind === 'MAIN' ? null : dto.provinceId ?? null,
        createdByUserId: req.user.id,
      },
      include: { province: true },
    });
  }

  @Patch('whatsapp-groups/:id')
  async updateGroup(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateWhatsappGroupDto,
  ) {
    const existing = await this.prisma.whatsappGroup.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Not found');

    if (req.user.role === 'PROVINCE_ADMIN') {
      if (existing.kind !== 'MAIN') {
        const allowedIds = (await this.allowedProvinceIds(req)) ?? [];
        if (existing.provinceId && !allowedIds.includes(existing.provinceId)) throw new ForbiddenException('Not allowed');
      }
    }

    const nextKind = dto.kind ?? existing.kind;
    const nextProvinceId =
      nextKind === 'MAIN'
        ? null
        : dto.provinceId === undefined
          ? existing.provinceId
          : dto.provinceId;

    if (nextKind === 'PROVINCE' && !nextProvinceId) {
      throw new BadRequestException('provinceId is required for PROVINCE groups');
    }

    return this.prisma.whatsappGroup.update({
      where: { id },
      data: {
        name: dto.name,
        url: dto.url,
        kind: dto.kind,
        provinceId: nextProvinceId,
        isActive: dto.isActive,
      },
      include: { province: true },
    });
  }

  @Delete('whatsapp-groups/:id')
  async deleteGroup(@Req() req: AuthedRequest, @Param('id') id: string) {
    const existing = await this.prisma.whatsappGroup.findUnique({ where: { id } });
    if (!existing) return { ok: true };

    if (req.user.role === 'PROVINCE_ADMIN') {
      if (existing.kind !== 'MAIN') {
        const allowedIds = (await this.allowedProvinceIds(req)) ?? [];
        if (existing.provinceId && !allowedIds.includes(existing.provinceId)) throw new ForbiddenException('Not allowed');
      }
    }

    await this.prisma.whatsappGroup.delete({ where: { id } });
    return { ok: true };
  }
}
