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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const auth_guard_1 = require("../auth/auth.guard");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = require("node:crypto");
const class_validator_1 = require("class-validator");
class UpdateMeProfileDto {
    nickname;
    displayNamePreference;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(60),
    __metadata("design:type", String)
], UpdateMeProfileDto.prototype, "nickname", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['FULL_NAME', 'NICKNAME']),
    __metadata("design:type", String)
], UpdateMeProfileDto.prototype, "displayNamePreference", void 0);
let MeController = class MeController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async myProfile(req) {
        const user = await this.prisma.userProfile.findUnique({ where: { id: req.user.id } });
        if (!user)
            throw new Error('User not found');
        return {
            id: user.id,
            email: user.email,
            role: user.role,
            status: user.status,
            displayName: user.displayName,
            nickname: user.nickname ?? null,
            displayNamePreference: user.displayNamePreference ?? 'FULL_NAME',
            displayLabel: req.user.displayLabel,
            profilePhotoUrl: user.profilePhotoUrl ?? null,
        };
    }
    async updateProfile(req, dto) {
        const nextPref = dto.displayNamePreference;
        const nextNick = dto.nickname != null ? String(dto.nickname).trim() : undefined;
        if (nextPref === 'NICKNAME' && (nextNick == null || nextNick.length === 0)) {
            throw new common_1.BadRequestException('nickname is required when displayNamePreference=NICKNAME');
        }
        await this.prisma.userProfile.update({
            where: { id: req.user.id },
            data: {
                nickname: nextNick === undefined ? undefined : nextNick ? nextNick : null,
                displayNamePreference: nextPref,
            },
        });
        return { ok: true };
    }
    async uploadProfilePhoto(req, file) {
        if (!file)
            throw new common_1.BadRequestException('file is required');
        const url = `/files/profile-photos/${encodeURIComponent(file.filename)}`;
        await this.prisma.userProfile.update({
            where: { id: req.user.id },
            data: { profilePhotoUrl: url },
        });
        return { profilePhotoUrl: url };
    }
    async myWhatsappGroups(req) {
        const main = await this.prisma.whatsappGroup.findFirst({
            where: { kind: 'MAIN', isActive: true },
            orderBy: { createdAt: 'asc' },
        });
        if (req.user.role === 'SUPER_ADMIN') {
            const joinable = await this.prisma.whatsappGroup.findMany({
                where: { kind: { not: 'MAIN' }, isActive: true },
                include: { province: true },
                orderBy: [{ kind: 'asc' }, { name: 'asc' }],
            });
            return {
                main: main ? { id: main.id, name: main.name, banned: false, note: 'Admin agrega manualmente al grupo principal.' } : null,
                joinable,
            };
        }
        const user = await this.prisma.userProfile.findUnique({ where: { id: req.user.id } });
        if (!user)
            throw new Error('User not found');
        const memberProvinces = await this.prisma.memberProvince.findMany({
            where: { userId: user.id },
            select: { provinceId: true },
        });
        const provinceIds = memberProvinces.length
            ? memberProvinces.map((p) => p.provinceId)
            : user.primaryProvinceId
                ? [user.primaryProvinceId]
                : [];
        const granted = await this.prisma.groupAccess.findMany({
            where: { userId: user.id },
            select: { groupId: true },
        });
        const grantedIds = granted.map((g) => g.groupId);
        const joinable = await this.prisma.whatsappGroup.findMany({
            where: {
                kind: { not: 'MAIN' },
                isActive: true,
                OR: [
                    { provinceId: { in: provinceIds.length ? provinceIds : [-1] } },
                    { id: { in: grantedIds.length ? grantedIds : ['00000000-0000-0000-0000-000000000000'] } },
                ],
            },
            include: { province: true },
            orderBy: [{ kind: 'asc' }, { name: 'asc' }],
        });
        return {
            main: main
                ? {
                    id: main.id,
                    name: main.name,
                    banned: user.isBannedFromMain,
                    note: user.isBannedFromMain
                        ? 'Estas baneado del grupo principal.'
                        : 'El admin te agrega manualmente al grupo principal (no hay link publico).',
                }
                : null,
            joinable,
        };
    }
    async groupCatalog(req) {
        const user = await this.prisma.userProfile.findUnique({ where: { id: req.user.id } });
        if (!user)
            throw new Error('User not found');
        const main = await this.prisma.whatsappGroup.findFirst({
            where: { kind: 'MAIN', isActive: true },
            orderBy: { createdAt: 'asc' },
        });
        const memberProvinces = await this.prisma.memberProvince.findMany({
            where: { userId: user.id },
            select: { provinceId: true },
        });
        const provinceIds = memberProvinces.length
            ? memberProvinces.map((p) => p.provinceId)
            : user.primaryProvinceId
                ? [user.primaryProvinceId]
                : [];
        const granted = await this.prisma.groupAccess.findMany({
            where: { userId: user.id },
            select: { groupId: true },
        });
        const grantedIds = new Set(granted.map((g) => g.groupId));
        const provinceGroups = await this.prisma.whatsappGroup.findMany({
            where: {
                kind: { not: 'MAIN' },
                isActive: true,
                provinceId: { in: provinceIds.length ? provinceIds : [-1] },
            },
            select: { id: true },
        });
        const joinableIds = new Set([...provinceGroups.map((g) => g.id), ...Array.from(grantedIds)]);
        const pending = await this.prisma.whatsappGroupJoinRequest.findMany({
            where: { userId: user.id, status: 'PENDING' },
            select: { groupId: true },
        });
        const pendingIds = new Set(pending.map((p) => p.groupId));
        const all = await this.prisma.whatsappGroup.findMany({
            where: { isActive: true, kind: { not: 'MAIN' } },
            include: { province: true },
            orderBy: [{ kind: 'asc' }, { name: 'asc' }],
        });
        return {
            main: main
                ? {
                    id: main.id,
                    name: main.name,
                    banned: user.isBannedFromMain,
                    note: user.isBannedFromMain
                        ? 'Estas baneado del grupo principal.'
                        : 'El admin te agrega manualmente al grupo principal (no hay link publico).',
                }
                : null,
            groups: all.map((g) => {
                const allowed = joinableIds.has(g.id);
                const requested = pendingIds.has(g.id);
                return {
                    id: g.id,
                    kind: g.kind,
                    name: g.name,
                    province: g.province,
                    status: allowed ? 'ALLOWED' : requested ? 'REQUESTED' : 'AVAILABLE',
                    url: allowed ? g.url : null,
                };
            }),
        };
    }
    async requestGroup(req, groupId) {
        const group = await this.prisma.whatsappGroup.findUnique({ where: { id: groupId } });
        if (!group || !group.isActive)
            throw new common_1.NotFoundException('Group not found');
        if (group.kind === 'MAIN')
            throw new common_1.BadRequestException('MAIN group is managed manually');
        if (group.provinceId) {
            const user = await this.prisma.userProfile.findUnique({ where: { id: req.user.id } });
            if (user) {
                const memberProvinces = await this.prisma.memberProvince.findMany({
                    where: { userId: user.id },
                    select: { provinceId: true },
                });
                const provinceIds = memberProvinces.length
                    ? memberProvinces.map((p) => p.provinceId)
                    : user.primaryProvinceId
                        ? [user.primaryProvinceId]
                        : [];
                if (provinceIds.includes(group.provinceId))
                    return { ok: true };
            }
        }
        const existingAccess = await this.prisma.groupAccess.findUnique({
            where: { userId_groupId: { userId: req.user.id, groupId } },
        });
        if (existingAccess)
            return { ok: true };
        const existing = await this.prisma.whatsappGroupJoinRequest.findUnique({
            where: { userId_groupId: { userId: req.user.id, groupId } },
        });
        if (existing) {
            if (existing.status === 'PENDING')
                return existing;
            if (existing.status === 'APPROVED')
                return { ok: true };
            return this.prisma.whatsappGroupJoinRequest.update({
                where: { id: existing.id },
                data: { status: 'PENDING', reviewedAt: null, reviewedByUserId: null, reviewNote: null },
            });
        }
        return this.prisma.whatsappGroupJoinRequest.create({
            data: { userId: req.user.id, groupId, status: 'PENDING' },
        });
    }
};
exports.MeController = MeController;
__decorate([
    (0, common_1.Get)('profile'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MeController.prototype, "myProfile", null);
__decorate([
    (0, common_1.Patch)('profile'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, UpdateMeProfileDto]),
    __metadata("design:returntype", Promise)
], MeController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Post)('profile-photo'),
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
                const userId = String(req.user?.id ?? 'user');
                cb(null, `${userId}-${(0, node_crypto_1.randomUUID)()}${safeExt}`);
            },
        }),
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            const ok = file.mimetype === 'image/jpeg' ||
                file.mimetype === 'image/png' ||
                file.mimetype === 'image/webp';
            cb(ok ? null : new Error('Only JPG/PNG/WEBP allowed'), ok);
        },
    })),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MeController.prototype, "uploadProfilePhoto", null);
__decorate([
    (0, common_1.Get)('whatsapp-groups'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MeController.prototype, "myWhatsappGroups", null);
__decorate([
    (0, common_1.Get)('whatsapp-groups/catalog'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MeController.prototype, "groupCatalog", null);
__decorate([
    (0, common_1.Post)('whatsapp-groups/:groupId/request'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('groupId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], MeController.prototype, "requestGroup", null);
exports.MeController = MeController = __decorate([
    (0, common_1.Controller)('me'),
    (0, auth_guard_1.RequireAuth)('SUPER_ADMIN', 'PROVINCE_ADMIN', 'MEMBER'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MeController);
//# sourceMappingURL=me.controller.js.map