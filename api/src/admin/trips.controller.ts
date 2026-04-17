import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RequireAuth } from '../auth/auth.guard';
import type { AuthedRequest } from '../auth/auth.guard';
import { AddTripMediaDto, CreateTripDto, UpdateTripDto, UploadTripMediaDto } from './trips.dto';
import type { Response } from 'express';
import PDFDocument from 'pdfkit';
import { access } from 'node:fs/promises';
import { drawReportHeader, REPORT_THEME } from '../reports/pdf-theme';

@Controller('admin/trips')
@RequireAuth('SUPER_ADMIN', 'PROVINCE_ADMIN')
export class AdminTripsController {
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

  @Get(':id/report.pdf')
  async reportPdf(@Req() req: AuthedRequest, @Param('id') id: string, @Res() res: Response) {
    const settings = await this.prisma.generalSetting.findUnique({ where: { id: 'global' } });
    const communityName = settings?.communityName?.trim() || 'Pravels';

    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: { province: true, canton: true, media: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!trip) throw new NotFoundException('Not found');

    if (req.user.role === 'PROVINCE_ADMIN') {
      const allowedIds = (await this.allowedProvinceIds(req)) ?? [];
      if (!allowedIds.includes(trip.provinceId)) throw new BadRequestException('Not allowed');
    }

    const regs = await this.prisma.tripRegistration.findMany({
      where: { tripId: id, status: 'CONFIRMED' },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });

    const safeTitle = String(trip.title || 'viaje')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
    const filename = `reporte-viaje-${safeTitle || trip.id}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const margin = 50;
    const contentW = pageW - margin * 2;

    function sectionHeader(label: string, bg: string, fg: string) {
      const y = doc.y;
      doc.save();
      doc.roundedRect(margin, y, contentW, 24, 8).fill(bg);
      doc.restore();
      doc.fillColor(fg).fontSize(12).text(label, margin + 10, y + 6, { width: contentW - 20 });
      doc.fillColor('#000000');
      doc.y = y + 34;
    }

    function cardText(text: string, bg: string) {
      const y = doc.y;
      const innerPadX = 12;
      const innerPadY = 10;
      const textW = contentW - innerPadX * 2;
      const textH = doc.heightOfString(text, { width: textW, align: 'left' });
      const cardH = textH + innerPadY * 2;
      doc.save();
      doc.roundedRect(margin, y, contentW, cardH, 10).fill(bg);
      doc.restore();
      doc.fillColor('#111827').fontSize(10).text(text, margin + innerPadX, y + innerPadY, {
        width: textW,
        align: 'left',
      });
      doc.fillColor('#000000');
      doc.y = y + cardH + 10;
    }

    // Optional logo on header (JPG/PNG from /files/content)
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
    // Header (orange/yellow, logo, community name)
    const header = drawReportHeader(doc, {
      communityName,
      title: 'Reporte de viaje',
      logoPath,
      margin,
    });

    const fmt = new Intl.DateTimeFormat('es-EC', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Body start below header
    doc.y = header.headerHeight + 16;

    const flyer = trip.media.find((m) => m.kind === 'FLYER') ?? trip.media[0];
    let flyerNote: string | null = null;
    let flyerPath: string | null = null;
    if (flyer?.url && flyer.url.startsWith('/files/planes/')) {
      const base = process.env.PRAVELS_PLANES_DIR;
      const filenamePart = flyer.url.split('/').pop() || '';
      const decoded = decodeURIComponent(filenamePart);
      if (base && decoded) {
        const candidate = path.join(base, decoded);
        try {
          await access(candidate);
          const ext = path.extname(candidate).toLowerCase();
          if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') {
            flyerPath = candidate;
          } else {
            flyerNote = `Flyer no incluido (formato ${ext || 'desconocido'}).`;
          }
        } catch {
          flyerNote = 'Flyer no encontrado en disco.';
        }
      }
    } else if (flyer?.url) {
      flyerNote = 'Flyer no incluido (URL externa o desconocida).';
    }

    // Title + key info (left) + flyer (right)
    const leftX = margin;
    const rightX = margin + 280;
    const topY = doc.y;
    const rightW = pageW - rightX - margin;

    doc.fontSize(16).fillColor('#111827').text(trip.title, leftX, topY, { width: 270 });
    doc.moveDown(0.2);
    doc.fontSize(10).fillColor('#374151');
    doc.text(`Estado: ${trip.status}`, leftX);
    doc.text(`Lugar: ${trip.province?.name ?? ''} - ${trip.canton?.name ?? ''}`, leftX);
    doc.text(`Inicio: ${fmt.format(trip.startsAt)}`, leftX);
    doc.text(`Fin: ${fmt.format(trip.endsAt)}`, leftX);
    doc.fillColor('#000000');

    if (flyerPath) {
      doc.save();
      doc.roundedRect(rightX, topY, rightW, 150, 12).clip();
      doc.image(flyerPath, rightX, topY, { fit: [rightW, 150], align: 'center', valign: 'center' });
      doc.restore();
      doc.roundedRect(rightX, topY, rightW, 150, 12).strokeColor('#e5e7eb').lineWidth(1).stroke();
    } else {
      doc.roundedRect(rightX, topY, rightW, 150, 12).fill('#f3f4f6');
      doc.fillColor('#6b7280').fontSize(10).text('Sin flyer', rightX, topY + 65, { width: rightW, align: 'center' });
      doc.fillColor('#000000');
    }

    doc.y = Math.max(doc.y, topY + 170);

    // Divider
    doc.save();
    doc.moveTo(margin, doc.y)
      .lineTo(pageW - margin, doc.y)
      .strokeColor(REPORT_THEME.border)
      .lineWidth(1)
      .stroke();
    doc.restore();
    doc.y += 16;

    if (flyerNote) {
      doc.fontSize(9).fillColor('#6b7280').text(flyerNote);
      doc.fillColor('#000000');
    }

    if (trip.description?.trim()) {
      sectionHeader('Resumen', REPORT_THEME.summaryBg, REPORT_THEME.summaryFg);
      cardText(trip.description.trim(), '#fff7ed');
    }

    sectionHeader(`Asistentes aprobados (${regs.length})`, REPORT_THEME.attendeesBg, REPORT_THEME.attendeesFg);

    // Simple table-like list
    const rowW = contentW;
    for (let i = 0; i < regs.length; i++) {
      const r = regs[i];
      const name = r.user.displayName?.trim() || r.user.email;
      const line = `${i + 1}. ${name}`;
      const email = r.user.email;

      if (doc.y > 760) doc.addPage();

      const y = doc.y;
      if (i % 2 === 0) {
        doc.save();
        doc.roundedRect(margin, y - 2, rowW, 20, 6).fill('#f9fafb');
        doc.restore();
      }
      doc.fontSize(10).fillColor('#111827').text(line, margin + 8, y, { width: rowW - 16 });
      doc.fontSize(9).fillColor('#6b7280').text(`<${email}>`, margin + 8, y + 11, { width: rowW - 16 });
      doc.fillColor('#000000');
      doc.y = y + 24;
    }

    // Footer
    doc.fontSize(8).fillColor('#6b7280').text(`Generado: ${fmt.format(new Date())}`, margin, pageH - margin + 10, {
      width: contentW,
      align: 'right',
    });
    doc.fillColor('#000000');

    doc.end();
  }

  @Get('registrations')
  async allRegistrations(
    @Req() req: AuthedRequest,
    @Query('status') statusRaw?: string,
    @Query('tripId') tripId?: string,
  ) {
    const status =
      statusRaw === 'CONFIRMED' || statusRaw === 'CANCELLED' || statusRaw === 'PENDING'
        ? statusRaw
        : 'PENDING';

    if (req.user.role === 'PROVINCE_ADMIN') {
      const provinceIds = (await this.allowedProvinceIds(req)) ?? [];

      return this.prisma.tripRegistration.findMany({
        where: {
          status,
          ...(tripId ? { tripId } : {}),
          trip: { provinceId: { in: provinceIds.length ? provinceIds : [-1] } },
        },
        include: {
          user: true,
          trip: { include: { province: true, canton: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prisma.tripRegistration.findMany({
      where: {
        status,
        ...(tripId ? { tripId } : {}),
      },
      include: {
        user: true,
        trip: { include: { province: true, canton: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get()
  async list(@Req() req: AuthedRequest) {
    if (req.user.role === 'PROVINCE_ADMIN') {
      const provinceIds = (await this.allowedProvinceIds(req)) ?? [];
      return this.prisma.trip.findMany({
        where: { provinceId: { in: provinceIds.length ? provinceIds : [-1] } },
        include: { province: true, canton: true },
        orderBy: { startsAt: 'desc' },
      });
    }
    return this.prisma.trip.findMany({
      include: { province: true, canton: true },
      orderBy: { startsAt: 'desc' },
    });
  }

  @Get('cantons')
  async cantons(@Query('provinceId') provinceIdRaw: string) {
    const provinceId = Number(provinceIdRaw);
    if (!provinceId || Number.isNaN(provinceId)) throw new BadRequestException('provinceId is required');
    return this.prisma.canton.findMany({
      where: { provinceId },
      orderBy: { name: 'asc' },
    });
  }

  @Post()
  async create(@Req() req: AuthedRequest, @Body() dto: CreateTripDto) {
    if (req.user.role === 'PROVINCE_ADMIN') {
      const allowedIds = (await this.allowedProvinceIds(req)) ?? [];
      if (!allowedIds.includes(dto.provinceId)) throw new BadRequestException('Not allowed for this province');
    }

    return this.prisma.trip.create({
      data: {
        title: dto.title,
        description: dto.description,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        provinceId: dto.provinceId,
        cantonId: dto.cantonId,
        priceCents: dto.priceCents,
        capacity: dto.capacity,
        bankName: dto.bankName,
        bankAccountName: dto.bankAccountName,
        bankAccountNumber: dto.bankAccountNumber,
        bankAccountType: dto.bankAccountType,
        paymentInstructions: dto.paymentInstructions,
        createdByUserId: req.user.id,
      },
      include: { province: true, canton: true, media: true },
    });
  }

  @Get(':id')
  async get(@Req() req: AuthedRequest, @Param('id') id: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: { province: true, canton: true, media: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!trip) throw new NotFoundException('Not found');

    if (req.user.role === 'PROVINCE_ADMIN') {
      const allowedIds = (await this.allowedProvinceIds(req)) ?? [];
      if (!allowedIds.includes(trip.provinceId)) throw new BadRequestException('Not allowed');
    }

    return trip;
  }

  @Patch(':id')
  async update(@Req() req: AuthedRequest, @Param('id') id: string, @Body() dto: UpdateTripDto) {
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip) throw new NotFoundException('Not found');

    if (req.user.role === 'PROVINCE_ADMIN') {
      const allowedIds = (await this.allowedProvinceIds(req)) ?? [];
      if (!allowedIds.includes(trip.provinceId)) throw new BadRequestException('Not allowed');
    }

    // Prevent cross-province canton mismatch when both are provided.
    const nextProvinceId = dto.provinceId ?? trip.provinceId;
    const nextCantonId = dto.cantonId ?? trip.cantonId;
    const canton = await this.prisma.canton.findUnique({ where: { id: nextCantonId } });
    if (!canton || canton.provinceId !== nextProvinceId) {
      throw new BadRequestException('cantonId must belong to provinceId');
    }

    const nextStartsAt = dto.startsAt ? new Date(dto.startsAt) : trip.startsAt;
    const nextEndsAt = dto.endsAt ? new Date(dto.endsAt) : trip.endsAt;
    if (nextEndsAt.getTime() < nextStartsAt.getTime()) throw new BadRequestException('endsAt must be >= startsAt');

    return this.prisma.trip.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        startsAt: dto.startsAt ? nextStartsAt : undefined,
        endsAt: dto.endsAt ? nextEndsAt : undefined,
        provinceId: dto.provinceId,
        cantonId: dto.cantonId,
        priceCents: dto.priceCents === undefined ? undefined : dto.priceCents,
        capacity: dto.capacity === undefined ? undefined : dto.capacity,
        bankName: dto.bankName === undefined ? undefined : dto.bankName,
        bankAccountName: dto.bankAccountName === undefined ? undefined : dto.bankAccountName,
        bankAccountNumber: dto.bankAccountNumber === undefined ? undefined : dto.bankAccountNumber,
        bankAccountType: dto.bankAccountType === undefined ? undefined : dto.bankAccountType,
        paymentInstructions: dto.paymentInstructions === undefined ? undefined : dto.paymentInstructions,
      },
      include: { province: true, canton: true, media: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  @Post(':id/media')
  async addMedia(@Req() req: AuthedRequest, @Param('id') id: string, @Body() dto: AddTripMediaDto) {
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip) throw new NotFoundException('Not found');
    if (req.user.role === 'PROVINCE_ADMIN') {
      const allowedIds = (await this.allowedProvinceIds(req)) ?? [];
      if (!allowedIds.includes(trip.provinceId)) throw new BadRequestException('Not allowed');
    }

    if (dto.kind !== 'FLYER' && dto.kind !== 'PHOTO') throw new BadRequestException('Invalid kind');
    return this.prisma.tripMedia.create({
      data: {
        tripId: trip.id,
        kind: dto.kind,
        url: dto.url,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  @Post(':id/media/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req: any, _file: any, cb: any) => {
          const dir = process.env.PRAVELS_PLANES_DIR;
          if (!dir) return cb(new Error('PRAVELS_PLANES_DIR is not set'), dir as any);
          cb(null, dir);
        },
        filename: (_req: any, file: any, cb: any) => {
          const ext = path.extname(file.originalname || '').toLowerCase();
          const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
          cb(null, `${randomUUID()}${safeExt}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ok =
          file.mimetype === 'image/jpeg' ||
          file.mimetype === 'image/png' ||
          file.mimetype === 'image/webp';
        cb(ok ? null : new Error('Only JPG/PNG/WEBP allowed'), ok);
      },
    }),
  )
  async uploadMedia(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() dto: UploadTripMediaDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip) throw new NotFoundException('Not found');
    if (req.user.role === 'PROVINCE_ADMIN') {
      const allowedIds = (await this.allowedProvinceIds(req)) ?? [];
      if (!allowedIds.includes(trip.provinceId)) throw new BadRequestException('Not allowed');
    }

    if (!file) throw new BadRequestException('file is required');
    if (dto.kind !== 'FLYER' && dto.kind !== 'PHOTO') throw new BadRequestException('Invalid kind');

    // Public URL served by Nest in dev
    const url = `/files/planes/${encodeURIComponent(file.filename)}`;

    return this.prisma.tripMedia.create({
      data: {
        tripId: trip.id,
        kind: dto.kind,
        url,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  @Delete(':id/media/:mediaId')
  async deleteMedia(@Req() req: AuthedRequest, @Param('id') id: string, @Param('mediaId') mediaId: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip) throw new NotFoundException('Not found');
    if (req.user.role === 'PROVINCE_ADMIN') {
      const allowedIds = (await this.allowedProvinceIds(req)) ?? [];
      if (!allowedIds.includes(trip.provinceId)) throw new BadRequestException('Not allowed');
    }

    const media = await this.prisma.tripMedia.findUnique({ where: { id: mediaId } });
    if (!media || media.tripId !== trip.id) throw new NotFoundException('Not found');
    await this.prisma.tripMedia.delete({ where: { id: mediaId } });
    return { ok: true };
  }

  @Post(':id/publish')
  async publish(@Req() req: AuthedRequest, @Param('id') id: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: { media: true },
    });
    if (!trip) throw new NotFoundException('Not found');

    if (req.user.role === 'PROVINCE_ADMIN') {
      const allowedIds = (await this.allowedProvinceIds(req)) ?? [];
      if (!allowedIds.includes(trip.provinceId)) throw new BadRequestException('Not allowed');
    }

    const now = new Date();
    const isPast = trip.endsAt.getTime() < now.getTime();

    if (isPast) {
      const photos = trip.media.filter((m) => m.kind === 'PHOTO');
      if (photos.length < 1) throw new BadRequestException('Past trips require at least 1 PHOTO');
    } else {
      const flyers = trip.media.filter((m) => m.kind === 'FLYER');
      if (flyers.length !== 1) throw new BadRequestException('Future trips require exactly 1 FLYER');
    }

    return this.prisma.trip.update({
      where: { id },
      data: { status: 'PUBLISHED' },
      include: { province: true, canton: true, media: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  @Post(':id/cancel')
  async cancel(@Req() req: AuthedRequest, @Param('id') id: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip) throw new NotFoundException('Not found');

    if (req.user.role === 'PROVINCE_ADMIN') {
      const allowedIds = (await this.allowedProvinceIds(req)) ?? [];
      if (!allowedIds.includes(trip.provinceId)) throw new BadRequestException('Not allowed');
    }

    return this.prisma.trip.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  @Get(':id/registrations')
  async registrations(@Req() req: AuthedRequest, @Param('id') id: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip) throw new NotFoundException('Not found');
    if (req.user.role === 'PROVINCE_ADMIN') {
      const allowedIds = (await this.allowedProvinceIds(req)) ?? [];
      if (!allowedIds.includes(trip.provinceId)) throw new BadRequestException('Not allowed');
    }

    return this.prisma.tripRegistration.findMany({
      where: { tripId: id },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('registrations/:registrationId/approve')
  async approveRegistration(@Req() req: AuthedRequest, @Param('registrationId') registrationId: string) {
    const reg = await this.prisma.tripRegistration.findUnique({
      where: { id: registrationId },
      include: { trip: true },
    });
    if (!reg) throw new NotFoundException('Not found');

    if (req.user.role === 'PROVINCE_ADMIN') {
      const allowedIds = (await this.allowedProvinceIds(req)) ?? [];
      if (!allowedIds.includes(reg.trip.provinceId)) throw new BadRequestException('Not allowed');
    }

    // Approve + award 1 point for attending a trip.
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.tripRegistration.update({
        where: { id: reg.id },
        data: {
          status: 'CONFIRMED',
          reviewedAt: new Date(),
          reviewedByUserId: req.user.id,
        },
      });

      await tx.userProfile.update({
        where: { id: reg.userId },
        data: { pointsBalance: { increment: 1 } },
      });
      await tx.pointTransaction.create({
        data: {
          userId: reg.userId,
          delta: 1,
          reason: `Asistir a un plan: ${reg.trip.title}`,
          createdByUserId: req.user.id,
        },
      });

      await tx.notification.create({
        data: {
          userId: reg.userId,
          actorUserId: req.user.id,
          type: 'TRIP_REGISTRATION_APPROVED',
          title: 'Inscripcion aprobada',
          body: `Tu inscripcion al viaje "${reg.trip.title}" fue aprobada.`,
          data: { tripId: reg.tripId, href: `/trips/${reg.tripId}` },
        },
      });

      return updated;
    });
  }

  @Post('registrations/:registrationId/reject')
  async rejectRegistration(
    @Req() req: AuthedRequest,
    @Param('registrationId') registrationId: string,
    @Body() body: any,
  ) {
    const reg = await this.prisma.tripRegistration.findUnique({
      where: { id: registrationId },
      include: { trip: true },
    });
    if (!reg) throw new NotFoundException('Not found');

    if (req.user.role === 'PROVINCE_ADMIN') {
      const allowedIds = (await this.allowedProvinceIds(req)) ?? [];
      if (!allowedIds.includes(reg.trip.provinceId)) throw new BadRequestException('Not allowed');
    }

    const note = body?.note ? String(body.note) : null;
    const updated = await this.prisma.tripRegistration.update({
      where: { id: reg.id },
      data: {
        status: 'CANCELLED',
        reviewedAt: new Date(),
        reviewedByUserId: req.user.id,
        reviewNote: note,
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: reg.userId,
        actorUserId: req.user.id,
        type: 'TRIP_REGISTRATION_REJECTED',
        title: 'Inscripcion rechazada',
        body: `Tu inscripcion al viaje "${reg.trip.title}" fue rechazada.${note ? ` Motivo: ${note}` : ''}`,
        data: { tripId: reg.tripId, href: `/trips/${reg.tripId}` },
      },
    });

    return updated;
  }
}
