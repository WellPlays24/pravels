import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequireAuth } from '../auth/auth.guard';
import type { AuthedRequest } from '../auth/auth.guard';

@Controller('admin/whatsapp-group-requests')
@RequireAuth('SUPER_ADMIN', 'PROVINCE_ADMIN')
export class AdminWhatsappGroupRequestsController {
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
  async list(@Req() req: AuthedRequest, @Query('status') statusRaw?: string) {
    const status =
      statusRaw === 'APPROVED' || statusRaw === 'REJECTED' || statusRaw === 'PENDING'
        ? statusRaw
        : 'PENDING';

    const where: any = { status };
    const allowed = await this.allowedProvinceIds(req);
    if (allowed) {
      where.group = {
        OR: [{ kind: 'MAIN' }, { provinceId: { in: allowed.length ? allowed : [-1] } }],
      };
    }

    return this.prisma.whatsappGroupJoinRequest.findMany({
      where,
      include: {
        user: true,
        group: { include: { province: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  @Post(':id/approve')
  async approve(@Req() req: AuthedRequest, @Param('id') id: string) {
    const r = await this.prisma.whatsappGroupJoinRequest.findUnique({
      where: { id },
      include: { group: true },
    });
    if (!r) throw new NotFoundException('Not found');
    if (r.status !== 'PENDING') throw new BadRequestException('Request not pending');

    if (r.group.kind === 'MAIN') {
      throw new BadRequestException('MAIN group is managed manually');
    }
    if (!r.group.isActive) throw new BadRequestException('Group is not active');

    if (req.user.role === 'PROVINCE_ADMIN') {
      const allowed = await this.allowedProvinceIds(req);
      if (!allowed) throw new BadRequestException('Not allowed');
      const provinceId = r.group.provinceId;
      if (provinceId && !allowed.includes(provinceId)) throw new BadRequestException('Not allowed');
    }

    await this.prisma.groupAccess.upsert({
      where: { userId_groupId: { userId: r.userId, groupId: r.groupId } },
      update: { grantedByUserId: req.user.id },
      create: { userId: r.userId, groupId: r.groupId, grantedByUserId: req.user.id },
    });

    return this.prisma.whatsappGroupJoinRequest.update({
      where: { id: r.id },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedByUserId: req.user.id,
        reviewNote: null,
      },
    });
  }

  @Post(':id/reject')
  async reject(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: any) {
    const r = await this.prisma.whatsappGroupJoinRequest.findUnique({
      where: { id },
      include: { group: true },
    });
    if (!r) throw new NotFoundException('Not found');
    if (r.status !== 'PENDING') throw new BadRequestException('Request not pending');

    if (req.user.role === 'PROVINCE_ADMIN') {
      const allowed = await this.allowedProvinceIds(req);
      if (!allowed) throw new BadRequestException('Not allowed');
      const provinceId = r.group.provinceId;
      if (provinceId && !allowed.includes(provinceId)) throw new BadRequestException('Not allowed');
    }

    const note = body?.note ? String(body.note) : null;
    return this.prisma.whatsappGroupJoinRequest.update({
      where: { id: r.id },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewedByUserId: req.user.id,
        reviewNote: note,
      },
    });
  }
}
