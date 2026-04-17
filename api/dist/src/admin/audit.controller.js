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
exports.AdminAuditController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../auth/auth.guard");
const prisma_service_1 = require("../prisma/prisma.service");
let AdminAuditController = class AdminAuditController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(qRaw, eventRaw, methodRaw, statusRaw, cursorRaw, takeRaw) {
        const take = takeRaw ? Math.max(1, Math.min(100, Number(takeRaw) || 30)) : 30;
        const cursor = cursorRaw ? String(cursorRaw) : null;
        const where = {};
        const q = String(qRaw ?? '').trim();
        if (q) {
            where.OR = [
                { path: { contains: q, mode: 'insensitive' } },
                { event: { contains: q, mode: 'insensitive' } },
                { actor: { email: { contains: q, mode: 'insensitive' } } },
            ];
        }
        if (eventRaw)
            where.event = String(eventRaw);
        if (methodRaw)
            where.method = String(methodRaw).toUpperCase();
        if (statusRaw) {
            const s = Number(statusRaw);
            if (!Number.isInteger(s))
                throw new common_1.BadRequestException('status must be integer');
            where.statusCode = s;
        }
        const items = await this.prisma.auditLog.findMany({
            where,
            include: { actor: { select: { id: true, email: true, role: true } } },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: take + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
        const hasMore = items.length > take;
        const page = hasMore ? items.slice(0, take) : items;
        const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;
        return {
            items: page,
            nextCursor,
        };
    }
};
exports.AdminAuditController = AdminAuditController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('event')),
    __param(2, (0, common_1.Query)('method')),
    __param(3, (0, common_1.Query)('status')),
    __param(4, (0, common_1.Query)('cursor')),
    __param(5, (0, common_1.Query)('take')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminAuditController.prototype, "list", null);
exports.AdminAuditController = AdminAuditController = __decorate([
    (0, common_1.Controller)('admin/audit-logs'),
    (0, auth_guard_1.RequireAuth)('SUPER_ADMIN'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminAuditController);
//# sourceMappingURL=audit.controller.js.map