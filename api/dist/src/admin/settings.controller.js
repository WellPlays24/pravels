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
exports.AdminSettingsController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const auth_guard_1 = require("../auth/auth.guard");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = require("node:crypto");
let AdminSettingsController = class AdminSettingsController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async ensure() {
        return this.prisma.generalSetting.upsert({
            where: { id: 'global' },
            update: {},
            create: { id: 'global', communityName: 'Pravels' },
        });
    }
    async get() {
        return this.ensure();
    }
    async update(body) {
        await this.ensure();
        const data = {};
        if (body?.communityName !== undefined) {
            const v = String(body.communityName ?? '').trim();
            if (!v)
                throw new common_1.BadRequestException('communityName is required');
            if (v.length > 60)
                throw new common_1.BadRequestException('communityName too long');
            data.communityName = v;
        }
        if (body?.logoUrl !== undefined) {
            const v = body.logoUrl ? String(body.logoUrl) : null;
            data.logoUrl = v;
        }
        if (body?.supportUserId !== undefined) {
            const v = body.supportUserId ? String(body.supportUserId) : null;
            data.supportUserId = v;
        }
        return this.prisma.generalSetting.update({ where: { id: 'global' }, data });
    }
    async uploadLogo(file) {
        if (!file)
            throw new common_1.BadRequestException('file is required');
        await this.ensure();
        const url = `/files/content/${encodeURIComponent(file.filename)}`;
        await this.prisma.generalSetting.update({ where: { id: 'global' }, data: { logoUrl: url } });
        return { url };
    }
};
exports.AdminSettingsController = AdminSettingsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminSettingsController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminSettingsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)('logo/upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: (_req, _file, cb) => {
                const dir = process.env.PRAVELS_CONTENT_DIR;
                if (!dir)
                    return cb(new Error('PRAVELS_CONTENT_DIR is not set'), dir);
                cb(null, dir);
            },
            filename: (_req, file, cb) => {
                const ext = node_path_1.default.extname(file.originalname || '').toLowerCase();
                const safeExt = ['.jpg', '.jpeg', '.png'].includes(ext) ? ext : '.png';
                cb(null, `community-logo-${(0, node_crypto_1.randomUUID)()}${safeExt}`);
            },
        }),
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            const ok = file.mimetype === 'image/jpeg' || file.mimetype === 'image/png';
            cb(ok ? null : new Error('Only JPG/PNG allowed'), ok);
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminSettingsController.prototype, "uploadLogo", null);
exports.AdminSettingsController = AdminSettingsController = __decorate([
    (0, common_1.Controller)('admin/settings'),
    (0, auth_guard_1.RequireAuth)('SUPER_ADMIN'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminSettingsController);
//# sourceMappingURL=settings.controller.js.map