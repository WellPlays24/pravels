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
exports.AdminContentPagesController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const auth_guard_1 = require("../auth/auth.guard");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = require("node:crypto");
let AdminContentPagesController = class AdminContentPagesController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list() {
        return this.prisma.contentPage.findMany({
            select: { id: true, slug: true, title: true, updatedAt: true },
            orderBy: { slug: 'asc' },
        });
    }
    async get(id) {
        const page = await this.prisma.contentPage.findUnique({ where: { id } });
        if (!page)
            throw new common_1.NotFoundException('Not found');
        return page;
    }
    async uploadAsset(id, file) {
        const page = await this.prisma.contentPage.findUnique({ where: { id } });
        if (!page)
            throw new common_1.NotFoundException('Not found');
        if (!file)
            throw new common_1.BadRequestException('file is required');
        const url = `/files/content/${encodeURIComponent(file.filename)}`;
        return { url };
    }
    async create(body) {
        const slug = String(body?.slug ?? '').trim();
        const title = String(body?.title ?? '').trim();
        const content = String(body?.body ?? '');
        const contentJson = body?.contentJson === undefined ? undefined : body.contentJson;
        if (!slug)
            throw new common_1.BadRequestException('slug is required');
        if (!/^[a-z0-9-]+$/.test(slug))
            throw new common_1.BadRequestException('slug must be kebab-case');
        if (!title)
            throw new common_1.BadRequestException('title is required');
        return this.prisma.contentPage.create({
            data: { slug, title, body: content, contentJson },
        });
    }
    async update(id, body) {
        const exists = await this.prisma.contentPage.findUnique({ where: { id } });
        if (!exists)
            throw new common_1.NotFoundException('Not found');
        const title = body?.title === undefined ? undefined : String(body.title).trim();
        const content = body?.body === undefined ? undefined : String(body.body);
        const contentJson = body?.contentJson === undefined ? undefined : body.contentJson;
        return this.prisma.contentPage.update({
            where: { id },
            data: {
                title,
                body: content,
                contentJson,
            },
        });
    }
    async remove(id) {
        const exists = await this.prisma.contentPage.findUnique({ where: { id } });
        if (!exists)
            return { ok: true };
        await this.prisma.contentPage.delete({ where: { id } });
        return { ok: true };
    }
};
exports.AdminContentPagesController = AdminContentPagesController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminContentPagesController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminContentPagesController.prototype, "get", null);
__decorate([
    (0, common_1.Post)(':id/assets/upload'),
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
                const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.svg'].includes(ext) ? ext : '.jpg';
                cb(null, `${(0, node_crypto_1.randomUUID)()}${safeExt}`);
            },
        }),
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            const ok = file.mimetype === 'image/jpeg' ||
                file.mimetype === 'image/png' ||
                file.mimetype === 'image/webp' ||
                file.mimetype === 'image/svg+xml';
            cb(ok ? null : new Error('Only JPG/PNG/WEBP/SVG allowed'), ok);
        },
    })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminContentPagesController.prototype, "uploadAsset", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminContentPagesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminContentPagesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminContentPagesController.prototype, "remove", null);
exports.AdminContentPagesController = AdminContentPagesController = __decorate([
    (0, common_1.Controller)('admin/content-pages'),
    (0, auth_guard_1.RequireAuth)('SUPER_ADMIN'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminContentPagesController);
//# sourceMappingURL=content-pages.controller.js.map