"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminUsersController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const auth_guard_1 = require("../auth/auth.guard");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = require("node:crypto");
const bcrypt = __importStar(require("bcrypt"));
let AdminUsersController = class AdminUsersController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    parseDateOnly(value) {
        const s = String(value ?? '').trim();
        const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(s);
        if (!m)
            throw new common_1.BadRequestException('birthDate must be YYYY-MM-DD');
        const y = Number(m[1]);
        const mm = Number(m[2]);
        const d = Number(m[3]);
        if (!Number.isInteger(y) || !Number.isInteger(mm) || !Number.isInteger(d))
            throw new common_1.BadRequestException('Invalid birthDate');
        if (mm < 1 || mm > 12 || d < 1 || d > 31)
            throw new common_1.BadRequestException('Invalid birthDate');
        return new Date(Date.UTC(y, mm - 1, d));
    }
    addMonths(d, months) {
        const x = new Date(d);
        x.setMonth(x.getMonth() + months);
        return x;
    }
    async allowedProvinceIds(req) {
        if (req.user.role !== 'PROVINCE_ADMIN')
            return null;
        const adminProvinces = await this.prisma.adminProvince.findMany({
            where: { userId: req.user.id },
            select: { provinceId: true },
        });
        if (adminProvinces.length)
            return adminProvinces.map((x) => x.provinceId);
        const me = await this.prisma.userProfile.findUnique({
            where: { id: req.user.id },
            select: { primaryProvinceId: true },
        });
        return me?.primaryProvinceId ? [me.primaryProvinceId] : [];
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
                birthDate: true,
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
            if (body?.email !== undefined) {
                const next = String(body.email ?? '').toLowerCase().trim();
                if (!next || !next.includes('@'))
                    throw new common_1.BadRequestException('Invalid email');
                data.email = next;
            }
            if (body?.birthDate !== undefined) {
                if (!body.birthDate)
                    data.birthDate = null;
                else
                    data.birthDate = this.parseDateOnly(String(body.birthDate));
            }
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
    async uploadProfilePhoto(req, id, file) {
        if (req.user.role !== 'SUPER_ADMIN')
            throw new common_1.BadRequestException('Not allowed');
        if (!file)
            throw new common_1.BadRequestException('file is required');
        const user = await this.prisma.userProfile.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('Not found');
        const url = `/files/profile-photos/${encodeURIComponent(file.filename)}`;
        await this.prisma.userProfile.update({ where: { id }, data: { profilePhotoUrl: url } });
        return { profilePhotoUrl: url };
    }
    async setPassword(req, id, body) {
        if (req.user.role !== 'SUPER_ADMIN')
            throw new common_1.BadRequestException('Not allowed');
        const password = String(body?.password ?? '');
        if (password.length < 6)
            throw new common_1.BadRequestException('Password must be at least 6 chars');
        const user = await this.prisma.userProfile.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('Not found');
        const hash = await bcrypt.hash(password, 10);
        await this.prisma.localCredential.upsert({
            where: { userId: id },
            update: { passwordHash: hash },
            create: { userId: id, passwordHash: hash },
        });
        return { ok: true };
    }
    async listStrikes(req, id) {
        const user = await this.prisma.userProfile.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('Not found');
        const allowed = await this.allowedProvinceIds(req);
        if (allowed && user.primaryProvinceId && !allowed.includes(user.primaryProvinceId)) {
            throw new common_1.BadRequestException('Not allowed');
        }
        const now = new Date();
        const strikes = await this.prisma.userStrike.findMany({
            where: { userId: id },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        const activeCount = await this.prisma.userStrike.count({
            where: { userId: id, expiresAt: { gt: now } },
        });
        return {
            activeCount,
            isBannedFromMain: user.isBannedFromMain,
            isPermanentlyBanned: user.isPermanentlyBanned ?? false,
            strikes,
        };
    }
    async addStrike(req, id, body) {
        const user = await this.prisma.userProfile.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('Not found');
        const allowed = await this.allowedProvinceIds(req);
        if (allowed && user.primaryProvinceId && !allowed.includes(user.primaryProvinceId)) {
            throw new common_1.BadRequestException('Not allowed');
        }
        const note = body?.note ? String(body.note) : null;
        const now = new Date();
        const expiresAt = this.addMonths(now, 2);
        await this.prisma.userStrike.create({
            data: {
                userId: id,
                createdByUserId: req.user.id,
                note,
                expiresAt,
            },
        });
        const activeCount = await this.prisma.userStrike.count({
            where: { userId: id, expiresAt: { gt: now } },
        });
        if (activeCount >= 2 && !user.isPermanentlyBanned) {
            await this.prisma.userProfile.update({
                where: { id },
                data: { isBannedFromMain: true },
            });
        }
        return { ok: true, activeCount };
    }
    async unbanAndReset(req, id) {
        const user = await this.prisma.userProfile.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('Not found');
        if (req.user.role !== 'SUPER_ADMIN')
            throw new common_1.BadRequestException('Not allowed');
        await this.prisma.userStrike.deleteMany({ where: { userId: id } });
        await this.prisma.userProfile.update({
            where: { id },
            data: { isBannedFromMain: false, isPermanentlyBanned: false },
        });
        return { ok: true };
    }
    async banPermanent(req, id) {
        if (req.user.role !== 'SUPER_ADMIN')
            throw new common_1.BadRequestException('Not allowed');
        const user = await this.prisma.userProfile.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('Not found');
        await this.prisma.userProfile.update({
            where: { id },
            data: { isBannedFromMain: true, isPermanentlyBanned: true },
        });
        return { ok: true };
    }
    async points(req, id) {
        const user = await this.prisma.userProfile.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('Not found');
        const allowed = await this.allowedProvinceIds(req);
        if (allowed && user.primaryProvinceId && !allowed.includes(user.primaryProvinceId)) {
            throw new common_1.BadRequestException('Not allowed');
        }
        const tx = await this.prisma.pointTransaction.findMany({
            where: { userId: id },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: { createdBy: { select: { id: true, email: true, displayName: true } } },
        });
        return {
            pointsBalance: user.pointsBalance,
            transactions: tx.map((t) => ({
                id: t.id,
                delta: t.delta,
                reason: t.reason,
                createdAt: t.createdAt,
                createdBy: t.createdBy
                    ? { id: t.createdBy.id, email: t.createdBy.email, displayName: t.createdBy.displayName }
                    : null,
            })),
        };
    }
    async addPoints(req, id, body) {
        const user = await this.prisma.userProfile.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('Not found');
        const allowed = await this.allowedProvinceIds(req);
        if (allowed && user.primaryProvinceId && !allowed.includes(user.primaryProvinceId)) {
            throw new common_1.BadRequestException('Not allowed');
        }
        const delta = Number(body?.delta);
        const reason = String(body?.reason ?? '').trim();
        if (!Number.isInteger(delta) || delta === 0)
            throw new common_1.BadRequestException('delta must be a non-zero integer');
        if (Math.abs(delta) > 10000)
            throw new common_1.BadRequestException('delta too large');
        if (!reason)
            throw new common_1.BadRequestException('reason is required');
        return this.prisma.$transaction(async (tx) => {
            const fresh = await tx.userProfile.findUnique({ where: { id }, select: { pointsBalance: true } });
            if (!fresh)
                throw new common_1.NotFoundException('Not found');
            const next = fresh.pointsBalance + delta;
            if (next < 0)
                throw new common_1.BadRequestException('pointsBalance cannot go below 0');
            await tx.userProfile.update({ where: { id }, data: { pointsBalance: next } });
            await tx.pointTransaction.create({
                data: { userId: id, delta, reason, createdByUserId: req.user.id },
            });
            return { ok: true, pointsBalance: next };
        });
    }
    async resetPoints(req, id) {
        if (req.user.role !== 'SUPER_ADMIN')
            throw new common_1.BadRequestException('Not allowed');
        const user = await this.prisma.userProfile.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('Not found');
        return this.prisma.$transaction(async (tx) => {
            const fresh = await tx.userProfile.findUnique({ where: { id }, select: { pointsBalance: true } });
            if (!fresh)
                throw new common_1.NotFoundException('Not found');
            const current = fresh.pointsBalance;
            if (current !== 0) {
                await tx.pointTransaction.create({
                    data: {
                        userId: id,
                        delta: -current,
                        reason: 'Reset de puntos por admin',
                        createdByUserId: req.user.id,
                    },
                });
            }
            await tx.userProfile.update({ where: { id }, data: { pointsBalance: 0 } });
            return { ok: true, pointsBalance: 0 };
        });
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
__decorate([
    (0, common_1.Post)(':id/profile-photo'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: (_req, _file, cb) => {
                const dir = process.env.PRAVELS_PROFILE_PHOTOS_DIR;
                if (!dir)
                    return cb(new Error('PRAVELS_PROFILE_PHOTOS_DIR is not set'), dir);
                cb(null, dir);
            },
            filename: (req, file, cb) => {
                const ext = node_path_1.default.extname(file.originalname || '').toLowerCase();
                const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
                const userId = String(req.params?.id ?? 'user');
                cb(null, `${userId}-${(0, node_crypto_1.randomUUID)()}${safeExt}`);
            },
        }),
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            const ok = file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/webp';
            cb(ok ? null : new Error('Only JPG/PNG/WEBP allowed'), ok);
        },
    })),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "uploadProfilePhoto", null);
__decorate([
    (0, common_1.Post)(':id/password'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "setPassword", null);
__decorate([
    (0, common_1.Get)(':id/strikes'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "listStrikes", null);
__decorate([
    (0, common_1.Post)(':id/strikes'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "addStrike", null);
__decorate([
    (0, common_1.Post)(':id/unban-reset'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "unbanAndReset", null);
__decorate([
    (0, common_1.Post)(':id/ban-permanent'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "banPermanent", null);
__decorate([
    (0, common_1.Get)(':id/points'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "points", null);
__decorate([
    (0, common_1.Post)(':id/points'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "addPoints", null);
__decorate([
    (0, common_1.Post)(':id/points/reset'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "resetPoints", null);
exports.AdminUsersController = AdminUsersController = __decorate([
    (0, common_1.Controller)('admin/users'),
    (0, auth_guard_1.RequireAuth)('SUPER_ADMIN', 'PROVINCE_ADMIN'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminUsersController);
//# sourceMappingURL=users.controller.js.map