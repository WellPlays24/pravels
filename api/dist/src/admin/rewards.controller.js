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
exports.AdminRewardsController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const auth_guard_1 = require("../auth/auth.guard");
let AdminRewardsController = class AdminRewardsController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async usage() {
        const rewards = await this.prisma.rewardItem.findMany({
            where: { grantsFreeTrip: true },
            select: { id: true },
            take: 500,
        });
        const rewardIds = rewards.map((r) => r.id);
        if (!rewardIds.length)
            return { byRewardId: {} };
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
        const byRewardId = {};
        for (const a of approved) {
            byRewardId[a.rewardId] = { approved: a._count._all, redeemed: 0 };
        }
        for (const r of redeemed) {
            byRewardId[r.rewardId] = { approved: byRewardId[r.rewardId]?.approved ?? 0, redeemed: r._count._all };
        }
        return { byRewardId };
    }
    async list() {
        return this.prisma.rewardItem.findMany({ orderBy: { createdAt: 'desc' } });
    }
    async create(body) {
        const name = String(body?.name ?? '').trim();
        const description = body?.description == null ? null : String(body.description);
        const pointsCost = Number(body?.pointsCost);
        const stock = body?.stock == null || body.stock === '' ? null : Number(body.stock);
        const isActive = body?.isActive === undefined ? true : Boolean(body.isActive);
        const grantsFreeTrip = Boolean(body?.grantsFreeTrip);
        if (!name)
            throw new common_1.BadRequestException('name is required');
        if (!Number.isInteger(pointsCost) || pointsCost <= 0)
            throw new common_1.BadRequestException('pointsCost must be a positive integer');
        if (stock != null && (!Number.isInteger(stock) || stock < 0))
            throw new common_1.BadRequestException('stock must be integer >= 0');
        return this.prisma.rewardItem.create({
            data: { name, description, pointsCost, stock: stock == null ? null : stock, isActive, grantsFreeTrip },
        });
    }
    async update(id, body) {
        const existing = await this.prisma.rewardItem.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Not found');
        const data = {};
        if (body?.name !== undefined) {
            const name = String(body.name ?? '').trim();
            if (!name)
                throw new common_1.BadRequestException('name is required');
            data.name = name;
        }
        if (body?.description !== undefined)
            data.description = body.description == null ? null : String(body.description);
        if (body?.pointsCost !== undefined) {
            const pointsCost = Number(body.pointsCost);
            if (!Number.isInteger(pointsCost) || pointsCost <= 0)
                throw new common_1.BadRequestException('pointsCost must be a positive integer');
            data.pointsCost = pointsCost;
        }
        if (body?.stock !== undefined) {
            const stock = body.stock == null || body.stock === '' ? null : Number(body.stock);
            if (stock != null && (!Number.isInteger(stock) || stock < 0))
                throw new common_1.BadRequestException('stock must be integer >= 0');
            data.stock = stock;
        }
        if (body?.isActive !== undefined)
            data.isActive = Boolean(body.isActive);
        if (body?.grantsFreeTrip !== undefined)
            data.grantsFreeTrip = Boolean(body.grantsFreeTrip);
        return this.prisma.rewardItem.update({ where: { id }, data });
    }
    async remove(id) {
        const existing = await this.prisma.rewardItem.findUnique({ where: { id } });
        if (!existing)
            return { ok: true };
        await this.prisma.rewardItem.delete({ where: { id } });
        return { ok: true };
    }
};
exports.AdminRewardsController = AdminRewardsController;
__decorate([
    (0, common_1.Get)('usage'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminRewardsController.prototype, "usage", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminRewardsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminRewardsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminRewardsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminRewardsController.prototype, "remove", null);
exports.AdminRewardsController = AdminRewardsController = __decorate([
    (0, common_1.Controller)('admin/rewards'),
    (0, auth_guard_1.RequireAuth)('SUPER_ADMIN'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminRewardsController);
//# sourceMappingURL=rewards.controller.js.map