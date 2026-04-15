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
exports.PublicContentController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PublicContentController = class PublicContentController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getBySlug(slug) {
        const s = String(slug || '').trim();
        if (!s)
            throw new common_1.BadRequestException('slug is required');
        const page = await this.prisma.contentPage.findUnique({
            where: { slug: s },
            select: { slug: true, title: true, body: true, contentJson: true, updatedAt: true },
        });
        if (page)
            return page;
        return {
            slug: s,
            title: 'Contenido pendiente',
            body: '',
            contentJson: null,
            updatedAt: new Date(0),
        };
    }
};
exports.PublicContentController = PublicContentController;
__decorate([
    (0, common_1.Get)('content/:slug'),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PublicContentController.prototype, "getBySlug", null);
exports.PublicContentController = PublicContentController = __decorate([
    (0, common_1.Controller)('public'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PublicContentController);
//# sourceMappingURL=public-content.controller.js.map