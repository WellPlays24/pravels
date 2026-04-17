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
import { randomUUID } from 'node:crypto';

@Controller('admin/registration-requests')
@RequireAuth('SUPER_ADMIN', 'PROVINCE_ADMIN')
export class AdminRegistrationRequestsController {
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

  @Get()
  async list(@Req() req: AuthedRequest, @Query('status') statusRaw?: string) {
    const status = statusRaw === 'APPROVED' || statusRaw === 'REJECTED' ? statusRaw : 'PENDING';

    if (req.user.role === 'PROVINCE_ADMIN') {
      const provinceIds = (await this.allowedProvinceIds(req)) ?? [];
      return this.prisma.registrationRequest.findMany({
        where: {
          status,
          priorityProvinceId: { in: provinceIds.length ? provinceIds : [-1] },
        },
        include: {
          priorityProvince: true,
          priorityCanton: true,
          requestedProvinces: { include: { province: true } },
        },
        orderBy: { submittedAt: 'desc' },
      });
    }

    return this.prisma.registrationRequest.findMany({
      where: { status },
      include: {
        priorityProvince: true,
        priorityCanton: true,
        requestedProvinces: { include: { province: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  @Get(':id')
  async get(@Req() req: AuthedRequest, @Param('id') id: string) {
    const rr = await this.prisma.registrationRequest.findUnique({
      where: { id },
      include: {
        priorityProvince: true,
        priorityCanton: true,
        requestedProvinces: { include: { province: true } },
      },
    });
    if (!rr) throw new NotFoundException('Not found');

    if (req.user.role === 'PROVINCE_ADMIN') {
      const allowedIds = (await this.allowedProvinceIds(req)) ?? [];
      if (!allowedIds.includes(rr.priorityProvinceId)) throw new BadRequestException('Not allowed');
    }

    return rr;
  }

  @Post(':id/approve')
  async approve(@Req() req: AuthedRequest, @Param('id') id: string) {
    const rr = await this.prisma.registrationRequest.findUnique({
      where: { id },
      include: { requestedProvinces: true },
    });
    if (!rr) throw new NotFoundException('Not found');
    if (rr.status !== 'PENDING') throw new BadRequestException('Request not pending');

    if (req.user.role === 'PROVINCE_ADMIN') {
      const allowedIds = (await this.allowedProvinceIds(req)) ?? [];
      if (!allowedIds.includes(rr.priorityProvinceId)) throw new BadRequestException('Not allowed');
    }

    const provinceIds = Array.from(
      new Set([
        rr.priorityProvinceId,
        ...rr.requestedProvinces.map((p) => p.provinceId),
      ]),
    );

    const user = await this.prisma.userProfile.upsert({
      where: { email: rr.email },
      update: {
        role: 'MEMBER',
        status: 'APPROVED',
        phone: rr.phone,
        birthDate: rr.birthDate,
        displayName: rr.fullName,
        nickname: rr.nickname,
        displayNamePreference: rr.displayNamePreference,
        profilePhotoUrl: rr.profilePhotoUrl,
        primaryProvinceId: rr.priorityProvinceId,
        primaryCantonId: rr.priorityCantonId,
      },
      create: {
        id: randomUUID(),
        email: rr.email,
        role: 'MEMBER',
        status: 'APPROVED',
        phone: rr.phone,
        birthDate: rr.birthDate,
        displayName: rr.fullName,
        nickname: rr.nickname,
        displayNamePreference: rr.displayNamePreference,
        profilePhotoUrl: rr.profilePhotoUrl,
        primaryProvinceId: rr.priorityProvinceId,
        primaryCantonId: rr.priorityCantonId,
      },
    });

    await this.prisma.localCredential.upsert({
      where: { userId: user.id },
      update: { passwordHash: rr.passwordHash },
      create: { userId: user.id, passwordHash: rr.passwordHash },
    });

    for (const provinceId of provinceIds) {
      await this.prisma.memberProvince.upsert({
        where: { userId_provinceId: { userId: user.id, provinceId } },
        update: {},
        create: { userId: user.id, provinceId, grantedByUserId: req.user.id },
      });
    }

    await this.prisma.registrationRequest.update({
      where: { id: rr.id },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedByUserId: req.user.id,
        reviewNote: null,
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: user.id,
        actorUserId: req.user.id,
        type: 'MEMBER_REQUEST_APPROVED',
        title: 'Registro aprobado',
        body: 'Tu registro fue aprobado. Ya puedes iniciar sesion y unirte a los planes.',
        data: { href: '/trips' },
      },
    });

    return { ok: true };
  }

  @Post(':id/reject')
  async reject(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: any) {
    const rr = await this.prisma.registrationRequest.findUnique({ where: { id } });
    if (!rr) throw new NotFoundException('Not found');
    if (rr.status !== 'PENDING') throw new BadRequestException('Request not pending');

    if (req.user.role === 'PROVINCE_ADMIN') {
      const allowedIds = (await this.allowedProvinceIds(req)) ?? [];
      if (!allowedIds.includes(rr.priorityProvinceId)) throw new BadRequestException('Not allowed');
    }

    const note = body?.note ? String(body.note) : null;
    await this.prisma.registrationRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewedByUserId: req.user.id,
        reviewNote: note,
      },
    });

    return { ok: true };
  }
}
