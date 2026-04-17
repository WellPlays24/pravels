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
exports.AdminPointRulesController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const auth_guard_1 = require("../auth/auth.guard");
let AdminPointRulesController = class AdminPointRulesController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list() {
        return this.prisma.pointRule.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
    }
    async create(body) {
        const title = String(body?.title ?? '').trim();
        const description = body?.description == null ? null : String(body.description);
        const points = Number(body?.points);
        const isActive = body?.isActive === undefined ? true : Boolean(body.isActive);
        const sortOrder = body?.sortOrder === undefined ? 0 : Number(body.sortOrder);
        if (!title)
            throw new common_1.BadRequestException('title is required');
        if (!Number.isInteger(points) || points <= 0)
            throw new common_1.BadRequestException('points must be a positive integer');
        if (!Number.isInteger(sortOrder))
            throw new common_1.BadRequestException('sortOrder must be integer');
        return this.prisma.pointRule.create({
            data: { title, description, points, isActive, sortOrder },
        });
    }
    async update(id, body) {
        const existing = await this.prisma.pointRule.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Not found');
        const data = {};
        if (body?.title !== undefined) {
            const title = String(body.title ?? '').trim();
            if (!title)
                throw new common_1.BadRequestException('title is required');
            data.title = title;
        }
        if (body?.description !== undefined)
            data.description = body.description == null ? null : String(body.description);
        if (body?.points !== undefined) {
            const points = Number(body.points);
            if (!Number.isInteger(points) || points <= 0)
                throw new common_1.BadRequestException('points must be a positive integer');
            data.points = points;
        }
        if (body?.isActive !== undefined)
            data.isActive = Boolean(body.isActive);
        if (body?.sortOrder !== undefined) {
            const sortOrder = Number(body.sortOrder);
            if (!Number.isInteger(sortOrder))
                throw new common_1.BadRequestException('sortOrder must be integer');
            data.sortOrder = sortOrder;
        }
        return this.prisma.pointRule.update({ where: { id }, data });
    }
    async remove(id) {
        const existing = await this.prisma.pointRule.findUnique({ where: { id } });
        if (!existing)
            return { ok: true };
        await this.prisma.pointRule.delete({ where: { id } });
        return { ok: true };
    }
};
exports.AdminPointRulesController = AdminPointRulesController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminPointRulesController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminPointRulesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminPointRulesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminPointRulesController.prototype, "remove", null);
exports.AdminPointRulesController = AdminPointRulesController = __decorate([
    (0, common_1.Controller)('admin/point-rules'),
    (0, auth_guard_1.RequireAuth)('SUPER_ADMIN'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminPointRulesController);
//# sourceMappingURL=points-rules.controller.js.map