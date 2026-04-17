"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicStaffController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PublicStaffController = class PublicStaffController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    toWhatsappUrl(phone) {
        const digits = String(phone || '').replace(/\D/g, '');
        if (!digits)
            return null;
        if (digits.startsWith('593'))
            return `https://wa.me/${digits}`;
        if (digits.startsWith('0'))
            return `https://wa.me/593${digits.slice(1)}`;
        return `https://wa.me/593${digits}`;
    }
    async staff() {
        const users = await this.prisma.userProfile.findMany({
            where: {
                role: { in: ['SUPER_ADMIN', 'PROVINCE_ADMIN'] },
                status: 'APPROVED',
            },
            select: {
                id: true,
                email: true,
                role: true,
                phone: true,
                displayName: true,
                nickname: true,
                displayNamePreference: true,
                profilePhotoUrl: true,
                primaryProvinceId: true,
                primaryCantonId: true,
            },
            orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
        });
        const provinceIds = Array.from(new Set(users.map((u) => u.primaryProvinceId).filter((x) => typeof x === 'number')));
        const cantonIds = Array.from(new Set(users.map((u) => u.primaryCantonId).filter((x) => typeof x === 'number')));
        const [provinces, cantons] = await Promise.all([
            provinceIds.length
                ? this.prisma.province.findMany({ where: { id: { in: provinceIds } }, select: { id: true, name: true } })
                : Promise.resolve([]),
            cantonIds.length
                ? this.prisma.canton.findMany({ where: { id: { in: cantonIds } }, select: { id: true, name: true } })
                : Promise.resolve([]),
        ]);
        const provinceById = new Map(provinces.map((p) => [p.id, p.name]));
        const cantonById = new Map(cantons.map((c) => [c.id, c.name]));
        return users
            .map((u) => {
            const pref = u.displayNamePreference;
            const displayLabel = pref === 'NICKNAME' && u.nickname && u.nickname.trim().length
                ? u.nickname.trim()
                : u.displayName && u.displayName.trim().length
                    ? u.displayName.trim()
                    : u.email;
            return {
                id: u.id,
                role: u.role,
                displayLabel,
                email: u.email,
                profilePhotoUrl: u.profilePhotoUrl,
                whatsappUrl: u.phone ? this.toWhatsappUrl(u.phone) : null,
                province: u.primaryProvinceId ? provinceById.get(u.primaryProvinceId) ?? null : null,
                canton: u.primaryCantonId ? cantonById.get(u.primaryCantonId) ?? null : null,
            };
        })
            .sort((a, b) => {
            const ra = a.role === 'SUPER_ADMIN' ? 0 : 1;
            const rb = b.role === 'SUPER_ADMIN' ? 0 : 1;
            if (ra !== rb)
                return ra - rb;
            return a.displayLabel.localeCompare(b.displayLabel);
        });
    }
};
exports.PublicStaffController = PublicStaffController;
__decorate([
    (0, common_1.Get)('staff'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PublicStaffController.prototype, "staff", null);
exports.PublicStaffController = PublicStaffController = __decorate([
    (0, common_1.Controller)('public'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PublicStaffController);
//# sourceMappingURL=public-staff.controller.js.map