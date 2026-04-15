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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequireAuth } from '../auth/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

@Controller('admin/content-pages')
@RequireAuth('SUPER_ADMIN')
export class AdminContentPagesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    return this.prisma.contentPage.findMany({
      select: { id: true, slug: true, title: true, updatedAt: true },
      orderBy: { slug: 'asc' },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const page = await this.prisma.contentPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundException('Not found');
    return page;
  }

  @Post(':id/assets/upload')
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
          const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.svg'].includes(ext) ? ext : '.jpg';
          cb(null, `${randomUUID()}${safeExt}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ok =
          file.mimetype === 'image/jpeg' ||
          file.mimetype === 'image/png' ||
          file.mimetype === 'image/webp' ||
          file.mimetype === 'image/svg+xml';
        cb(ok ? null : new Error('Only JPG/PNG/WEBP/SVG allowed'), ok);
      },
    }),
  )
  async uploadAsset(@Param('id') id: string, @UploadedFile() file?: Express.Multer.File) {
    const page = await this.prisma.contentPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundException('Not found');
    if (!file) throw new BadRequestException('file is required');
    const url = `/files/content/${encodeURIComponent(file.filename)}`;
    return { url };
  }

  @Post()
  async create(@Body() body: any) {
    const slug = String(body?.slug ?? '').trim();
    const title = String(body?.title ?? '').trim();
    const content = String(body?.body ?? '');
    const contentJson = body?.contentJson === undefined ? undefined : body.contentJson;
    if (!slug) throw new BadRequestException('slug is required');
    if (!/^[a-z0-9-]+$/.test(slug)) throw new BadRequestException('slug must be kebab-case');
    if (!title) throw new BadRequestException('title is required');

    return this.prisma.contentPage.create({
      data: { slug, title, body: content, contentJson },
    });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const exists = await this.prisma.contentPage.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Not found');

    const title = body?.title === undefined ? undefined : String(body.title).trim();
    const content = body?.body === undefined ? undefined : String(body.body);
    const contentJson = body?.contentJson === undefined ? undefined : body.contentJson;

    return this.prisma.contentPage.update({
      where: { id },
      data: {
        title,
        body: content,
        contentJson,
      },
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const exists = await this.prisma.contentPage.findUnique({ where: { id } });
    if (!exists) return { ok: true };
    await this.prisma.contentPage.delete({ where: { id } });
    return { ok: true };
  }
}
