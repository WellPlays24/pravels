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
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequireAuth } from '../auth/auth.guard';
import type { AuthedRequest } from '../auth/auth.guard';
import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';

@Controller('admin/reward-claims')
@RequireAuth('SUPER_ADMIN')
export class AdminRewardClaimsController {
  constructor(private readonly prisma: PrismaService) {}

  private makeCode() {
    // Human-friendly enough while still unique.
    const hex = randomBytes(6).toString('hex').toUpperCase();
    return `PRV-${hex}`;
  }

  @Get()
  async list(@Query('status') statusRaw?: string) {
    const status = statusRaw === 'APPROVED' || statusRaw === 'REJECTED' || statusRaw === 'PENDING' ? statusRaw : 'PENDING';
    return this.prisma.rewardClaim.findMany({
      where: { status },
      include: { user: true, reward: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  @Get('verify')
  async verify(@Query('code') codeRaw?: string) {
    const code = String(codeRaw ?? '').trim().toUpperCase();
    if (!code) throw new BadRequestException('code is required');
    const claim = await this.prisma.rewardClaim.findFirst({
      where: { redeemCode: code },
      include: { user: true, reward: true },
    });
    if (!claim) throw new NotFoundException('Not found');
    return claim;
  }

  @Post(':id/approve')
  async approve(@Req() req: AuthedRequest, @Param('id') id: string) {
    const claim = await this.prisma.rewardClaim.findUnique({
      where: { id },
      include: { reward: true, user: true },
    });
    if (!claim) throw new NotFoundException('Not found');
    if (claim.status !== 'PENDING') throw new BadRequestException('Claim not pending');

    // Deduct points + decrement stock at approval time.
    const updated = await this.prisma.$transaction(async (tx) => {
      const user = await tx.userProfile.findUnique({ where: { id: claim.userId }, select: { pointsBalance: true } });
      if (!user) throw new NotFoundException('Not found');
      if (user.pointsBalance < claim.pointsCostAtClaim) throw new BadRequestException('User has insufficient points');

      if (claim.reward.stock != null && claim.reward.stock <= 0) throw new BadRequestException('Reward out of stock');

      await tx.userProfile.update({
        where: { id: claim.userId },
        data: { pointsBalance: { decrement: claim.pointsCostAtClaim } },
      });
      await tx.pointTransaction.create({
        data: {
          userId: claim.userId,
          delta: -claim.pointsCostAtClaim,
          reason: `Reclamo aprobado: ${claim.reward.name}`,
          createdByUserId: req.user.id,
        },
      });

      if (claim.reward.stock != null) {
        await tx.rewardItem.update({ where: { id: claim.rewardId }, data: { stock: { decrement: 1 } } });
      }

      // Only rewards that grant free trips get a redeemable code.
      if (claim.reward.grantsFreeTrip) {
        let redeemCode: string | null = null;
        for (let i = 0; i < 5; i++) {
          const next = this.makeCode();
          try {
            await tx.rewardClaim.update({ where: { id: claim.id }, data: { redeemCode: next } });
            redeemCode = next;
            break;
          } catch (e: any) {
            const isUnique = e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
            if (!isUnique) throw e;
          }
        }
        if (!redeemCode) throw new BadRequestException('Could not generate redeem code');
      }

      return tx.rewardClaim.update({
        where: { id: claim.id },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
          reviewedByUserId: req.user.id,
          reviewNote: null,
        },
      });
    });

    await this.prisma.notification.create({
      data: {
        userId: claim.userId,
        actorUserId: req.user.id,
        type: 'REWARD_CLAIM_APPROVED',
        title: 'Premio aprobado',
        body: claim.reward.grantsFreeTrip
          ? `Tu reclamo de premio "${claim.reward.name}" fue aprobado. Tu codigo es: ${updated.redeemCode ?? ''}`.trim()
          : `Tu reclamo de premio "${claim.reward.name}" fue aprobado.`.trim(),
        data: { claimId: claim.id, rewardId: claim.rewardId, href: '/my-rewards' },
      },
    });

    return updated;
  }

  @Post(':id/reject')
  async reject(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: any) {
    const claim = await this.prisma.rewardClaim.findUnique({ where: { id } });
    if (!claim) throw new NotFoundException('Not found');
    if (claim.status !== 'PENDING') throw new BadRequestException('Claim not pending');
    const note = body?.note ? String(body.note) : null;
    const updated = await this.prisma.rewardClaim.update({
      where: { id: claim.id },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewedByUserId: req.user.id,
        reviewNote: note,
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: claim.userId,
        actorUserId: req.user.id,
        type: 'REWARD_CLAIM_REJECTED',
        title: 'Premio rechazado',
        body: `Tu reclamo de premio fue rechazado.${note ? ` Motivo: ${note}` : ''}`,
        data: { claimId: claim.id, rewardId: claim.rewardId, href: '/my-rewards' },
      },
    });

    return updated;
  }
}
