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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const auth_guard_1 = require("../auth/auth.guard");
const whatsapp_groups_dto_1 = require("./whatsapp-groups.dto");
let AdminController = class AdminController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async provinces() {
        return this.prisma.province.findMany({
            orderBy: { name: 'asc' },
        });
    }
    async listGroups(req) {
        if (req.user.role === 'PROVINCE_ADMIN') {
            const adminProvinces = await this.prisma.adminProvince.findMany({
                where: { userId: req.user.id },
                select: { provinceId: true },
            });
            const provinceIds = adminProvinces.map((x) => x.provinceId);
            return this.prisma.whatsappGroup.findMany({
                where: {
                    OR: [{ kind: 'MAIN' }, { provinceId: { in: provinceIds } }],
                },
                include: { province: true },
                orderBy: [{ kind: 'asc' }, { name: 'asc' }],
            });
        }
        return this.prisma.whatsappGroup.findMany({
            include: { province: true },
            orderBy: [{ kind: 'asc' }, { name: 'asc' }],
        });
    }
    async createGroup(req, dto) {
        if (dto.kind === 'PROVINCE' && !dto.provinceId) {
            throw new common_1.BadRequestException('provinceId is required for PROVINCE groups');
        }
        if (dto.kind === 'MAIN') {
            dto.provinceId = undefined;
        }
        if (req.user.role === 'PROVINCE_ADMIN') {
            if (dto.kind !== 'MAIN') {
                const allowed = await this.prisma.adminProvince.findFirst({
                    where: { userId: req.user.id, provinceId: dto.provinceId },
                });
                if (!allowed)
                    throw new common_1.ForbiddenException('Not allowed for this province');
            }
        }
        return this.prisma.whatsappGroup.create({
            data: {
                kind: dto.kind,
                name: dto.name,
                url: dto.url,
                isActive: dto.isActive ?? true,
                provinceId: dto.kind === 'MAIN' ? null : dto.provinceId ?? null,
                createdByUserId: req.user.id,
            },
            include: { province: true },
        });
    }
    async updateGroup(req, id, dto) {
        const existing = await this.prisma.whatsappGroup.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Not found');
        if (req.user.role === 'PROVINCE_ADMIN') {
            if (existing.kind !== 'MAIN') {
                const allowed = await this.prisma.adminProvince.findFirst({
                    where: { userId: req.user.id, provinceId: existing.provinceId ?? undefined },
                });
                if (!allowed)
                    throw new common_1.ForbiddenException('Not allowed');
            }
        }
        const nextKind = dto.kind ?? existing.kind;
        const nextProvinceId = nextKind === 'MAIN'
            ? null
            : dto.provinceId === undefined
                ? existing.provinceId
                : dto.provinceId;
        if (nextKind === 'PROVINCE' && !nextProvinceId) {
            throw new common_1.BadRequestException('provinceId is required for PROVINCE groups');
        }
        return this.prisma.whatsappGroup.update({
            where: { id },
            data: {
                name: dto.name,
                url: dto.url,
                kind: dto.kind,
                provinceId: nextProvinceId,
                isActive: dto.isActive,
            },
            include: { province: true },
        });
    }
    async deleteGroup(req, id) {
        const existing = await this.prisma.whatsappGroup.findUnique({ where: { id } });
        if (!existing)
            return { ok: true };
        if (req.user.role === 'PROVINCE_ADMIN') {
            if (existing.kind !== 'MAIN') {
                const allowed = await this.prisma.adminProvince.findFirst({
                    where: { userId: req.user.id, provinceId: existing.provinceId ?? undefined },
                });
                if (!allowed)
                    throw new common_1.ForbiddenException('Not allowed');
            }
        }
        await this.prisma.whatsappGroup.delete({ where: { id } });
        return { ok: true };
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('provinces'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "provinces", null);
__decorate([
    (0, common_1.Get)('whatsapp-groups'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listGroups", null);
__decorate([
    (0, common_1.Post)('whatsapp-groups'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, whatsapp_groups_dto_1.CreateWhatsappGroupDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createGroup", null);
__decorate([
    (0, common_1.Patch)('whatsapp-groups/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, whatsapp_groups_dto_1.UpdateWhatsappGroupDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateGroup", null);
__decorate([
    (0, common_1.Delete)('whatsapp-groups/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteGroup", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    (0, auth_guard_1.RequireAuth)('SUPER_ADMIN', 'PROVINCE_ADMIN'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map