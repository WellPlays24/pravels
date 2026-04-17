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
exports.PublicSettingsController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PublicSettingsController = class PublicSettingsController {
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
    async get() {
        const s = await this.prisma.generalSetting.upsert({
            where: { id: 'global' },
            update: {},
            create: { id: 'global', communityName: 'Pravels' },
            select: { communityName: true, logoUrl: true, supportUserId: true, updatedAt: true },
        });
        const supportUser = s.supportUserId
            ? await this.prisma.userProfile.findUnique({
                where: { id: s.supportUserId },
                select: {
                    id: true,
                    email: true,
                    phone: true,
                    displayName: true,
                    nickname: true,
                    displayNamePreference: true,
                },
            })
            : await this.prisma.userProfile.findFirst({
                where: { role: 'SUPER_ADMIN', status: 'APPROVED', phone: { not: null } },
                select: {
                    id: true,
                    email: true,
                    phone: true,
                    displayName: true,
                    nickname: true,
                    displayNamePreference: true,
                },
                orderBy: { createdAt: 'asc' },
            });
        const displayLabel = supportUser
            ? supportUser.displayNamePreference === 'NICKNAME' && supportUser.nickname?.trim()
                ? supportUser.nickname.trim()
                : supportUser.displayName?.trim()
                    ? supportUser.displayName.trim()
                    : supportUser.email
            : null;
        const whatsappUrl = supportUser?.phone ? this.toWhatsappUrl(supportUser.phone) : null;
        return {
            communityName: s.communityName,
            logoUrl: s.logoUrl,
            updatedAt: s.updatedAt,
            support: supportUser
                ? {
                    userId: supportUser.id,
                    displayLabel,
                    phone: supportUser.phone,
                    whatsappUrl,
                }
                : null,
        };
    }
};
exports.PublicSettingsController = PublicSettingsController;
__decorate([
    (0, common_1.Get)('settings'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PublicSettingsController.prototype, "get", null);
exports.PublicSettingsController = PublicSettingsController = __decorate([
    (0, common_1.Controller)('public'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PublicSettingsController);
//# sourceMappingURL=public-settings.controller.js.map