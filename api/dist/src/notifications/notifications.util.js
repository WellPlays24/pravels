"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAdminRecipientIds = findAdminRecipientIds;
async function findAdminRecipientIds(prisma, provinceId) {
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
//# sourceMappingURL=notifications.util.js.map