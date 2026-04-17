import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { RequireAuth } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/audit-logs')
@RequireAuth('SUPER_ADMIN')
export class AdminAuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query('q') qRaw?: string,
    @Query('event') eventRaw?: string,
    @Query('method') methodRaw?: string,
    @Query('status') statusRaw?: string,
    @Query('cursor') cursorRaw?: string,
    @Query('take') takeRaw?: string,
  ) {
    const take = takeRaw ? Math.max(1, Math.min(100, Number(takeRaw) || 30)) : 30;
    const cursor = cursorRaw ? String(cursorRaw) : null;

    const where: any = {};
    const q = String(qRaw ?? '').trim();
    if (q) {
      where.OR = [
        { path: { contains: q, mode: 'insensitive' } },
        { event: { contains: q, mode: 'insensitive' } },
        { actor: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    if (eventRaw) where.event = String(eventRaw);
    if (methodRaw) where.method = String(methodRaw).toUpperCase();
    if (statusRaw) {
      const s = Number(statusRaw);
      if (!Number.isInteger(s)) throw new BadRequestException('status must be integer');
      where.statusCode = s;
    }

    const items = await this.prisma.auditLog.findMany({
      where,
      include: { actor: { select: { id: true, email: true, role: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = items.length > take;
    const page = hasMore ? items.slice(0, take) : items;
    const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;

    return {
      items: page,
      nextCursor,
    };
  }
}
