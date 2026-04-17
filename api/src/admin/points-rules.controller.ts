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
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequireAuth } from '../auth/auth.guard';

@Controller('admin/point-rules')
@RequireAuth('SUPER_ADMIN')
export class AdminPointRulesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    return this.prisma.pointRule.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  }

  @Post()
  async create(@Body() body: any) {
    const title = String(body?.title ?? '').trim();
    const description = body?.description == null ? null : String(body.description);
    const points = Number(body?.points);
    const isActive = body?.isActive === undefined ? true : Boolean(body.isActive);
    const sortOrder = body?.sortOrder === undefined ? 0 : Number(body.sortOrder);
    if (!title) throw new BadRequestException('title is required');
    if (!Number.isInteger(points) || points <= 0) throw new BadRequestException('points must be a positive integer');
    if (!Number.isInteger(sortOrder)) throw new BadRequestException('sortOrder must be integer');

    return this.prisma.pointRule.create({
      data: { title, description, points, isActive, sortOrder },
    });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const existing = await this.prisma.pointRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Not found');

    const data: any = {};
    if (body?.title !== undefined) {
      const title = String(body.title ?? '').trim();
      if (!title) throw new BadRequestException('title is required');
      data.title = title;
    }
    if (body?.description !== undefined) data.description = body.description == null ? null : String(body.description);
    if (body?.points !== undefined) {
      const points = Number(body.points);
      if (!Number.isInteger(points) || points <= 0) throw new BadRequestException('points must be a positive integer');
      data.points = points;
    }
    if (body?.isActive !== undefined) data.isActive = Boolean(body.isActive);
    if (body?.sortOrder !== undefined) {
      const sortOrder = Number(body.sortOrder);
      if (!Number.isInteger(sortOrder)) throw new BadRequestException('sortOrder must be integer');
      data.sortOrder = sortOrder;
    }

    return this.prisma.pointRule.update({ where: { id }, data });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const existing = await this.prisma.pointRule.findUnique({ where: { id } });
    if (!existing) return { ok: true };
    await this.prisma.pointRule.delete({ where: { id } });
    return { ok: true };
  }
}
