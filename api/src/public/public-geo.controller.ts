import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('public')
export class PublicGeoController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('provinces')
  async provinces() {
    return this.prisma.province.findMany({ orderBy: { name: 'asc' } });
  }

  @Get('cantons')
  async cantons(@Query('provinceId') provinceIdRaw: string) {
    const provinceId = Number(provinceIdRaw);
    if (!provinceId || Number.isNaN(provinceId)) throw new BadRequestException('provinceId is required');
    return this.prisma.canton.findMany({ where: { provinceId }, orderBy: { name: 'asc' } });
  }
}
