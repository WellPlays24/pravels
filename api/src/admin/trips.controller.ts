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

@Controller('admin/trips')
@RequireAuth('SUPER_ADMIN', 'PROVINCE_ADMIN')
export class AdminTripsController {
  constructor(private readonly prisma: PrismaService) {}

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
      const adminProvinces = await this.prisma.adminProvince.findMany({
        where: { userId: req.user.id },
        select: { provinceId: true },
      });
      const provinceIds = adminProvinces.map((x) => x.provinceId);

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
      const adminProvinces = await this.prisma.adminProvince.findMany({
        where: { userId: req.user.id },
        select: { provinceId: true },
      });
      const provinceIds = adminProvinces.map((x) => x.provinceId);
      return this.prisma.trip.findMany({
        where: { provinceId: { in: provinceIds } },
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
      const allowed = await this.prisma.adminProvince.findFirst({
        where: { userId: req.user.id, provinceId: dto.provinceId },
      });
      if (!allowed) throw new BadRequestException('Not allowed for this province');
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
      const allowed = await this.prisma.adminProvince.findFirst({
        where: { userId: req.user.id, provinceId: trip.provinceId },
      });
      if (!allowed) throw new BadRequestException('Not allowed');
    }

    return trip;
  }

  @Patch(':id')
  async update(@Req() req: AuthedRequest, @Param('id') id: string, @Body() dto: UpdateTripDto) {
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip) throw new NotFoundException('Not found');

    if (req.user.role === 'PROVINCE_ADMIN') {
      const allowed = await this.prisma.adminProvince.findFirst({
        where: { userId: req.user.id, provinceId: trip.provinceId },
      });
      if (!allowed) throw new BadRequestException('Not allowed');
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
      const allowed = await this.prisma.adminProvince.findFirst({
        where: { userId: req.user.id, provinceId: trip.provinceId },
      });
      if (!allowed) throw new BadRequestException('Not allowed');
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
      const allowed = await this.prisma.adminProvince.findFirst({
        where: { userId: req.user.id, provinceId: trip.provinceId },
      });
      if (!allowed) throw new BadRequestException('Not allowed');
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
      const allowed = await this.prisma.adminProvince.findFirst({
        where: { userId: req.user.id, provinceId: trip.provinceId },
      });
      if (!allowed) throw new BadRequestException('Not allowed');
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
      const allowed = await this.prisma.adminProvince.findFirst({
        where: { userId: req.user.id, provinceId: trip.provinceId },
      });
      if (!allowed) throw new BadRequestException('Not allowed');
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
      const allowed = await this.prisma.adminProvince.findFirst({
        where: { userId: req.user.id, provinceId: trip.provinceId },
      });
      if (!allowed) throw new BadRequestException('Not allowed');
    }

    return this.prisma.trip.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  @Get(':id/registrations')
  async registrations(@Req() req: AuthedRequest, @Param('id') id: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip) throw new NotFoundException('Not found');
    if (req.user.role === 'PROVINCE_ADMIN') {
      const allowed = await this.prisma.adminProvince.findFirst({
        where: { userId: req.user.id, provinceId: trip.provinceId },
      });
      if (!allowed) throw new BadRequestException('Not allowed');
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
      const allowed = await this.prisma.adminProvince.findFirst({
        where: { userId: req.user.id, provinceId: reg.trip.provinceId },
      });
      if (!allowed) throw new BadRequestException('Not allowed');
    }

    return this.prisma.tripRegistration.update({
      where: { id: reg.id },
      data: {
        status: 'CONFIRMED',
        reviewedAt: new Date(),
        reviewedByUserId: req.user.id,
      },
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
      const allowed = await this.prisma.adminProvince.findFirst({
        where: { userId: req.user.id, provinceId: reg.trip.provinceId },
      });
      if (!allowed) throw new BadRequestException('Not allowed');
    }

    const note = body?.note ? String(body.note) : null;
    return this.prisma.tripRegistration.update({
      where: { id: reg.id },
      data: {
        status: 'CANCELLED',
        reviewedAt: new Date(),
        reviewedByUserId: req.user.id,
        reviewNote: note,
      },
    });
  }
}
