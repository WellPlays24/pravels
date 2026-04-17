import type { PrismaService } from '../prisma/prisma.service';
export declare function findAdminRecipientIds(prisma: PrismaService, provinceId?: number | null): Promise<string[]>;
