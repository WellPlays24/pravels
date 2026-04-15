import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { diskStorage } from 'multer';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import * as bcrypt from 'bcrypt';

function safeIdFolder(idNumber: string) {
  const cleaned = idNumber.trim();
  if (!/^[0-9A-Za-z-]+$/.test(cleaned)) {
    throw new BadRequestException('idNumber contains invalid characters');
  }
  return cleaned;
}

function extFromMimetype(mime: string) {
  if (mime === 'image/jpeg') return '.jpg';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  return null;
}

@Controller('public')
export class PublicRegistrationController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('register')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'photo1', maxCount: 1 },
        { name: 'photo2', maxCount: 1 },
        { name: 'photo3', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: async (req: any, file: any, cb: any) => {
            try {
              const base = process.env.PRAVELS_MEMBERS_DIR;
              if (!base) throw new Error('PRAVELS_MEMBERS_DIR is not set');

              const idNumber = safeIdFolder(String(req.body?.idNumber ?? ''));
              const dest = path.join(base, idNumber);
              await mkdir(dest, { recursive: true });
              cb(null, dest);
            } catch (e: any) {
              cb(e);
            }
          },
          filename: (req: any, file: any, cb: any) => {
            const mimeExt = extFromMimetype(file.mimetype);
            if (!mimeExt) return cb(new Error('Only JPG/PNG/WEBP allowed'));
            const field = String(file.fieldname);
            const name = field === 'photo1' || field === 'photo2' || field === 'photo3' ? field : 'photo';
            cb(null, `${name}${mimeExt}`);
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
      },
    ),
  )
  async register(
    @Body()
    body: any,
    @UploadedFiles()
    files: { photo1?: Express.Multer.File[]; photo2?: Express.Multer.File[]; photo3?: Express.Multer.File[] },
  ) {
    const {
      fullName,
      nickname,
      displayNamePreference,
      email,
      phone,
      idType,
      idNumber,
      birthDate,
      socialUrl,
      priorityProvinceId,
      priorityCantonId,
      requestedProvinceIds,
      password,
    } = body;

    if (!fullName || !email || !phone || !idType || !idNumber || !birthDate || !socialUrl || !password) {
      throw new BadRequestException('Missing required fields');
    }
    if (String(password).length < 6) throw new BadRequestException('Password must be at least 6 chars');
    if (idType !== 'CEDULA' && idType !== 'PASSPORT') throw new BadRequestException('Invalid idType');

    const pref = displayNamePreference ? String(displayNamePreference) : 'FULL_NAME';
    if (pref !== 'FULL_NAME' && pref !== 'NICKNAME') throw new BadRequestException('Invalid displayNamePreference');
    const nick = nickname != null ? String(nickname).trim() : '';
    if (pref === 'NICKNAME' && !nick) throw new BadRequestException('nickname is required when displayNamePreference=NICKNAME');

    const pProvId = Number(priorityProvinceId);
    const pCantonId = Number(priorityCantonId);
    if (!pProvId || !pCantonId) throw new BadRequestException('priorityProvinceId and priorityCantonId are required');

    const canton = await this.prisma.canton.findUnique({ where: { id: pCantonId } });
    if (!canton || canton.provinceId !== pProvId) {
      throw new BadRequestException('priorityCantonId must belong to priorityProvinceId');
    }

    const photo1 = files.photo1?.[0];
    const photo2 = files.photo2?.[0];
    const photo3 = files.photo3?.[0];
    if (!photo1 || !photo2 || !photo3) throw new BadRequestException('3 photos are required');

    const folder = safeIdFolder(String(idNumber));
    const photo1Url = `/files/members/${encodeURIComponent(folder)}/${encodeURIComponent(photo1.filename)}`;
    const photo2Url = `/files/members/${encodeURIComponent(folder)}/${encodeURIComponent(photo2.filename)}`;
    const photo3Url = `/files/members/${encodeURIComponent(folder)}/${encodeURIComponent(photo3.filename)}`;

    let provinceIds: number[] = [];
    try {
      provinceIds = requestedProvinceIds ? JSON.parse(String(requestedProvinceIds)) : [];
      if (!Array.isArray(provinceIds)) provinceIds = [];
    } catch {
      provinceIds = [];
    }
    provinceIds = provinceIds.map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0);
    if (!provinceIds.includes(pProvId)) provinceIds.push(pProvId);
    provinceIds = Array.from(new Set(provinceIds));

    const passwordHash = await bcrypt.hash(String(password), 10);

    const reqRecord = await this.prisma.registrationRequest.create({
      data: {
        status: 'PENDING',
        fullName: String(fullName),
        nickname: nick ? nick : null,
        displayNamePreference: pref as any,
        email: String(email).toLowerCase().trim(),
        phone: String(phone).trim(),
        idType,
        idNumber: String(idNumber).trim(),
        birthDate: new Date(String(birthDate)),
        socialUrl: String(socialUrl).trim(),
        passwordHash,
        photo1Url,
        photo2Url,
        photo3Url,
        priorityProvinceId: pProvId,
        priorityCantonId: pCantonId,
        requestedProvinces: {
          create: provinceIds.map((provinceId) => ({ provinceId })),
        },
      },
      include: { requestedProvinces: true },
    });

    return { requestId: reqRecord.id };
  }

  @Get('registration-requests/:id')
  async status(@Param('id') id: string) {
    const rr = await this.prisma.registrationRequest.findUnique({
      where: { id },
      select: { id: true, status: true, submittedAt: true, reviewedAt: true, reviewNote: true },
    });
    if (!rr) throw new BadRequestException('Not found');
    return rr;
  }
}
