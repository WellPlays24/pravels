import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequireAuth } from '../auth/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

@Controller('admin/settings')
@RequireAuth('SUPER_ADMIN')
export class AdminSettingsController {
  constructor(private readonly prisma: PrismaService) {}

  async ensure() {
    return this.prisma.generalSetting.upsert({
      where: { id: 'global' },
      update: {},
      create: { id: 'global', communityName: 'Pravels' },
    });
  }

  @Get()
  async get() {
    return this.ensure();
  }

  @Patch()
  async update(@Body() body: any) {
    await this.ensure();

    const data: any = {};
    if (body?.communityName !== undefined) {
      const v = String(body.communityName ?? '').trim();
      if (!v) throw new BadRequestException('communityName is required');
      if (v.length > 60) throw new BadRequestException('communityName too long');
      data.communityName = v;
    }
    if (body?.logoUrl !== undefined) {
      const v = body.logoUrl ? String(body.logoUrl) : null;
      data.logoUrl = v;
    }

    if (body?.supportUserId !== undefined) {
      const v = body.supportUserId ? String(body.supportUserId) : null;
      data.supportUserId = v;
    }

    return this.prisma.generalSetting.update({ where: { id: 'global' }, data });
  }

  @Post('logo/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req: any, _file: any, cb: any) => {
          const dir = process.env.PRAVELS_CONTENT_DIR;
          if (!dir) return cb(new Error('PRAVELS_CONTENT_DIR is not set'), dir as any);
          cb(null, dir);
        },
        filename: (_req: any, file: any, cb: any) => {
          const ext = path.extname(file.originalname || '').toLowerCase();
          const safeExt = ['.jpg', '.jpeg', '.png'].includes(ext) ? ext : '.png';
          cb(null, `community-logo-${randomUUID()}${safeExt}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ok = file.mimetype === 'image/jpeg' || file.mimetype === 'image/png';
        cb(ok ? null : new Error('Only JPG/PNG allowed'), ok);
      },
    }),
  )
  async uploadLogo(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('file is required');
    await this.ensure();
    const url = `/files/content/${encodeURIComponent(file.filename)}`;
    await this.prisma.generalSetting.update({ where: { id: 'global' }, data: { logoUrl: url } });
    return { url };
  }
}
