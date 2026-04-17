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
exports.AdminRewardClaimsController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const auth_guard_1 = require("../auth/auth.guard");
const node_crypto_1 = require("node:crypto");
const client_1 = require("@prisma/client");
let AdminRewardClaimsController = class AdminRewardClaimsController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    makeCode() {
        const hex = (0, node_crypto_1.randomBytes)(6).toString('hex').toUpperCase();
        return `PRV-${hex}`;
    }
    async list(statusRaw) {
        const status = statusRaw === 'APPROVED' || statusRaw === 'REJECTED' || statusRaw === 'PENDING' ? statusRaw : 'PENDING';
        return this.prisma.rewardClaim.findMany({
            where: { status },
            include: { user: true, reward: true },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });
    }
    async verify(codeRaw) {
        const code = String(codeRaw ?? '').trim().toUpperCase();
        if (!code)
            throw new common_1.BadRequestException('code is required');
        const claim = await this.prisma.rewardClaim.findFirst({
            where: { redeemCode: code },
            include: { user: true, reward: true },
        });
        if (!claim)
            throw new common_1.NotFoundException('Not found');
        return claim;
    }
    async approve(req, id) {
        const claim = await this.prisma.rewardClaim.findUnique({
            where: { id },
            include: { reward: true, user: true },
        });
        if (!claim)
            throw new common_1.NotFoundException('Not found');
        if (claim.status !== 'PENDING')
            throw new common_1.BadRequestException('Claim not pending');
        const updated = await this.prisma.$transaction(async (tx) => {
            const user = await tx.userProfile.findUnique({ where: { id: claim.userId }, select: { pointsBalance: true } });
            if (!user)
                throw new common_1.NotFoundException('Not found');
            if (user.pointsBalance < claim.pointsCostAtClaim)
                throw new common_1.BadRequestException('User has insufficient points');
            if (claim.reward.stock != null && claim.reward.stock <= 0)
                throw new common_1.BadRequestException('Reward out of stock');
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
            if (claim.reward.grantsFreeTrip) {
                let redeemCode = null;
                for (let i = 0; i < 5; i++) {
                    const next = this.makeCode();
                    try {
                        await tx.rewardClaim.update({ where: { id: claim.id }, data: { redeemCode: next } });
                        redeemCode = next;
                        break;
                    }
                    catch (e) {
                        const isUnique = e instanceof client_1.Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
                        if (!isUnique)
                            throw e;
                    }
                }
                if (!redeemCode)
                    throw new common_1.BadRequestException('Could not generate redeem code');
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
    async reject(req, id, body) {
        const claim = await this.prisma.rewardClaim.findUnique({ where: { id } });
        if (!claim)
            throw new common_1.NotFoundException('Not found');
        if (claim.status !== 'PENDING')
            throw new common_1.BadRequestException('Claim not pending');
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
};
exports.AdminRewardClaimsController = AdminRewardClaimsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminRewardClaimsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('verify'),
    __param(0, (0, common_1.Query)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminRewardClaimsController.prototype, "verify", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminRewardClaimsController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminRewardClaimsController.prototype, "reject", null);
exports.AdminRewardClaimsController = AdminRewardClaimsController = __decorate([
    (0, common_1.Controller)('admin/reward-claims'),
    (0, auth_guard_1.RequireAuth)('SUPER_ADMIN'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminRewardClaimsController);
//# sourceMappingURL=reward-claims.controller.js.map