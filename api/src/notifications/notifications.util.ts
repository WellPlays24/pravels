import type { PrismaService } from '../prisma/prisma.service';

export async function findAdminRecipientIds(prisma: PrismaService, provinceId?: number | null) {
  const superAdmins = await prisma.userProfile.findMany({
    where: { role: 'SUPER_ADMIN', status: 'APPROVED' },
    select: { id: true },
  });

  const provinceAdmins = await prisma.userProfile.findMany({
    where: {
      role: 'PROVINCE_ADMIN',
      status: 'APPROVED',
      ...(provinceId
        ? {
            OR: [
              { adminProvinces: { some: { provinceId } } },
              { primaryProvinceId: provinceId },
            ],
          }
        : {}),
    },
    select: { id: true },
  });

  return Array.from(new Set([...superAdmins, ...provinceAdmins].map((x) => x.id)));
}
