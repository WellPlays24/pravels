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

@Controller('trips')
@RequireAuth('SUPER_ADMIN', 'PROVINCE_ADMIN', 'MEMBER')
export class TripsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query('scope') scopeRaw: string | undefined) {
    const scope = scopeRaw === 'past' ? 'past' : 'upcoming';
    const now = new Date();

    const where =
      scope === 'past'
        ? { status: 'PUBLISHED' as const, endsAt: { lt: now } }
        : { status: 'PUBLISHED' as const, endsAt: { gte: now } };

    return this.prisma.trip.findMany({
      where,
      include: {
        province: true,
        canton: true,
        media: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { startsAt: scope === 'past' ? 'desc' : 'asc' },
    });
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
      return this.prisma.tripRegistration.update({
        where: { id: existing.id },
        data: { paymentProofUrl: proofUrl, amountCents: trip.priceCents ?? null, status: 'PENDING' },
      });
    }

    return this.prisma.tripRegistration.create({
      data: {
        tripId: id,
        userId: req.user.id,
        status: 'PENDING',
        amountCents: trip.priceCents ?? null,
        paymentProofUrl: proofUrl,
      },
    });
  }
}
