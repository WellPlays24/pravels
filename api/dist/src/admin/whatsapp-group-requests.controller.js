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
exports.AdminWhatsappGroupRequestsController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const auth_guard_1 = require("../auth/auth.guard");
let AdminWhatsappGroupRequestsController = class AdminWhatsappGroupRequestsController {
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
    async list(req, statusRaw) {
        const status = statusRaw === 'APPROVED' || statusRaw === 'REJECTED' || statusRaw === 'PENDING'
            ? statusRaw
            : 'PENDING';
        const where = { status };
        const allowed = await this.allowedProvinceIds(req);
        if (allowed) {
            where.group = {
                OR: [{ kind: 'MAIN' }, { provinceId: { in: allowed.length ? allowed : [-1] } }],
            };
        }
        return this.prisma.whatsappGroupJoinRequest.findMany({
            where,
            include: {
                user: true,
                group: { include: { province: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 300,
        });
    }
    async approve(req, id) {
        const r = await this.prisma.whatsappGroupJoinRequest.findUnique({
            where: { id },
            include: { group: true },
        });
        if (!r)
            throw new common_1.NotFoundException('Not found');
        if (r.status !== 'PENDING')
            throw new common_1.BadRequestException('Request not pending');
        if (r.group.kind === 'MAIN') {
            throw new common_1.BadRequestException('MAIN group is managed manually');
        }
        if (!r.group.isActive)
            throw new common_1.BadRequestException('Group is not active');
        if (req.user.role === 'PROVINCE_ADMIN') {
            const allowed = await this.allowedProvinceIds(req);
            if (!allowed)
                throw new common_1.BadRequestException('Not allowed');
            const provinceId = r.group.provinceId;
            if (provinceId && !allowed.includes(provinceId))
                throw new common_1.BadRequestException('Not allowed');
        }
        await this.prisma.groupAccess.upsert({
            where: { userId_groupId: { userId: r.userId, groupId: r.groupId } },
            update: { grantedByUserId: req.user.id },
            create: { userId: r.userId, groupId: r.groupId, grantedByUserId: req.user.id },
        });
        return this.prisma.whatsappGroupJoinRequest.update({
            where: { id: r.id },
            data: {
                status: 'APPROVED',
                reviewedAt: new Date(),
                reviewedByUserId: req.user.id,
                reviewNote: null,
            },
        });
    }
    async reject(req, id, body) {
        const r = await this.prisma.whatsappGroupJoinRequest.findUnique({
            where: { id },
            include: { group: true },
        });
        if (!r)
            throw new common_1.NotFoundException('Not found');
        if (r.status !== 'PENDING')
            throw new common_1.BadRequestException('Request not pending');
        if (req.user.role === 'PROVINCE_ADMIN') {
            const allowed = await this.allowedProvinceIds(req);
            if (!allowed)
                throw new common_1.BadRequestException('Not allowed');
            const provinceId = r.group.provinceId;
            if (provinceId && !allowed.includes(provinceId))
                throw new common_1.BadRequestException('Not allowed');
        }
        const note = body?.note ? String(body.note) : null;
        return this.prisma.whatsappGroupJoinRequest.update({
            where: { id: r.id },
            data: {
                status: 'REJECTED',
                reviewedAt: new Date(),
                reviewedByUserId: req.user.id,
                reviewNote: note,
            },
        });
    }
};
exports.AdminWhatsappGroupRequestsController = AdminWhatsappGroupRequestsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminWhatsappGroupRequestsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminWhatsappGroupRequestsController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminWhatsappGroupRequestsController.prototype, "reject", null);
exports.AdminWhatsappGroupRequestsController = AdminWhatsappGroupRequestsController = __decorate([
    (0, common_1.Controller)('admin/whatsapp-group-requests'),
    (0, auth_guard_1.RequireAuth)('SUPER_ADMIN', 'PROVINCE_ADMIN'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminWhatsappGroupRequestsController);
//# sourceMappingURL=whatsapp-group-requests.controller.js.map