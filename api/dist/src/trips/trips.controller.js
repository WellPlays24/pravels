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
exports.TripsController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const auth_guard_1 = require("../auth/auth.guard");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = require("node:crypto");
let TripsController = class TripsController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(scopeRaw) {
        const scope = scopeRaw === 'past' ? 'past' : 'upcoming';
        const now = new Date();
        const where = scope === 'past'
            ? { status: 'PUBLISHED', endsAt: { lt: now } }
            : { status: 'PUBLISHED', endsAt: { gte: now } };
        return this.prisma.trip.findMany({
            where,
            include: {
                province: true,
                canton: true,
                media: { orderBy: { sortOrder: 'asc' } },
            },
            orderBy: { startsAt: scope === 'past' ? 'desc' : 'asc' },
        });
    }
    async get(id) {
        const trip = await this.prisma.trip.findUnique({
            where: { id },
            include: {
                province: true,
                canton: true,
                media: { orderBy: { sortOrder: 'asc' } },
            },
        });
        if (!trip || trip.status !== 'PUBLISHED')
            throw new common_1.NotFoundException('Not found');
        return trip;
    }
    async myRegistration(req, id) {
        const trip = await this.prisma.trip.findUnique({ where: { id } });
        if (!trip || trip.status !== 'PUBLISHED')
            throw new common_1.NotFoundException('Not found');
        const reg = await this.prisma.tripRegistration.findUnique({
            where: { tripId_userId: { tripId: id, userId: req.user.id } },
        });
        if (!reg)
            return null;
        return {
            id: reg.id,
            status: reg.status,
            amountCents: reg.amountCents,
            paymentProofUrl: reg.paymentProofUrl,
            reviewedAt: reg.reviewedAt,
            reviewNote: reg.reviewNote,
            createdAt: reg.createdAt,
            updatedAt: reg.updatedAt,
        };
    }
    async register(req, id, paymentProof, _body) {
        const trip = await this.prisma.trip.findUnique({ where: { id } });
        if (!trip || trip.status !== 'PUBLISHED')
            throw new common_1.NotFoundException('Not found');
        const now = new Date();
        if (trip.startsAt.getTime() < now.getTime()) {
            throw new common_1.BadRequestException('Trip already started');
        }
        if (trip.capacity) {
            const confirmed = await this.prisma.tripRegistration.count({
                where: { tripId: id, status: 'CONFIRMED' },
            });
            if (confirmed >= trip.capacity)
                throw new common_1.BadRequestException('No capacity');
        }
        if (!paymentProof)
            throw new common_1.BadRequestException('paymentProof is required');
        const proofUrl = `/files/payments/${encodeURIComponent(paymentProof.filename)}`;
        const existing = await this.prisma.tripRegistration.findFirst({
            where: { tripId: id, userId: req.user.id },
        });
        if (existing) {
            if (existing.status === 'CONFIRMED')
                return existing;
            return this.prisma.tripRegistration.update({
                where: { id: existing.id },
                data: { paymentProofUrl: proofUrl, amountCents: trip.priceCents ?? null, status: 'PENDING' },
            });
        }
        return this.prisma.tripRegistration.create({
            data: {
                tripId: id,
                userId: req.user.id,
                status: 'PENDING',
                amountCents: trip.priceCents ?? null,
                paymentProofUrl: proofUrl,
            },
        });
    }
};
exports.TripsController = TripsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('scope')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TripsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TripsController.prototype, "get", null);
__decorate([
    (0, common_1.Get)(':id/registration'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TripsController.prototype, "myRegistration", null);
__decorate([
    (0, common_1.Post)(':id/register'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('paymentProof', {
        storage: (0, multer_1.diskStorage)({
            destination: (_req, _file, cb) => {
                const dir = process.env.PRAVELS_PAYMENTS_DIR;
                if (!dir)
                    return cb(new Error('PRAVELS_PAYMENTS_DIR is not set'), dir);
                cb(null, dir);
            },
            filename: (_req, file, cb) => {
                const ext = node_path_1.default.extname(file.originalname || '').toLowerCase();
                const safeExt = ['.jpg', '.jpeg', '.png', '.pdf', '.webp'].includes(ext) ? ext : '.jpg';
                cb(null, `${(0, node_crypto_1.randomUUID)()}${safeExt}`);
            },
        }),
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            const ok = file.mimetype === 'image/jpeg' ||
                file.mimetype === 'image/png' ||
                file.mimetype === 'image/webp' ||
                file.mimetype === 'application/pdf';
            cb(ok ? null : new Error('Only JPG/PNG/WEBP/PDF allowed'), ok);
        },
    })),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.UploadedFile)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", Promise)
], TripsController.prototype, "register", null);
exports.TripsController = TripsController = __decorate([
    (0, common_1.Controller)('trips'),
    (0, auth_guard_1.RequireAuth)('SUPER_ADMIN', 'PROVINCE_ADMIN', 'MEMBER'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TripsController);
//# sourceMappingURL=trips.controller.js.map