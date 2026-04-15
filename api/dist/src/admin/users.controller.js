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
exports.AdminUsersController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const auth_guard_1 = require("../auth/auth.guard");
let AdminUsersController = class AdminUsersController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async allowedProvinceIds(req) {
        if (req.user.role !== 'PROVINCE_ADMIN')
            return null;
        const adminProvinces = await this.prisma.adminProvince.findMany({
            where: { userId: req.user.id },
            select: { provinceId: true },
        });
        return adminProvinces.map((x) => x.provinceId);
    }
    async list(req, roleRaw, statusRaw, provinceIdRaw, cantonIdRaw, qRaw) {
        const where = {};
        if (roleRaw && ['SUPER_ADMIN', 'PROVINCE_ADMIN', 'MEMBER'].includes(roleRaw)) {
            where.role = roleRaw;
        }
        if (statusRaw && ['PENDING', 'APPROVED', 'REJECTED', 'DISABLED'].includes(statusRaw)) {
            where.status = statusRaw;
        }
        const provinceId = provinceIdRaw ? Number(provinceIdRaw) : undefined;
        if (provinceIdRaw && (!provinceId || Number.isNaN(provinceId))) {
            throw new common_1.BadRequestException('provinceId must be a number');
        }
        const cantonId = cantonIdRaw ? Number(cantonIdRaw) : undefined;
        if (cantonIdRaw && (!cantonId || Number.isNaN(cantonId))) {
            throw new common_1.BadRequestException('cantonId must be a number');
        }
        if (provinceId)
            where.primaryProvinceId = provinceId;
        if (cantonId)
            where.primaryCantonId = cantonId;
        const q = (qRaw ?? '').trim();
        if (q) {
            where.OR = [
                { email: { contains: q, mode: 'insensitive' } },
                { displayName: { contains: q, mode: 'insensitive' } },
                { nickname: { contains: q, mode: 'insensitive' } },
            ];
        }
        const allowed = await this.allowedProvinceIds(req);
        if (allowed) {
            where.primaryProvinceId = { in: allowed.length ? allowed : [-1] };
        }
        return this.prisma.userProfile.findMany({
            where,
            select: {
                id: true,
                email: true,
                role: true,
                status: true,
                phone: true,
                displayName: true,
                nickname: true,
                displayNamePreference: true,
                profilePhotoUrl: true,
                isBannedFromMain: true,
                primaryProvinceId: true,
                primaryCantonId: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });
    }
    async get(req, id) {
        const user = await this.prisma.userProfile.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('Not found');
        const allowed = await this.allowedProvinceIds(req);
        if (allowed && user.primaryProvinceId && !allowed.includes(user.primaryProvinceId)) {
            throw new common_1.BadRequestException('Not allowed');
        }
        return user;
    }
    async update(req, id, body) {
        const user = await this.prisma.userProfile.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('Not found');
        const allowed = await this.allowedProvinceIds(req);
        if (allowed && user.primaryProvinceId && !allowed.includes(user.primaryProvinceId)) {
            throw new common_1.BadRequestException('Not allowed');
        }
        const data = {};
        if (body?.phone !== undefined)
            data.phone = body.phone ? String(body.phone).trim() : null;
        if (body?.displayName !== undefined)
            data.displayName = body.displayName ? String(body.displayName).trim() : null;
        if (body?.nickname !== undefined)
            data.nickname = body.nickname ? String(body.nickname).trim() : null;
        if (body?.displayNamePreference !== undefined) {
            const pref = String(body.displayNamePreference);
            if (pref !== 'FULL_NAME' && pref !== 'NICKNAME')
                throw new common_1.BadRequestException('Invalid displayNamePreference');
            data.displayNamePreference = pref;
        }
        if (body?.isBannedFromMain !== undefined)
            data.isBannedFromMain = Boolean(body.isBannedFromMain);
        if (req.user.role === 'SUPER_ADMIN') {
            if (body?.role !== undefined) {
                const role = String(body.role);
                if (!['SUPER_ADMIN', 'PROVINCE_ADMIN', 'MEMBER'].includes(role))
                    throw new common_1.BadRequestException('Invalid role');
                data.role = role;
            }
            if (body?.status !== undefined) {
                const status = String(body.status);
                if (!['PENDING', 'APPROVED', 'REJECTED', 'DISABLED'].includes(status))
                    throw new common_1.BadRequestException('Invalid status');
                data.status = status;
            }
            if (body?.primaryProvinceId !== undefined) {
                data.primaryProvinceId = body.primaryProvinceId ? Number(body.primaryProvinceId) : null;
            }
            if (body?.primaryCantonId !== undefined) {
                data.primaryCantonId = body.primaryCantonId ? Number(body.primaryCantonId) : null;
            }
            const nextProvinceId = data.primaryProvinceId === undefined ? user.primaryProvinceId : data.primaryProvinceId;
            const nextCantonId = data.primaryCantonId === undefined ? user.primaryCantonId : data.primaryCantonId;
            if (nextCantonId && nextProvinceId) {
                const canton = await this.prisma.canton.findUnique({ where: { id: nextCantonId } });
                if (!canton || canton.provinceId !== nextProvinceId) {
                    throw new common_1.BadRequestException('primaryCantonId must belong to primaryProvinceId');
                }
            }
        }
        return this.prisma.userProfile.update({ where: { id }, data });
    }
};
exports.AdminUsersController = AdminUsersController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('role')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('provinceId')),
    __param(4, (0, common_1.Query)('cantonId')),
    __param(5, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "update", null);
exports.AdminUsersController = AdminUsersController = __decorate([
    (0, common_1.Controller)('admin/users'),
    (0, auth_guard_1.RequireAuth)('SUPER_ADMIN', 'PROVINCE_ADMIN'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminUsersController);
//# sourceMappingURL=users.controller.js.map