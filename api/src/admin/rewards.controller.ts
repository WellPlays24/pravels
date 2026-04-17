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

@Controller('admin/rewards')
@RequireAuth('SUPER_ADMIN')
export class AdminRewardsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('usage')
  async usage() {
    // Only meaningful for rewards that generate redeem codes (free trip).
    const rewards = await this.prisma.rewardItem.findMany({
      where: { grantsFreeTrip: true },
      select: { id: true },
      take: 500,
    });
    const rewardIds = rewards.map((r) => r.id);
    if (!rewardIds.length) return { byRewardId: {} };

    const approved = await this.prisma.rewardClaim.groupBy({
      by: ['rewardId'],
      where: { rewardId: { in: rewardIds }, status: 'APPROVED' },
      _count: { _all: true },
    });
    const redeemed = await this.prisma.rewardClaim.groupBy({
      by: ['rewardId'],
      where: { rewardId: { in: rewardIds }, status: 'APPROVED', redeemedAt: { not: null } },
      _count: { _all: true },
    });

    const byRewardId: Record<string, { approved: number; redeemed: number }> = {};
    for (const a of approved) {
      byRewardId[a.rewardId] = { approved: a._count._all, redeemed: 0 };
    }
    for (const r of redeemed) {
      byRewardId[r.rewardId] = { approved: byRewardId[r.rewardId]?.approved ?? 0, redeemed: r._count._all };
    }
    return { byRewardId };
  }

  @Get()
  async list() {
    return this.prisma.rewardItem.findMany({ orderBy: { createdAt: 'desc' } });
  }

  @Post()
  async create(@Body() body: any) {
    const name = String(body?.name ?? '').trim();
    const description = body?.description == null ? null : String(body.description);
    const pointsCost = Number(body?.pointsCost);
    const stock = body?.stock == null || body.stock === '' ? null : Number(body.stock);
    const isActive = body?.isActive === undefined ? true : Boolean(body.isActive);
    const grantsFreeTrip = Boolean(body?.grantsFreeTrip);
    if (!name) throw new BadRequestException('name is required');
    if (!Number.isInteger(pointsCost) || pointsCost <= 0) throw new BadRequestException('pointsCost must be a positive integer');
    if (stock != null && (!Number.isInteger(stock) || stock < 0)) throw new BadRequestException('stock must be integer >= 0');

    return this.prisma.rewardItem.create({
      data: { name, description, pointsCost, stock: stock == null ? null : stock, isActive, grantsFreeTrip },
    });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const existing = await this.prisma.rewardItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Not found');

    const data: any = {};
    if (body?.name !== undefined) {
      const name = String(body.name ?? '').trim();
      if (!name) throw new BadRequestException('name is required');
      data.name = name;
    }
    if (body?.description !== undefined) data.description = body.description == null ? null : String(body.description);
    if (body?.pointsCost !== undefined) {
      const pointsCost = Number(body.pointsCost);
      if (!Number.isInteger(pointsCost) || pointsCost <= 0) throw new BadRequestException('pointsCost must be a positive integer');
      data.pointsCost = pointsCost;
    }
    if (body?.stock !== undefined) {
      const stock = body.stock == null || body.stock === '' ? null : Number(body.stock);
      if (stock != null && (!Number.isInteger(stock) || stock < 0)) throw new BadRequestException('stock must be integer >= 0');
      data.stock = stock;
    }
    if (body?.isActive !== undefined) data.isActive = Boolean(body.isActive);
    if (body?.grantsFreeTrip !== undefined) data.grantsFreeTrip = Boolean(body.grantsFreeTrip);

    return this.prisma.rewardItem.update({ where: { id }, data });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const existing = await this.prisma.rewardItem.findUnique({ where: { id } });
    if (!existing) return { ok: true };
    await this.prisma.rewardItem.delete({ where: { id } });
    return { ok: true };
  }
}
