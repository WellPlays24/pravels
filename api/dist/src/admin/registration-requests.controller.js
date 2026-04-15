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
exports.AdminRegistrationRequestsController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const auth_guard_1 = require("../auth/auth.guard");
const node_crypto_1 = require("node:crypto");
let AdminRegistrationRequestsController = class AdminRegistrationRequestsController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(req, statusRaw) {
        const status = statusRaw === 'APPROVED' || statusRaw === 'REJECTED' ? statusRaw : 'PENDING';
        if (req.user.role === 'PROVINCE_ADMIN') {
            const adminProvinces = await this.prisma.adminProvince.findMany({
                where: { userId: req.user.id },
                select: { provinceId: true },
            });
            const provinceIds = adminProvinces.map((x) => x.provinceId);
            return this.prisma.registrationRequest.findMany({
                where: {
                    status,
                    priorityProvinceId: { in: provinceIds },
                },
                include: {
                    priorityProvince: true,
                    priorityCanton: true,
                    requestedProvinces: { include: { province: true } },
                },
                orderBy: { submittedAt: 'desc' },
            });
        }
        return this.prisma.registrationRequest.findMany({
            where: { status },
            include: {
                priorityProvince: true,
                priorityCanton: true,
                requestedProvinces: { include: { province: true } },
            },
            orderBy: { submittedAt: 'desc' },
        });
    }
    async get(req, id) {
        const rr = await this.prisma.registrationRequest.findUnique({
            where: { id },
            include: {
                priorityProvince: true,
                priorityCanton: true,
                requestedProvinces: { include: { province: true } },
            },
        });
        if (!rr)
            throw new common_1.NotFoundException('Not found');
        if (req.user.role === 'PROVINCE_ADMIN') {
            const allowed = await this.prisma.adminProvince.findFirst({
                where: { userId: req.user.id, provinceId: rr.priorityProvinceId },
            });
            if (!allowed)
                throw new common_1.BadRequestException('Not allowed');
        }
        return rr;
    }
    async approve(req, id) {
        const rr = await this.prisma.registrationRequest.findUnique({
            where: { id },
            include: { requestedProvinces: true },
        });
        if (!rr)
            throw new common_1.NotFoundException('Not found');
        if (rr.status !== 'PENDING')
            throw new common_1.BadRequestException('Request not pending');
        if (req.user.role === 'PROVINCE_ADMIN') {
            const allowed = await this.prisma.adminProvince.findFirst({
                where: { userId: req.user.id, provinceId: rr.priorityProvinceId },
            });
            if (!allowed)
                throw new common_1.BadRequestException('Not allowed');
        }
        const provinceIds = Array.from(new Set([
            rr.priorityProvinceId,
            ...rr.requestedProvinces.map((p) => p.provinceId),
        ]));
        const user = await this.prisma.userProfile.upsert({
            where: { email: rr.email },
            update: {
                role: 'MEMBER',
                status: 'APPROVED',
                phone: rr.phone,
                displayName: rr.fullName,
                nickname: rr.nickname,
                displayNamePreference: rr.displayNamePreference,
                profilePhotoUrl: rr.profilePhotoUrl,
                primaryProvinceId: rr.priorityProvinceId,
                primaryCantonId: rr.priorityCantonId,
            },
            create: {
                id: (0, node_crypto_1.randomUUID)(),
                email: rr.email,
                role: 'MEMBER',
                status: 'APPROVED',
                phone: rr.phone,
                displayName: rr.fullName,
                nickname: rr.nickname,
                displayNamePreference: rr.displayNamePreference,
                profilePhotoUrl: rr.profilePhotoUrl,
                primaryProvinceId: rr.priorityProvinceId,
                primaryCantonId: rr.priorityCantonId,
            },
        });
        await this.prisma.localCredential.upsert({
            where: { userId: user.id },
            update: { passwordHash: rr.passwordHash },
            create: { userId: user.id, passwordHash: rr.passwordHash },
        });
        for (const provinceId of provinceIds) {
            await this.prisma.memberProvince.upsert({
                where: { userId_provinceId: { userId: user.id, provinceId } },
                update: {},
                create: { userId: user.id, provinceId, grantedByUserId: req.user.id },
            });
        }
        await this.prisma.registrationRequest.update({
            where: { id: rr.id },
            data: {
                status: 'APPROVED',
                reviewedAt: new Date(),
                reviewedByUserId: req.user.id,
                reviewNote: null,
            },
        });
        return { ok: true };
    }
    async reject(req, id, body) {
        const rr = await this.prisma.registrationRequest.findUnique({ where: { id } });
        if (!rr)
            throw new common_1.NotFoundException('Not found');
        if (rr.status !== 'PENDING')
            throw new common_1.BadRequestException('Request not pending');
        if (req.user.role === 'PROVINCE_ADMIN') {
            const allowed = await this.prisma.adminProvince.findFirst({
                where: { userId: req.user.id, provinceId: rr.priorityProvinceId },
            });
            if (!allowed)
                throw new common_1.BadRequestException('Not allowed');
        }
        const note = body?.note ? String(body.note) : null;
        await this.prisma.registrationRequest.update({
            where: { id },
            data: {
                status: 'REJECTED',
                reviewedAt: new Date(),
                reviewedByUserId: req.user.id,
                reviewNote: note,
            },
        });
        return { ok: true };
    }
};
exports.AdminRegistrationRequestsController = AdminRegistrationRequestsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminRegistrationRequestsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminRegistrationRequestsController.prototype, "get", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminRegistrationRequestsController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminRegistrationRequestsController.prototype, "reject", null);
exports.AdminRegistrationRequestsController = AdminRegistrationRequestsController = __decorate([
    (0, common_1.Controller)('admin/registration-requests'),
    (0, auth_guard_1.RequireAuth)('SUPER_ADMIN', 'PROVINCE_ADMIN'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminRegistrationRequestsController);
//# sourceMappingURL=registration-requests.controller.js.map