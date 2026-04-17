import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequireAuth } from '../auth/auth.guard';
import type { AuthedRequest } from '../auth/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';

@Controller('admin/users')
@RequireAuth('SUPER_ADMIN', 'PROVINCE_ADMIN')
export class AdminUsersController {
  constructor(private readonly prisma: PrismaService) {}

  private parseDateOnly(value: string) {
    const s = String(value ?? '').trim();
    const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(s);
    if (!m) throw new BadRequestException('birthDate must be YYYY-MM-DD');
    const y = Number(m[1]);
    const mm = Number(m[2]);
    const d = Number(m[3]);
    if (!Number.isInteger(y) || !Number.isInteger(mm) || !Number.isInteger(d)) throw new BadRequestException('Invalid birthDate');
    if (mm < 1 || mm > 12 || d < 1 || d > 31) throw new BadRequestException('Invalid birthDate');
    return new Date(Date.UTC(y, mm - 1, d));
  }

  private addMonths(d: Date, months: number) {
    const x = new Date(d);
    x.setMonth(x.getMonth() + months);
    return x;
  }

  async allowedProvinceIds(req: AuthedRequest) {
    if (req.user.role !== 'PROVINCE_ADMIN') return null;
    const adminProvinces = await this.prisma.adminProvince.findMany({
      where: { userId: req.user.id },
      select: { provinceId: true },
    });
    if (adminProvinces.length) return adminProvinces.map((x) => x.provinceId);

    // Fallback: if no explicit assignments exist, use the admin's primaryProvinceId.
    const me = await this.prisma.userProfile.findUnique({
      where: { id: req.user.id },
      select: { primaryProvinceId: true },
    });
    return me?.primaryProvinceId ? [me.primaryProvinceId] : [];
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
        birthDate: true,
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
      if (body?.email !== undefined) {
        const next = String(body.email ?? '').toLowerCase().trim();
        if (!next || !next.includes('@')) throw new BadRequestException('Invalid email');
        data.email = next;
      }
      if (body?.birthDate !== undefined) {
        if (!body.birthDate) data.birthDate = null;
        else data.birthDate = this.parseDateOnly(String(body.birthDate));
      }
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

  @Post(':id/profile-photo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req: any, _file: any, cb: any) => {
          const dir = process.env.PRAVELS_PROFILE_PHOTOS_DIR;
          if (!dir) return cb(new Error('PRAVELS_PROFILE_PHOTOS_DIR is not set'), dir as any);
          cb(null, dir);
        },
        filename: (req: any, file: any, cb: any) => {
          const ext = path.extname(file.originalname || '').toLowerCase();
          const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
          const userId = String((req as any).params?.id ?? 'user');
          cb(null, `${userId}-${randomUUID()}${safeExt}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ok = file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/webp';
        cb(ok ? null : new Error('Only JPG/PNG/WEBP allowed'), ok);
      },
    }),
  )
  async uploadProfilePhoto(@Req() req: AuthedRequest, @Param('id') id: string, @UploadedFile() file?: Express.Multer.File) {
    if (req.user.role !== 'SUPER_ADMIN') throw new BadRequestException('Not allowed');
    if (!file) throw new BadRequestException('file is required');
    const user = await this.prisma.userProfile.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Not found');

    const url = `/files/profile-photos/${encodeURIComponent(file.filename)}`;
    await this.prisma.userProfile.update({ where: { id }, data: { profilePhotoUrl: url } as any });
    return { profilePhotoUrl: url };
  }

  @Post(':id/password')
  async setPassword(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: any) {
    if (req.user.role !== 'SUPER_ADMIN') throw new BadRequestException('Not allowed');
    const password = String(body?.password ?? '');
    if (password.length < 6) throw new BadRequestException('Password must be at least 6 chars');
    const user = await this.prisma.userProfile.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Not found');

    const hash = await bcrypt.hash(password, 10);
    await this.prisma.localCredential.upsert({
      where: { userId: id },
      update: { passwordHash: hash },
      create: { userId: id, passwordHash: hash },
    });
    return { ok: true };
  }

  @Get(':id/strikes')
  async listStrikes(@Req() req: AuthedRequest, @Param('id') id: string) {
    const user = await this.prisma.userProfile.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Not found');

    const allowed = await this.allowedProvinceIds(req);
    if (allowed && user.primaryProvinceId && !allowed.includes(user.primaryProvinceId)) {
      throw new BadRequestException('Not allowed');
    }

    const now = new Date();
    const strikes = await this.prisma.userStrike.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const activeCount = await this.prisma.userStrike.count({
      where: { userId: id, expiresAt: { gt: now } },
    });

    return {
      activeCount,
      isBannedFromMain: user.isBannedFromMain,
      isPermanentlyBanned: (user as any).isPermanentlyBanned ?? false,
      strikes,
    };
  }

  @Post(':id/strikes')
  async addStrike(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: any) {
    const user = await this.prisma.userProfile.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Not found');

    const allowed = await this.allowedProvinceIds(req);
    if (allowed && user.primaryProvinceId && !allowed.includes(user.primaryProvinceId)) {
      throw new BadRequestException('Not allowed');
    }

    const note = body?.note ? String(body.note) : null;
    const now = new Date();
    const expiresAt = this.addMonths(now, 2);

    await this.prisma.userStrike.create({
      data: {
        userId: id,
        createdByUserId: req.user.id,
        note,
        expiresAt,
      },
    });

    const activeCount = await this.prisma.userStrike.count({
      where: { userId: id, expiresAt: { gt: now } },
    });

    // Auto-ban at 2 active strikes unless permanently banned (already banned).
    if (activeCount >= 2 && !(user as any).isPermanentlyBanned) {
      await this.prisma.userProfile.update({
        where: { id },
        data: { isBannedFromMain: true },
      });
    }

    return { ok: true, activeCount };
  }

  @Post(':id/unban-reset')
  async unbanAndReset(@Req() req: AuthedRequest, @Param('id') id: string) {
    const user = await this.prisma.userProfile.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Not found');

    // Only SUPER_ADMIN can unban/reset.
    if (req.user.role !== 'SUPER_ADMIN') throw new BadRequestException('Not allowed');

    await this.prisma.userStrike.deleteMany({ where: { userId: id } });
    await this.prisma.userProfile.update({
      where: { id },
      data: { isBannedFromMain: false, isPermanentlyBanned: false },
    });

    return { ok: true };
  }

  @Post(':id/ban-permanent')
  async banPermanent(@Req() req: AuthedRequest, @Param('id') id: string) {
    if (req.user.role !== 'SUPER_ADMIN') throw new BadRequestException('Not allowed');
    const user = await this.prisma.userProfile.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Not found');

    await this.prisma.userProfile.update({
      where: { id },
      data: { isBannedFromMain: true, isPermanentlyBanned: true },
    });
    return { ok: true };
  }

  @Get(':id/points')
  async points(@Req() req: AuthedRequest, @Param('id') id: string) {
    const user = await this.prisma.userProfile.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Not found');

    const allowed = await this.allowedProvinceIds(req);
    if (allowed && user.primaryProvinceId && !allowed.includes(user.primaryProvinceId)) {
      throw new BadRequestException('Not allowed');
    }

    const tx = await this.prisma.pointTransaction.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { createdBy: { select: { id: true, email: true, displayName: true } } },
    });

    return {
      pointsBalance: user.pointsBalance,
      transactions: tx.map((t) => ({
        id: t.id,
        delta: t.delta,
        reason: t.reason,
        createdAt: t.createdAt,
        createdBy: t.createdBy
          ? { id: t.createdBy.id, email: t.createdBy.email, displayName: t.createdBy.displayName }
          : null,
      })),
    };
  }

  @Post(':id/points')
  async addPoints(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: any) {
    const user = await this.prisma.userProfile.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Not found');

    const allowed = await this.allowedProvinceIds(req);
    if (allowed && user.primaryProvinceId && !allowed.includes(user.primaryProvinceId)) {
      throw new BadRequestException('Not allowed');
    }

    const delta = Number(body?.delta);
    const reason = String(body?.reason ?? '').trim();
    if (!Number.isInteger(delta) || delta === 0) throw new BadRequestException('delta must be a non-zero integer');
    if (Math.abs(delta) > 10000) throw new BadRequestException('delta too large');
    if (!reason) throw new BadRequestException('reason is required');

    return this.prisma.$transaction(async (tx) => {
      const fresh = await tx.userProfile.findUnique({ where: { id }, select: { pointsBalance: true } });
      if (!fresh) throw new NotFoundException('Not found');
      const next = fresh.pointsBalance + delta;
      if (next < 0) throw new BadRequestException('pointsBalance cannot go below 0');

      await tx.userProfile.update({ where: { id }, data: { pointsBalance: next } });
      await tx.pointTransaction.create({
        data: { userId: id, delta, reason, createdByUserId: req.user.id },
      });
      return { ok: true, pointsBalance: next };
    });
  }

  @Post(':id/points/reset')
  async resetPoints(@Req() req: AuthedRequest, @Param('id') id: string) {
    if (req.user.role !== 'SUPER_ADMIN') throw new BadRequestException('Not allowed');
    const user = await this.prisma.userProfile.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Not found');

    return this.prisma.$transaction(async (tx) => {
      const fresh = await tx.userProfile.findUnique({ where: { id }, select: { pointsBalance: true } });
      if (!fresh) throw new NotFoundException('Not found');
      const current = fresh.pointsBalance;
      if (current !== 0) {
        await tx.pointTransaction.create({
          data: {
            userId: id,
            delta: -current,
            reason: 'Reset de puntos por admin',
            createdByUserId: req.user.id,
          },
        });
      }
      await tx.userProfile.update({ where: { id }, data: { pointsBalance: 0 } });
      return { ok: true, pointsBalance: 0 };
    });
  }
}
