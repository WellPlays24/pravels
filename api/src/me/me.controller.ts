import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
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
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

class UpdateMeProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  nickname?: string;

  @IsOptional()
  @IsIn(['FULL_NAME', 'NICKNAME'])
  displayNamePreference?: 'FULL_NAME' | 'NICKNAME';
}

@Controller('me')
@RequireAuth('SUPER_ADMIN', 'PROVINCE_ADMIN', 'MEMBER')
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('profile')
  async myProfile(@Req() req: AuthedRequest) {
    const user = await this.prisma.userProfile.findUnique({ where: { id: req.user.id } });
    if (!user) throw new Error('User not found');
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      displayName: user.displayName,
      nickname: (user as any).nickname ?? null,
      displayNamePreference: (user as any).displayNamePreference ?? 'FULL_NAME',
      displayLabel: (req.user as any).displayLabel,
      profilePhotoUrl: (user as any).profilePhotoUrl ?? null,
    };
  }

  @Patch('profile')
  async updateProfile(@Req() req: AuthedRequest, @Body() dto: UpdateMeProfileDto) {
    const nextPref = dto.displayNamePreference;
    const nextNick = dto.nickname != null ? String(dto.nickname).trim() : undefined;
    if (nextPref === 'NICKNAME' && (nextNick == null || nextNick.length === 0)) {
      throw new BadRequestException('nickname is required when displayNamePreference=NICKNAME');
    }

    await this.prisma.userProfile.update({
      where: { id: req.user.id },
      data: {
        nickname: nextNick === undefined ? undefined : nextNick ? nextNick : null,
        displayNamePreference: nextPref,
      } as any,
    });

    return { ok: true };
  }

  @Post('profile-photo')
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
          const userId = String((req as any).user?.id ?? 'user');
          cb(null, `${userId}-${randomUUID()}${safeExt}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ok =
          file.mimetype === 'image/jpeg' ||
          file.mimetype === 'image/png' ||
          file.mimetype === 'image/webp';
        cb(ok ? null : new Error('Only JPG/PNG/WEBP allowed'), ok);
      },
    }),
  )
  async uploadProfilePhoto(@Req() req: AuthedRequest, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('file is required');
    const url = `/files/profile-photos/${encodeURIComponent(file.filename)}`;
    await this.prisma.userProfile.update({
      where: { id: req.user.id },
      data: { profilePhotoUrl: url } as any,
    });
    return { profilePhotoUrl: url };
  }

  @Get('whatsapp-groups')
  async myWhatsappGroups(@Req() req: AuthedRequest) {
    const main = await this.prisma.whatsappGroup.findFirst({
      where: { kind: 'MAIN', isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    // Super admin can see all joinable groups.
    if (req.user.role === 'SUPER_ADMIN') {
      const joinable = await this.prisma.whatsappGroup.findMany({
        where: { kind: { not: 'MAIN' }, isActive: true },
        include: { province: true },
        orderBy: [{ kind: 'asc' }, { name: 'asc' }],
      });

      return {
        main: main ? { id: main.id, name: main.name, banned: false, note: 'Admin agrega manualmente al grupo principal.' } : null,
        joinable,
      };
    }

    const user = await this.prisma.userProfile.findUnique({ where: { id: req.user.id } });
    if (!user) throw new Error('User not found');

    // Province access: explicit member provinces, fallback to primaryProvinceId.
    const memberProvinces = await this.prisma.memberProvince.findMany({
      where: { userId: user.id },
      select: { provinceId: true },
    });
    const provinceIds = memberProvinces.length
      ? memberProvinces.map((p) => p.provinceId)
      : user.primaryProvinceId
        ? [user.primaryProvinceId]
        : [];

    const granted = await this.prisma.groupAccess.findMany({
      where: { userId: user.id },
      select: { groupId: true },
    });
    const grantedIds = granted.map((g) => g.groupId);

    const joinable = await this.prisma.whatsappGroup.findMany({
      where: {
        kind: { not: 'MAIN' },
        isActive: true,
        OR: [
          { provinceId: { in: provinceIds.length ? provinceIds : [-1] } },
          { id: { in: grantedIds.length ? grantedIds : ['00000000-0000-0000-0000-000000000000'] } },
        ],
      },
      include: { province: true },
      orderBy: [{ kind: 'asc' }, { name: 'asc' }],
    });

    return {
      main: main
        ? {
            id: main.id,
            name: main.name,
            banned: user.isBannedFromMain,
            note: user.isBannedFromMain
              ? 'Estas baneado del grupo principal.'
              : 'El admin te agrega manualmente al grupo principal (no hay link publico).',
          }
        : null,
      joinable,
    };
  }

  @Get('whatsapp-groups/catalog')
  async groupCatalog(@Req() req: AuthedRequest) {
    const user = await this.prisma.userProfile.findUnique({ where: { id: req.user.id } });
    if (!user) throw new Error('User not found');

    // Get current joinable list using the same logic.
    const main = await this.prisma.whatsappGroup.findFirst({
      where: { kind: 'MAIN', isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    const memberProvinces = await this.prisma.memberProvince.findMany({
      where: { userId: user.id },
      select: { provinceId: true },
    });
    const provinceIds = memberProvinces.length
      ? memberProvinces.map((p) => p.provinceId)
      : user.primaryProvinceId
        ? [user.primaryProvinceId]
        : [];

    const granted = await this.prisma.groupAccess.findMany({
      where: { userId: user.id },
      select: { groupId: true },
    });
    const grantedIds = new Set(granted.map((g) => g.groupId));

    const provinceGroups = await this.prisma.whatsappGroup.findMany({
      where: {
        kind: { not: 'MAIN' },
        isActive: true,
        provinceId: { in: provinceIds.length ? provinceIds : [-1] },
      },
      select: { id: true },
    });
    const joinableIds = new Set([...provinceGroups.map((g) => g.id), ...Array.from(grantedIds)]);

    const pending = await this.prisma.whatsappGroupJoinRequest.findMany({
      where: { userId: user.id, status: 'PENDING' },
      select: { groupId: true },
    });
    const pendingIds = new Set(pending.map((p: { groupId: string }) => p.groupId));

    const all = await this.prisma.whatsappGroup.findMany({
      where: { isActive: true, kind: { not: 'MAIN' } },
      include: { province: true },
      orderBy: [{ kind: 'asc' }, { name: 'asc' }],
    });

    return {
      main: main
        ? {
            id: main.id,
            name: main.name,
            banned: user.isBannedFromMain,
            note: user.isBannedFromMain
              ? 'Estas baneado del grupo principal.'
              : 'El admin te agrega manualmente al grupo principal (no hay link publico).',
          }
        : null,
      groups: all.map((g) => {
        const allowed = joinableIds.has(g.id);
        const requested = pendingIds.has(g.id);
        return {
          id: g.id,
          kind: g.kind,
          name: g.name,
          province: g.province,
          status: allowed ? 'ALLOWED' : requested ? 'REQUESTED' : 'AVAILABLE',
          url: allowed ? g.url : null,
        };
      }),
    };
  }

  @Post('whatsapp-groups/:groupId/request')
  async requestGroup(@Req() req: AuthedRequest, @Param('groupId') groupId: string) {
    const group = await this.prisma.whatsappGroup.findUnique({ where: { id: groupId } });
    if (!group || !group.isActive) throw new NotFoundException('Group not found');
    if (group.kind === 'MAIN') throw new BadRequestException('MAIN group is managed manually');

    // If the group is already available by province membership, no request needed.
    if (group.provinceId) {
      const user = await this.prisma.userProfile.findUnique({ where: { id: req.user.id } });
      if (user) {
        const memberProvinces = await this.prisma.memberProvince.findMany({
          where: { userId: user.id },
          select: { provinceId: true },
        });
        const provinceIds = memberProvinces.length
          ? memberProvinces.map((p) => p.provinceId)
          : user.primaryProvinceId
            ? [user.primaryProvinceId]
            : [];
        if (provinceIds.includes(group.provinceId)) return { ok: true };
      }
    }

    const existingAccess = await this.prisma.groupAccess.findUnique({
      where: { userId_groupId: { userId: req.user.id, groupId } },
    });
    if (existingAccess) return { ok: true };

    const existing = await this.prisma.whatsappGroupJoinRequest.findUnique({
      where: { userId_groupId: { userId: req.user.id, groupId } },
    });
    if (existing) {
      if (existing.status === 'PENDING') return existing;
      if (existing.status === 'APPROVED') return { ok: true };
      // REJECTED -> allow re-request
      return this.prisma.whatsappGroupJoinRequest.update({
        where: { id: existing.id },
        data: { status: 'PENDING', reviewedAt: null, reviewedByUserId: null, reviewNote: null },
      });
    }

    return this.prisma.whatsappGroupJoinRequest.create({
      data: { userId: req.user.id, groupId, status: 'PENDING' },
    });
  }
}
