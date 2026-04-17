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
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequireAuth } from '../auth/auth.guard';
import type { AuthedRequest } from '../auth/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import path from 'node:path';
import { Prisma } from '@prisma/client';
import { randomBytes, randomUUID } from 'node:crypto';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import * as bcrypt from 'bcrypt';
import PDFDocument from 'pdfkit';
import type { Response } from 'express';
import { access } from 'node:fs/promises';
import { drawReportHeader, REPORT_THEME } from '../reports/pdf-theme';
import { findAdminRecipientIds } from '../notifications/notifications.util';

class UpdateMeProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsIn(['FULL_NAME', 'NICKNAME'])
  displayNamePreference?: 'FULL_NAME' | 'NICKNAME';
}

class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  currentPassword!: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;
}

@Controller('me')
@RequireAuth('SUPER_ADMIN', 'PROVINCE_ADMIN', 'MEMBER')
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  private makeRedeemCode() {
    const hex = randomBytes(6).toString('hex').toUpperCase();
    return `PRV-${hex}`;
  }

  @Get('profile')
  async myProfile(@Req() req: AuthedRequest) {
    const user = await this.prisma.userProfile.findUnique({ where: { id: req.user.id } });
    if (!user) throw new Error('User not found');
    const now = new Date();
    const activeStrikes = await this.prisma.userStrike.count({
      where: { userId: user.id, expiresAt: { gt: now } },
    });
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      phone: user.phone ?? null,
      displayName: user.displayName,
      nickname: (user as any).nickname ?? null,
      displayNamePreference: (user as any).displayNamePreference ?? 'FULL_NAME',
      displayLabel: (req.user as any).displayLabel,
      profilePhotoUrl: (user as any).profilePhotoUrl ?? null,
      pointsBalance: user.pointsBalance,
      activeStrikes,
      isBannedFromMain: user.isBannedFromMain,
      isPermanentlyBanned: (user as any).isPermanentlyBanned ?? false,
    };
  }

  @Patch('profile')
  async updateProfile(@Req() req: AuthedRequest, @Body() dto: UpdateMeProfileDto) {
    const nextPref = dto.displayNamePreference;
    const nextNick = dto.nickname != null ? String(dto.nickname).trim() : undefined;
    const nextPhone = dto.phone != null ? String(dto.phone).trim() : undefined;
    if (nextPref === 'NICKNAME' && (nextNick == null || nextNick.length === 0)) {
      throw new BadRequestException('nickname is required when displayNamePreference=NICKNAME');
    }

    await this.prisma.userProfile.update({
      where: { id: req.user.id },
      data: {
        nickname: nextNick === undefined ? undefined : nextNick ? nextNick : null,
        displayNamePreference: nextPref,
        phone: nextPhone === undefined ? undefined : nextPhone ? nextPhone : null,
      } as any,
    });

    return { ok: true };
  }

  private toWhatsappUrl(phone: string) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return null;
    if (digits.startsWith('593')) return `https://wa.me/${digits}`;
    if (digits.startsWith('0')) return `https://wa.me/593${digits.slice(1)}`;
    return `https://wa.me/593${digits}`;
  }

  @Get('birthdays')
  async birthdays(
    @Req() req: AuthedRequest,
    @Query('mode') modeRaw?: string,
    @Query('date') dateRaw?: string,
    @Query('year') yearRaw?: string,
    @Query('month') monthRaw?: string,
  ) {
    const mode = modeRaw === 'month' ? 'month' : 'day';

    let year = yearRaw ? Number(yearRaw) : undefined;
    let month = monthRaw ? Number(monthRaw) : undefined;
    let day = 1;

    if (mode === 'day') {
      const d = dateRaw ? new Date(String(dateRaw)) : new Date();
      if (!Number.isFinite(d.getTime())) throw new BadRequestException('Invalid date');
      year = d.getFullYear();
      month = d.getMonth() + 1;
      day = d.getDate();
    } else {
      const now = new Date();
      if (!year || Number.isNaN(year)) year = now.getFullYear();
      if (!month || Number.isNaN(month) || month < 1 || month > 12) month = now.getMonth() + 1;
    }

    const users = await this.prisma.userProfile.findMany({
      where: {
        status: 'APPROVED',
        birthDate: { not: null },
      },
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
        nickname: true,
        displayNamePreference: true,
        profilePhotoUrl: true,
        primaryProvinceId: true,
        primaryCantonId: true,
        birthDate: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 5000,
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

    function label(u: any) {
      return u.displayNamePreference === 'NICKNAME' && u.nickname?.trim()
        ? u.nickname.trim()
        : u.displayName?.trim()
          ? u.displayName.trim()
          : u.email;
    }

    const out = users
      .filter((u) => {
        const bd = u.birthDate as Date;
        const m = bd.getUTCMonth() + 1;
        const d = bd.getUTCDate();
        if (m !== month) return false;
        if (mode === 'day' && d !== day) return false;
        return true;
      })
      .map((u) => {
        const bd = u.birthDate as Date;
        const m = bd.getUTCMonth() + 1;
        const d = bd.getUTCDate();
        const bornYear = bd.getUTCFullYear();
        const age = year ? Math.max(0, year - bornYear) : null;
        return {
          id: u.id,
          role: u.role,
          displayLabel: label(u),
          email: u.email,
          profilePhotoUrl: u.profilePhotoUrl,
          province: u.primaryProvinceId ? provinceById.get(u.primaryProvinceId) ?? null : null,
          canton: u.primaryCantonId ? cantonById.get(u.primaryCantonId) ?? null : null,
          day: d,
          month: m,
          age,
        };
      })
      .sort((a, b) => (a.day !== b.day ? a.day - b.day : a.displayLabel.localeCompare(b.displayLabel)));

    return {
      mode,
      year,
      month,
      day: mode === 'day' ? day : null,
      items: out,
    };
  }

  @Get('notifications/unread-count')
  async notificationUnreadCount(@Req() req: AuthedRequest) {
    const count = await this.prisma.notification.count({ where: { userId: req.user.id, readAt: null } });
    return { count };
  }

  @Get('notifications')
  async notifications(
    @Req() req: AuthedRequest,
    @Query('filter') filterRaw?: string,
    @Query('cursor') cursorRaw?: string,
    @Query('take') takeRaw?: string,
  ) {
    const take = takeRaw ? Math.max(1, Math.min(50, Number(takeRaw) || 20)) : 20;
    const filter = filterRaw === 'unread' ? 'unread' : 'all';
    const cursor = cursorRaw ? String(cursorRaw) : null;

    const where: any = { userId: req.user.id };
    if (filter === 'unread') where.readAt = null;

    const items = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = items.length > take;
    const page = hasMore ? items.slice(0, take) : items;
    const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;
    return { items: page, nextCursor };
  }

  @Post('notifications/:id/read')
  async markNotificationRead(@Req() req: AuthedRequest, @Param('id') id: string) {
    const n = await this.prisma.notification.findUnique({ where: { id } });
    if (!n || n.userId !== req.user.id) throw new NotFoundException('Not found');
    if (n.readAt) return { ok: true };
    await this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
    return { ok: true };
  }

  @Post('notifications/read-all')
  async markAllNotificationsRead(@Req() req: AuthedRequest) {
    await this.prisma.notification.updateMany({
      where: { userId: req.user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  @Post('birthday-greetings')
  async sendBirthdayGreeting(@Req() req: AuthedRequest, @Body() body: any) {
    const toUserId = String(body?.toUserId ?? '').trim();
    const message = String(body?.message ?? '').trim();
    if (!toUserId) throw new BadRequestException('toUserId is required');
    if (!message) throw new BadRequestException('message is required');
    if (message.length > 1000) throw new BadRequestException('message is too long');

    const target = await this.prisma.userProfile.findUnique({ where: { id: toUserId } });
    if (!target || target.status !== 'APPROVED') throw new NotFoundException('User not found');
    if (!target.birthDate) throw new BadRequestException('User has no birthDate');

    // Only allow greetings on the recipient's birthday day (Ecuador time).
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Guayaquil',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const todayMonth = Number(parts.find((p) => p.type === 'month')?.value);
    const todayDay = Number(parts.find((p) => p.type === 'day')?.value);

    const bdMonth = (target.birthDate as Date).getUTCMonth() + 1;
    const bdDay = (target.birthDate as Date).getUTCDate();
    if (todayMonth !== bdMonth || todayDay !== bdDay) {
      throw new BadRequestException('Solo puedes felicitar el dia del cumpleaños');
    }

    const me = await this.prisma.userProfile.findUnique({ where: { id: req.user.id } });
    const senderLabel = me?.displayNamePreference === 'NICKNAME' && me.nickname?.trim()
      ? me.nickname.trim()
      : me?.displayName?.trim()
        ? me.displayName.trim()
        : me?.email ?? 'Un miembro';

    await this.prisma.notification.create({
      data: {
        userId: target.id,
        actorUserId: req.user.id,
        type: 'BIRTHDAY_GREETING',
        title: 'Felicidades por tu cumpleaños',
        body: `${senderLabel}: ${message}`,
        data: { fromUserId: req.user.id },
      },
    });

    return { ok: true };
  }

  @Get('layots/summary')
  async layotsSummary(@Req() req: AuthedRequest) {
    const me = await this.prisma.userProfile.findUnique({ where: { id: req.user.id } });
    if (!me) throw new Error('User not found');

    const top = await this.prisma.userProfile.findMany({
      where: { status: 'APPROVED' },
      select: {
        id: true,
        email: true,
        displayName: true,
        nickname: true,
        displayNamePreference: true,
        profilePhotoUrl: true,
        pointsBalance: true,
        primaryProvinceId: true,
        primaryCantonId: true,
      },
      orderBy: [{ pointsBalance: 'desc' }, { createdAt: 'asc' }],
      take: 10,
    });

    const provinceIds = Array.from(new Set(top.map((u) => u.primaryProvinceId).filter((x): x is number => typeof x === 'number')));
    const cantonIds = Array.from(new Set(top.map((u) => u.primaryCantonId).filter((x): x is number => typeof x === 'number')));
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
    const label = (u: any) =>
      u.displayNamePreference === 'NICKNAME' && u.nickname?.trim()
        ? u.nickname.trim()
        : u.displayName?.trim()
          ? u.displayName.trim()
          : u.email;

    const rules = await this.prisma.pointRule.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const rewards = await this.prisma.rewardItem.findMany({
      where: { isActive: true },
      orderBy: { pointsCost: 'asc' },
    });

    const myPendingClaims = await this.prisma.rewardClaim.findMany({
      where: { userId: me.id, status: 'PENDING' },
      select: { rewardId: true },
    });
    const pendingIds = new Set(myPendingClaims.map((c) => c.rewardId));

    return {
      my: { pointsBalance: me.pointsBalance },
      top: top.map((u) => ({
        id: u.id,
        displayLabel: label(u),
        profilePhotoUrl: u.profilePhotoUrl,
        pointsBalance: u.pointsBalance,
        province: u.primaryProvinceId ? provinceById.get(u.primaryProvinceId) ?? null : null,
        canton: u.primaryCantonId ? cantonById.get(u.primaryCantonId) ?? null : null,
      })),
      rules: rules.map((r) => ({ id: r.id, title: r.title, description: r.description, points: r.points })),
      rewards: rewards.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        pointsCost: r.pointsCost,
        stock: r.stock,
        canClaim: me.pointsBalance >= r.pointsCost && !pendingIds.has(r.id) && (r.stock == null || r.stock > 0),
        isPending: pendingIds.has(r.id),
      })),
    };
  }

  @Get('reward-claims')
  async myRewardClaims(@Req() req: AuthedRequest) {
    // Backfill missing redeemCode for already-approved claims.
    await this.prisma.$transaction(async (tx) => {
      const missing = await tx.rewardClaim.findMany({
        where: { userId: req.user.id, status: 'APPROVED', redeemCode: null },
        select: { id: true, reward: { select: { grantsFreeTrip: true } } },
        take: 50,
      });
      for (const c of missing) {
        if (!c.reward.grantsFreeTrip) continue;
        for (let i = 0; i < 5; i++) {
          const next = this.makeRedeemCode();
          try {
            await tx.rewardClaim.update({ where: { id: c.id }, data: { redeemCode: next } });
            break;
          } catch (e: any) {
            const isUnique = e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
            if (!isUnique) throw e;
          }
        }
      }
    });

    return this.prisma.rewardClaim.findMany({
      where: { userId: req.user.id },
      include: { reward: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  @Post('reward-claims')
  async createRewardClaim(@Req() req: AuthedRequest, @Body() body: any) {
    const rewardId = String(body?.rewardId ?? '').trim();
    if (!rewardId) throw new BadRequestException('rewardId is required');

    const me = await this.prisma.userProfile.findUnique({ where: { id: req.user.id } });
    if (!me) throw new Error('User not found');

    const reward = await this.prisma.rewardItem.findUnique({ where: { id: rewardId } });
    if (!reward || !reward.isActive) throw new NotFoundException('Reward not found');
    if (reward.stock != null && reward.stock <= 0) throw new BadRequestException('Reward out of stock');
    if (me.pointsBalance < reward.pointsCost) throw new BadRequestException('Insufficient points');

    const existing = await this.prisma.rewardClaim.findFirst({
      where: { userId: me.id, rewardId, status: 'PENDING' },
    });
    if (existing) return existing;

    const created = await this.prisma.rewardClaim.create({
      data: {
        userId: me.id,
        rewardId,
        status: 'PENDING',
        pointsCostAtClaim: reward.pointsCost,
      },
    });

    const adminIds = await this.prisma.userProfile.findMany({
      where: { role: 'SUPER_ADMIN', status: 'APPROVED' },
      select: { id: true },
    });
    if (adminIds.length) {
      await this.prisma.notification.createMany({
        data: adminIds.map((a) => ({
          userId: a.id,
          actorUserId: req.user.id,
          type: 'REWARD_CLAIM_PENDING',
          title: 'Nuevo reclamo de premio',
          body: `Un miembro hizo un reclamo de premio: ${reward.name}`,
          data: { claimId: created.id, rewardId: reward.id, href: '/admin/reward-claims' },
        })),
      });
    }

    return created;
  }

  @Get('reward-claims/:id/voucher.pdf')
  async rewardVoucherPdf(@Req() req: AuthedRequest, @Param('id') id: string, @Res() res: Response) {
    const claim = await this.prisma.rewardClaim.findUnique({
      where: { id },
      include: { reward: true, user: true },
    });
    if (!claim || claim.userId !== req.user.id) throw new NotFoundException('Not found');
    if (claim.status !== 'APPROVED' || !claim.redeemCode) throw new BadRequestException('Claim not approved');

    const settings = await this.prisma.generalSetting.findUnique({ where: { id: 'global' } });
    const communityName = settings?.communityName?.trim() || 'Pravels';

    let logoPath: string | null = null;
    if (settings?.logoUrl && settings.logoUrl.startsWith('/files/content/')) {
      const base = process.env.PRAVELS_CONTENT_DIR;
      const filenamePart = settings.logoUrl.split('/').pop() || '';
      const decoded = decodeURIComponent(filenamePart);
      if (base && decoded) {
        const candidate = path.join(base, decoded);
        try {
          await access(candidate);
          const ext = path.extname(candidate).toLowerCase();
          if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') logoPath = candidate;
        } catch {
          // ignore
        }
      }
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="voucher-${claim.redeemCode}.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);

    const margin = 50;
    const header = drawReportHeader(doc, {
      communityName,
      title: 'Voucher de premio',
      logoPath,
      margin,
    });

    doc.y = header.headerHeight + 18;

    const fmt = new Intl.DateTimeFormat('es-EC', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const pageW = doc.page.width;
    const contentW = pageW - margin * 2;

    doc.fillColor(REPORT_THEME.ink);
    doc.fontSize(18).text(claim.reward.name, margin, doc.y, { width: contentW });
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor(REPORT_THEME.muted);
    doc.text(`Miembro: ${claim.user.displayName?.trim() || claim.user.email}`, margin, doc.y, { width: contentW });
    doc.text(`Email: ${claim.user.email}`, margin, doc.y, { width: contentW });
    doc.text(`Emitido: ${fmt.format(claim.reviewedAt ?? claim.createdAt)}`, margin, doc.y, { width: contentW });
    doc.fillColor(REPORT_THEME.ink);
    doc.moveDown(1);

    // Code card
    const y = doc.y;
    doc.save();
    doc.roundedRect(margin, y, contentW, 90, 14).fill('#fff7ed');
    doc.restore();
    doc.fillColor('#9a3412').fontSize(11).text('Codigo unico', margin + 16, y + 14);
    doc.fillColor('#111827').fontSize(26).text(claim.redeemCode, margin + 16, y + 34, { width: contentW - 32 });
    doc.fillColor('#6b7280').fontSize(9).text(`ID: ${claim.id}`, margin + 16, y + 68, { width: contentW - 32 });
    doc.y = y + 110;

    if (claim.redeemedAt) {
      doc.save();
      doc.roundedRect(margin, doc.y, contentW, 44, 12).fill('#f3f4f6');
      doc.restore();
      doc.fillColor('#111827').fontSize(11).text('Estado: USADO', margin + 14, doc.y + 12);
      doc.fillColor('#6b7280').fontSize(9).text(`Usado: ${fmt.format(claim.redeemedAt)}  Viaje: ${claim.redeemedTripId ?? '-'}`, margin + 14, doc.y + 26);
      doc.fillColor('#000000');
      doc.y += 60;
    } else {
      doc.save();
      doc.roundedRect(margin, doc.y, contentW, 44, 12).fill('#ecfdf5');
      doc.restore();
      doc.fillColor('#065f46').fontSize(11).text('Estado: DISPONIBLE', margin + 14, doc.y + 12);
      doc.fillColor('#047857').fontSize(9).text('Este voucher puede ser verificado por un admin usando el codigo o el ID.', margin + 14, doc.y + 26, { width: contentW - 28 });
      doc.fillColor('#000000');
      doc.y += 60;
    }

    if (claim.reward.description?.trim()) {
      doc.fillColor(REPORT_THEME.ink).fontSize(12).text('Descripcion', margin, doc.y);
      doc.moveDown(0.3);
      doc.fillColor(REPORT_THEME.muted).fontSize(10).text(claim.reward.description.trim(), margin, doc.y, { width: contentW });
      doc.fillColor('#000000');
    }

    doc.end();
  }

  @Post('password')
  async changePassword(@Req() req: AuthedRequest, @Body() dto: ChangePasswordDto) {
    const user = await this.prisma.userProfile.findUnique({
      where: { id: req.user.id },
      include: { localCredential: true },
    });
    if (!user?.localCredential) throw new BadRequestException('No local credentials for this user');

    const ok = await bcrypt.compare(String(dto.currentPassword), user.localCredential.passwordHash);
    if (!ok) throw new BadRequestException('Current password is incorrect');

    if (String(dto.newPassword) === String(dto.currentPassword)) {
      throw new BadRequestException('New password must be different');
    }

    const nextHash = await bcrypt.hash(String(dto.newPassword), 10);
    await this.prisma.localCredential.update({
      where: { userId: user.id },
      data: { passwordHash: nextHash },
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

    const created = await this.prisma.whatsappGroupJoinRequest.create({
      data: { userId: req.user.id, groupId, status: 'PENDING' },
    });

    const adminIds = await (async () => {
      // Notify SUPER_ADMIN + admins of the group's province (if any).
      const provinceId = group.provinceId ?? null;
      return findAdminRecipientIds(this.prisma, provinceId);
    })();

    if (adminIds.length) {
      await this.prisma.notification.createMany({
        data: adminIds.map((userId) => ({
          userId,
          actorUserId: req.user.id,
          type: 'GROUP_JOIN_PENDING',
          title: 'Nueva solicitud de grupo',
          body: `Solicitud para unirse al grupo: ${group.name}`,
          data: { requestId: created.id, groupId: group.id, href: '/admin/group-requests' },
        })),
      });
    }

    return created;
  }
}
