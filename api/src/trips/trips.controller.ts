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
import { randomUUID } from 'node:crypto';
import { findAdminRecipientIds } from '../notifications/notifications.util';
import type { Response } from 'express';
import PDFDocument from 'pdfkit';
import { access } from 'node:fs/promises';

@Controller('trips')
@RequireAuth('SUPER_ADMIN', 'PROVINCE_ADMIN', 'MEMBER')
export class TripsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Req() req: AuthedRequest, @Query('scope') scopeRaw: string | undefined) {
    const scope = scopeRaw === 'past' ? 'past' : 'upcoming';
    const now = new Date();

    const where =
      scope === 'past'
        ? { status: 'PUBLISHED' as const, endsAt: { lt: now } }
        : { status: 'PUBLISHED' as const, endsAt: { gte: now } };

    const trips = await this.prisma.trip.findMany({
      where,
      include: {
        province: true,
        canton: true,
        media: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { startsAt: scope === 'past' ? 'desc' : 'asc' },
    });

    const tripIds = trips.map((t) => t.id);
    const regs = tripIds.length
      ? await this.prisma.tripRegistration.findMany({
          where: { userId: req.user.id, tripId: { in: tripIds } },
          select: { tripId: true, status: true },
        })
      : [];
    const regByTrip = new Map(regs.map((r) => [r.tripId, r.status] as const));

    return trips.map((t) => ({
      ...t,
      myRegistrationStatus: regByTrip.get(t.id) ?? null,
    }));
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: {
        province: true,
        canton: true,
        media: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!trip || trip.status !== 'PUBLISHED') throw new NotFoundException('Not found');
    return trip;
  }

  @Get(':id/flyer.pdf')
  async flyerPdf(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Query('inline') inlineRaw: string | undefined,
    @Res() res: Response,
  ) {
    // Auth required (same as controller guard). Only published trips.
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: { province: true, canton: true, media: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!trip || trip.status !== 'PUBLISHED') throw new NotFoundException('Not found');

    const settings = await this.prisma.generalSetting.findUnique({ where: { id: 'global' } });
    const communityName = settings?.communityName?.trim() || 'Pravels';

    const safeTitle = String(trip.title || 'viaje')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
    const filename = `flyer-${safeTitle || trip.id}.pdf`;

    const inline = inlineRaw === '1' || inlineRaw === 'true';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${filename}"`);

    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    doc.pipe(res);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const margin = 36;
    const contentW = pageW - margin * 2;

    // Load logo if available.
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

    // Pick a hero image (prefer FLYER).
    const hero = trip.media.find((m) => m.kind === 'FLYER') ?? trip.media[0];
    let heroPath: string | null = null;
    if (hero?.url && hero.url.startsWith('/files/planes/')) {
      const base = process.env.PRAVELS_PLANES_DIR;
      const filenamePart = hero.url.split('/').pop() || '';
      const decoded = decodeURIComponent(filenamePart);
      if (base && decoded) {
        const candidate = path.join(base, decoded);
        try {
          await access(candidate);
          const ext = path.extname(candidate).toLowerCase();
          if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') heroPath = candidate;
        } catch {
          // ignore
        }
      }
    }

    const fmtDate = new Intl.DateTimeFormat('es-EC', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const fmtTime = new Intl.DateTimeFormat('es-EC', { hour: '2-digit', minute: '2-digit' });
    const startDate = fmtDate.format(trip.startsAt);
    const endDate = fmtDate.format(trip.endsAt);
    const startTime = fmtTime.format(trip.startsAt);
    const endTime = fmtTime.format(trip.endsAt);

    function clampLines(text: string, width: number, maxLines: number) {
      const cleaned = String(text ?? '').replace(/\s+/g, ' ').trim();
      if (!cleaned) return '';
      const split = (doc as any).splitTextToSize;
      const lines: string[] = typeof split === 'function' ? split.call(doc, cleaned, width) : [cleaned];
      if (lines.length <= maxLines) return cleaned;

      const out = lines.slice(0, maxLines);
      let last = String(out[out.length - 1] ?? '').trimEnd();
      while (last.length > 0 && doc.widthOfString(`${last}...`) > width) {
        last = last.slice(0, -1).trimEnd();
      }
      out[out.length - 1] = `${last}...`;
      return out.join('\n');
    }

    // Background
    doc.save();
    doc.rect(0, 0, pageW, pageH).fill('#fff7ed');
    doc.restore();

    // Hero block
    const heroH = 320;
    const heroY = 0;
    if (heroPath) {
      // Fit image into the hero area; keep it clean.
      doc.save();
      doc.rect(0, heroY, pageW, heroH).clip();
      doc.image(heroPath, 0, heroY, { fit: [pageW, heroH], align: 'center', valign: 'center' } as any);
      doc.restore();

      // Darken bottom a bit for text contrast.
      doc.save();
      (doc as any).fillOpacity?.(0.28);
      doc.rect(0, heroY + heroH - 110, pageW, 110).fill('#000000');
      (doc as any).fillOpacity?.(1);
      doc.restore();
    } else {
      // Fallback pattern.
      doc.save();
      doc.rect(0, 0, pageW, heroH).fill('#fb923c');
      doc.fillColor('#f59e0b');
      doc.circle(pageW - 90, 70, 120).fill();
      doc.fillColor('#fdba74');
      doc.circle(70, 70, 90).fill();
      doc.restore();
    }

    // Brand chip
    const chipY = 22;
    const chipX = margin;
    const chipH = 34;
    const chipW = Math.min(320, contentW);
    doc.save();
    doc.roundedRect(chipX, chipY, chipW, chipH, 12).fill('#111827');
    doc.restore();
    if (logoPath) {
      try {
        doc.image(logoPath, chipX + 10, chipY + 7, { width: 20, height: 20 } as any);
      } catch {
        // ignore
      }
    }
    doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold');
    doc.text(communityName, chipX + (logoPath ? 36 : 12), chipY + 10, { width: chipW - 16 });

    // Main title on hero
    const titleY = heroY + heroH - 96;
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(28);
    const titleText = clampLines(trip.title, contentW, 2);
    doc.text(titleText || trip.title, margin, titleY, { width: contentW });

    doc.fillColor('#ffffff').font('Helvetica').fontSize(12);
    doc.text(`${trip.province?.name ?? ''} - ${trip.canton?.name ?? ''}`, margin, titleY + 34, { width: contentW });

    // Details card
    const cardY = heroH - 12;
    const cardH = 250;
    doc.save();
    doc.roundedRect(margin, cardY, contentW, cardH, 18).fill('#ffffff');
    doc.restore();

    // Accent bar
    doc.save();
    doc.roundedRect(margin, cardY, contentW, 14, 18).fill('#fb923c');
    doc.restore();

    const innerX = margin + 18;
    let y = cardY + 26;
    const colGap = 16;
    const colW = (contentW - colGap) / 2;

    function labelValue(label: string, value: string, x: number, y0: number) {
      doc.fillColor('#6b7280').font('Helvetica').fontSize(10).text(label.toUpperCase(), x, y0);
      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(14).text(value, x, y0 + 14, { width: colW });
    }

    labelValue('Fecha', startDate === endDate ? startDate : `${startDate} - ${endDate}`, innerX, y);
    labelValue('Hora', `${startTime} - ${endTime}`, innerX + colW + colGap, y);
    y += 58;

    const cuota = trip.priceCents != null ? `$${(trip.priceCents / 100).toFixed(2)}` : 'Sin cuota';
    const cupos = trip.capacity != null ? String(trip.capacity) : 'Ilimitados';
    labelValue('Cuota', cuota, innerX, y);
    labelValue('Cupos', cupos, innerX + colW + colGap, y);
    y += 58;

    doc.fillColor('#6b7280').font('Helvetica').fontSize(10).text('DESCRIPCION', innerX, y);
    y += 16;
    doc.fillColor('#111827').font('Helvetica').fontSize(11);
    const desc = String(trip.description || '').trim();
    const descText = desc.length ? desc : 'Un plan para compartir, conocer y disfrutar.';
    const descClamped = clampLines(descText, contentW - 36, 4);
    doc.text(descClamped || descText, innerX, y, { width: contentW - 36 });

    // Footer CTA
    const footerY = pageH - 64;
    doc.save();
    doc.roundedRect(margin, footerY, contentW, 44, 16).fill('#111827');
    doc.restore();
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(12);
    doc.text('Inscríbete en la app y asegura tu cupo', margin, footerY + 14, { width: contentW, align: 'center' });

    doc.end();
  }

  @Get(':id/registration')
  async myRegistration(@Req() req: AuthedRequest, @Param('id') id: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip || trip.status !== 'PUBLISHED') throw new NotFoundException('Not found');

    const reg = await this.prisma.tripRegistration.findUnique({
      where: { tripId_userId: { tripId: id, userId: req.user.id } },
    });
    if (!reg) return null;

    return {
      id: reg.id,
      status: reg.status,
      amountCents: reg.amountCents,
      paymentProofUrl: reg.paymentProofUrl,
      rewardClaimId: reg.rewardClaimId,
      reviewedAt: reg.reviewedAt,
      reviewNote: reg.reviewNote,
      createdAt: reg.createdAt,
      updatedAt: reg.updatedAt,
    };
  }

  @Post(':id/register')
  @UseInterceptors(
    FileInterceptor('paymentProof', {
      storage: diskStorage({
        destination: (_req: any, _file: any, cb: any) => {
          const dir = process.env.PRAVELS_PAYMENTS_DIR;
          if (!dir) return cb(new Error('PRAVELS_PAYMENTS_DIR is not set'), dir as any);
          cb(null, dir);
        },
        filename: (_req: any, file: any, cb: any) => {
          const ext = path.extname(file.originalname || '').toLowerCase();
          const safeExt = ['.jpg', '.jpeg', '.png', '.pdf', '.webp'].includes(ext) ? ext : '.jpg';
          cb(null, `${randomUUID()}${safeExt}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ok =
          file.mimetype === 'image/jpeg' ||
          file.mimetype === 'image/png' ||
          file.mimetype === 'image/webp' ||
          file.mimetype === 'application/pdf';
        cb(ok ? null : new Error('Only JPG/PNG/WEBP/PDF allowed'), ok);
      },
    }),
  )
  async register(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @UploadedFile() paymentProof?: Express.Multer.File,
    @Body() _body?: any,
  ) {
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip || trip.status !== 'PUBLISHED') throw new NotFoundException('Not found');

    const now = new Date();
    if (trip.startsAt.getTime() < now.getTime()) {
      throw new BadRequestException('Trip already started');
    }

    if (trip.capacity) {
      const confirmed = await this.prisma.tripRegistration.count({
        where: { tripId: id, status: 'CONFIRMED' },
      });
      if (confirmed >= trip.capacity) throw new BadRequestException('No capacity');
    }

    if (!paymentProof) throw new BadRequestException('paymentProof is required');
    const proofUrl = `/files/payments/${encodeURIComponent(paymentProof.filename)}`;

    const existing = await this.prisma.tripRegistration.findFirst({
      where: { tripId: id, userId: req.user.id },
    });
    if (existing) {
      if (existing.status === 'CONFIRMED') return existing;
      const updated = await this.prisma.tripRegistration.update({
        where: { id: existing.id },
        data: { paymentProofUrl: proofUrl, amountCents: trip.priceCents ?? null, status: 'PENDING' },
      });

      const adminIds = await findAdminRecipientIds(this.prisma, trip.provinceId);
      if (adminIds.length) {
        await this.prisma.notification.createMany({
          data: adminIds.map((userId) => ({
            userId,
            actorUserId: req.user.id,
            type: 'TRIP_REGISTRATION_PENDING',
            title: 'Nueva inscripcion a viaje',
            body: `Hay una inscripcion pendiente para el viaje: ${trip.title}`,
            data: { tripId: trip.id, registrationId: updated.id, href: '/admin/registrations' },
          })),
        });
      }

      return updated;
    }

    const created = await this.prisma.tripRegistration.create({
      data: {
        tripId: id,
        userId: req.user.id,
        status: 'PENDING',
        amountCents: trip.priceCents ?? null,
        paymentProofUrl: proofUrl,
      },
    });

    const adminIds = await findAdminRecipientIds(this.prisma, trip.provinceId);
    if (adminIds.length) {
      await this.prisma.notification.createMany({
        data: adminIds.map((userId) => ({
          userId,
          actorUserId: req.user.id,
          type: 'TRIP_REGISTRATION_PENDING',
          title: 'Nueva inscripcion a viaje',
          body: `Hay una inscripcion pendiente para el viaje: ${trip.title}`,
          data: { tripId: trip.id, registrationId: created.id, href: '/admin/registrations' },
        })),
      });
    }

    return created;
  }

  @Post(':id/register-reward')
  async registerWithReward(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: any) {
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip || trip.status !== 'PUBLISHED') throw new NotFoundException('Not found');

    const now = new Date();
    if (trip.startsAt.getTime() < now.getTime()) {
      throw new BadRequestException('Trip already started');
    }

    if (trip.capacity) {
      const confirmed = await this.prisma.tripRegistration.count({
        where: { tripId: id, status: 'CONFIRMED' },
      });
      if (confirmed >= trip.capacity) throw new BadRequestException('No capacity');
    }

    const code = String(body?.code ?? '').trim().toUpperCase();
    if (!code) throw new BadRequestException('code is required');

    const claim = await this.prisma.rewardClaim.findFirst({
      where: {
        userId: req.user.id,
        status: 'APPROVED',
        redeemCode: code,
        redeemedAt: null,
      },
      include: { reward: true },
    });
    // Member UX: only tell "invalid/used". Misconfig should not surface here.
    if (!claim) throw new BadRequestException('Codigo invalido o ya fue usado');
    if (!claim.reward.grantsFreeTrip) throw new BadRequestException('Codigo invalido o ya fue usado');

    const adminIds = await findAdminRecipientIds(this.prisma, trip.provinceId);

    const reg = await this.prisma.$transaction(async (tx) => {
      // Mark claim as redeemed.
      await tx.rewardClaim.update({
        where: { id: claim.id },
        data: { redeemedAt: new Date(), redeemedTripId: trip.id },
      });

      const existing = await tx.tripRegistration.findFirst({
        where: { tripId: id, userId: req.user.id },
      });

      const data = {
        status: 'CONFIRMED' as const,
        amountCents: 0,
        paymentProofUrl: null,
        rewardClaimId: claim.id,
        reviewedAt: new Date(),
        reviewNote: `Viaje gratis por premio: ${claim.reward.name}`,
      };

      let saved: any;
      if (existing) {
        if (existing.status === 'CONFIRMED') return existing;
        saved = await tx.tripRegistration.update({ where: { id: existing.id }, data });
      } else {
        saved = await tx.tripRegistration.create({
          data: {
            tripId: id,
            userId: req.user.id,
            ...data,
          },
        });
      }

      // Notify member.
      await tx.notification.create({
        data: {
          userId: req.user.id,
          actorUserId: null,
          type: 'TRIP_REGISTRATION_APPROVED',
          title: 'Inscripcion confirmada',
          body: `Tu inscripcion al viaje "${trip.title}" fue confirmada usando tu premio de viaje gratis.`,
          data: { tripId: trip.id, href: `/trips/${trip.id}` },
        },
      });

      // Notify admins (FYI).
      if (adminIds.length) {
        await tx.notification.createMany({
          data: adminIds.map((userId) => ({
            userId,
            actorUserId: req.user.id,
            type: 'TRIP_REGISTRATION_PENDING',
            title: 'Viaje gratis usado',
            body: `Un miembro uso un premio de viaje gratis y quedo confirmado en: ${trip.title}`,
            data: { tripId: trip.id, registrationId: saved.id, href: '/admin/registrations' },
          })),
        });
      }

      return saved;
    });

    return reg;
  }
}
