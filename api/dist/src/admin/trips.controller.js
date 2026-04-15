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
exports.AdminTripsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = require("node:crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const auth_guard_1 = require("../auth/auth.guard");
const trips_dto_1 = require("./trips.dto");
let AdminTripsController = class AdminTripsController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async allRegistrations(req, statusRaw, tripId) {
        const status = statusRaw === 'CONFIRMED' || statusRaw === 'CANCELLED' || statusRaw === 'PENDING'
            ? statusRaw
            : 'PENDING';
        if (req.user.role === 'PROVINCE_ADMIN') {
            const adminProvinces = await this.prisma.adminProvince.findMany({
                where: { userId: req.user.id },
                select: { provinceId: true },
            });
            const provinceIds = adminProvinces.map((x) => x.provinceId);
            return this.prisma.tripRegistration.findMany({
                where: {
                    status,
                    ...(tripId ? { tripId } : {}),
                    trip: { provinceId: { in: provinceIds.length ? provinceIds : [-1] } },
                },
                include: {
                    user: true,
                    trip: { include: { province: true, canton: true } },
                },
                orderBy: { createdAt: 'desc' },
            });
        }
        return this.prisma.tripRegistration.findMany({
            where: {
                status,
                ...(tripId ? { tripId } : {}),
            },
            include: {
                user: true,
                trip: { include: { province: true, canton: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async list(req) {
        if (req.user.role === 'PROVINCE_ADMIN') {
            const adminProvinces = await this.prisma.adminProvince.findMany({
                where: { userId: req.user.id },
                select: { provinceId: true },
            });
            const provinceIds = adminProvinces.map((x) => x.provinceId);
            return this.prisma.trip.findMany({
                where: { provinceId: { in: provinceIds } },
                include: { province: true, canton: true },
                orderBy: { startsAt: 'desc' },
            });
        }
        return this.prisma.trip.findMany({
            include: { province: true, canton: true },
            orderBy: { startsAt: 'desc' },
        });
    }
    async cantons(provinceIdRaw) {
        const provinceId = Number(provinceIdRaw);
        if (!provinceId || Number.isNaN(provinceId))
            throw new common_1.BadRequestException('provinceId is required');
        return this.prisma.canton.findMany({
            where: { provinceId },
            orderBy: { name: 'asc' },
        });
    }
    async create(req, dto) {
        if (req.user.role === 'PROVINCE_ADMIN') {
            const allowed = await this.prisma.adminProvince.findFirst({
                where: { userId: req.user.id, provinceId: dto.provinceId },
            });
            if (!allowed)
                throw new common_1.BadRequestException('Not allowed for this province');
        }
        return this.prisma.trip.create({
            data: {
                title: dto.title,
                description: dto.description,
                startsAt: new Date(dto.startsAt),
                endsAt: new Date(dto.endsAt),
                provinceId: dto.provinceId,
                cantonId: dto.cantonId,
                priceCents: dto.priceCents,
                capacity: dto.capacity,
                bankName: dto.bankName,
                bankAccountName: dto.bankAccountName,
                bankAccountNumber: dto.bankAccountNumber,
                bankAccountType: dto.bankAccountType,
                paymentInstructions: dto.paymentInstructions,
                createdByUserId: req.user.id,
            },
            include: { province: true, canton: true, media: true },
        });
    }
    async get(req, id) {
        const trip = await this.prisma.trip.findUnique({
            where: { id },
            include: { province: true, canton: true, media: { orderBy: { sortOrder: 'asc' } } },
        });
        if (!trip)
            throw new common_1.NotFoundException('Not found');
        if (req.user.role === 'PROVINCE_ADMIN') {
            const allowed = await this.prisma.adminProvince.findFirst({
                where: { userId: req.user.id, provinceId: trip.provinceId },
            });
            if (!allowed)
                throw new common_1.BadRequestException('Not allowed');
        }
        return trip;
    }
    async update(req, id, dto) {
        const trip = await this.prisma.trip.findUnique({ where: { id } });
        if (!trip)
            throw new common_1.NotFoundException('Not found');
        if (req.user.role === 'PROVINCE_ADMIN') {
            const allowed = await this.prisma.adminProvince.findFirst({
                where: { userId: req.user.id, provinceId: trip.provinceId },
            });
            if (!allowed)
                throw new common_1.BadRequestException('Not allowed');
        }
        const nextProvinceId = dto.provinceId ?? trip.provinceId;
        const nextCantonId = dto.cantonId ?? trip.cantonId;
        const canton = await this.prisma.canton.findUnique({ where: { id: nextCantonId } });
        if (!canton || canton.provinceId !== nextProvinceId) {
            throw new common_1.BadRequestException('cantonId must belong to provinceId');
        }
        const nextStartsAt = dto.startsAt ? new Date(dto.startsAt) : trip.startsAt;
        const nextEndsAt = dto.endsAt ? new Date(dto.endsAt) : trip.endsAt;
        if (nextEndsAt.getTime() < nextStartsAt.getTime())
            throw new common_1.BadRequestException('endsAt must be >= startsAt');
        return this.prisma.trip.update({
            where: { id },
            data: {
                title: dto.title,
                description: dto.description,
                startsAt: dto.startsAt ? nextStartsAt : undefined,
                endsAt: dto.endsAt ? nextEndsAt : undefined,
                provinceId: dto.provinceId,
                cantonId: dto.cantonId,
                priceCents: dto.priceCents === undefined ? undefined : dto.priceCents,
                capacity: dto.capacity === undefined ? undefined : dto.capacity,
                bankName: dto.bankName === undefined ? undefined : dto.bankName,
                bankAccountName: dto.bankAccountName === undefined ? undefined : dto.bankAccountName,
                bankAccountNumber: dto.bankAccountNumber === undefined ? undefined : dto.bankAccountNumber,
                bankAccountType: dto.bankAccountType === undefined ? undefined : dto.bankAccountType,
                paymentInstructions: dto.paymentInstructions === undefined ? undefined : dto.paymentInstructions,
            },
            include: { province: true, canton: true, media: { orderBy: { sortOrder: 'asc' } } },
        });
    }
    async addMedia(req, id, dto) {
        const trip = await this.prisma.trip.findUnique({ where: { id } });
        if (!trip)
            throw new common_1.NotFoundException('Not found');
        if (req.user.role === 'PROVINCE_ADMIN') {
            const allowed = await this.prisma.adminProvince.findFirst({
                where: { userId: req.user.id, provinceId: trip.provinceId },
            });
            if (!allowed)
                throw new common_1.BadRequestException('Not allowed');
        }
        if (dto.kind !== 'FLYER' && dto.kind !== 'PHOTO')
            throw new common_1.BadRequestException('Invalid kind');
        return this.prisma.tripMedia.create({
            data: {
                tripId: trip.id,
                kind: dto.kind,
                url: dto.url,
                sortOrder: dto.sortOrder ?? 0,
            },
        });
    }
    async uploadMedia(req, id, dto, file) {
        const trip = await this.prisma.trip.findUnique({ where: { id } });
        if (!trip)
            throw new common_1.NotFoundException('Not found');
        if (req.user.role === 'PROVINCE_ADMIN') {
            const allowed = await this.prisma.adminProvince.findFirst({
                where: { userId: req.user.id, provinceId: trip.provinceId },
            });
            if (!allowed)
                throw new common_1.BadRequestException('Not allowed');
        }
        if (!file)
            throw new common_1.BadRequestException('file is required');
        if (dto.kind !== 'FLYER' && dto.kind !== 'PHOTO')
            throw new common_1.BadRequestException('Invalid kind');
        const url = `/files/planes/${encodeURIComponent(file.filename)}`;
        return this.prisma.tripMedia.create({
            data: {
                tripId: trip.id,
                kind: dto.kind,
                url,
                sortOrder: dto.sortOrder ?? 0,
            },
        });
    }
    async deleteMedia(req, id, mediaId) {
        const trip = await this.prisma.trip.findUnique({ where: { id } });
        if (!trip)
            throw new common_1.NotFoundException('Not found');
        if (req.user.role === 'PROVINCE_ADMIN') {
            const allowed = await this.prisma.adminProvince.findFirst({
                where: { userId: req.user.id, provinceId: trip.provinceId },
            });
            if (!allowed)
                throw new common_1.BadRequestException('Not allowed');
        }
        const media = await this.prisma.tripMedia.findUnique({ where: { id: mediaId } });
        if (!media || media.tripId !== trip.id)
            throw new common_1.NotFoundException('Not found');
        await this.prisma.tripMedia.delete({ where: { id: mediaId } });
        return { ok: true };
    }
    async publish(req, id) {
        const trip = await this.prisma.trip.findUnique({
            where: { id },
            include: { media: true },
        });
        if (!trip)
            throw new common_1.NotFoundException('Not found');
        if (req.user.role === 'PROVINCE_ADMIN') {
            const allowed = await this.prisma.adminProvince.findFirst({
                where: { userId: req.user.id, provinceId: trip.provinceId },
            });
            if (!allowed)
                throw new common_1.BadRequestException('Not allowed');
        }
        const now = new Date();
        const isPast = trip.endsAt.getTime() < now.getTime();
        if (isPast) {
            const photos = trip.media.filter((m) => m.kind === 'PHOTO');
            if (photos.length < 1)
                throw new common_1.BadRequestException('Past trips require at least 1 PHOTO');
        }
        else {
            const flyers = trip.media.filter((m) => m.kind === 'FLYER');
            if (flyers.length !== 1)
                throw new common_1.BadRequestException('Future trips require exactly 1 FLYER');
        }
        return this.prisma.trip.update({
            where: { id },
            data: { status: 'PUBLISHED' },
            include: { province: true, canton: true, media: { orderBy: { sortOrder: 'asc' } } },
        });
    }
    async cancel(req, id) {
        const trip = await this.prisma.trip.findUnique({ where: { id } });
        if (!trip)
            throw new common_1.NotFoundException('Not found');
        if (req.user.role === 'PROVINCE_ADMIN') {
            const allowed = await this.prisma.adminProvince.findFirst({
                where: { userId: req.user.id, provinceId: trip.provinceId },
            });
            if (!allowed)
                throw new common_1.BadRequestException('Not allowed');
        }
        return this.prisma.trip.update({ where: { id }, data: { status: 'CANCELLED' } });
    }
    async registrations(req, id) {
        const trip = await this.prisma.trip.findUnique({ where: { id } });
        if (!trip)
            throw new common_1.NotFoundException('Not found');
        if (req.user.role === 'PROVINCE_ADMIN') {
            const allowed = await this.prisma.adminProvince.findFirst({
                where: { userId: req.user.id, provinceId: trip.provinceId },
            });
            if (!allowed)
                throw new common_1.BadRequestException('Not allowed');
        }
        return this.prisma.tripRegistration.findMany({
            where: { tripId: id },
            include: { user: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async approveRegistration(req, registrationId) {
        const reg = await this.prisma.tripRegistration.findUnique({
            where: { id: registrationId },
            include: { trip: true },
        });
        if (!reg)
            throw new common_1.NotFoundException('Not found');
        if (req.user.role === 'PROVINCE_ADMIN') {
            const allowed = await this.prisma.adminProvince.findFirst({
                where: { userId: req.user.id, provinceId: reg.trip.provinceId },
            });
            if (!allowed)
                throw new common_1.BadRequestException('Not allowed');
        }
        return this.prisma.tripRegistration.update({
            where: { id: reg.id },
            data: {
                status: 'CONFIRMED',
                reviewedAt: new Date(),
                reviewedByUserId: req.user.id,
            },
        });
    }
    async rejectRegistration(req, registrationId, body) {
        const reg = await this.prisma.tripRegistration.findUnique({
            where: { id: registrationId },
            include: { trip: true },
        });
        if (!reg)
            throw new common_1.NotFoundException('Not found');
        if (req.user.role === 'PROVINCE_ADMIN') {
            const allowed = await this.prisma.adminProvince.findFirst({
                where: { userId: req.user.id, provinceId: reg.trip.provinceId },
            });
            if (!allowed)
                throw new common_1.BadRequestException('Not allowed');
        }
        const note = body?.note ? String(body.note) : null;
        return this.prisma.tripRegistration.update({
            where: { id: reg.id },
            data: {
                status: 'CANCELLED',
                reviewedAt: new Date(),
                reviewedByUserId: req.user.id,
                reviewNote: note,
            },
        });
    }
};
exports.AdminTripsController = AdminTripsController;
__decorate([
    (0, common_1.Get)('registrations'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('tripId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], AdminTripsController.prototype, "allRegistrations", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminTripsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('cantons'),
    __param(0, (0, common_1.Query)('provinceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminTripsController.prototype, "cantons", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, trips_dto_1.CreateTripDto]),
    __metadata("design:returntype", Promise)
], AdminTripsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminTripsController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, trips_dto_1.UpdateTripDto]),
    __metadata("design:returntype", Promise)
], AdminTripsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/media'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, trips_dto_1.AddTripMediaDto]),
    __metadata("design:returntype", Promise)
], AdminTripsController.prototype, "addMedia", null);
__decorate([
    (0, common_1.Post)(':id/media/upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: (_req, _file, cb) => {
                const dir = process.env.PRAVELS_PLANES_DIR;
                if (!dir)
                    return cb(new Error('PRAVELS_PLANES_DIR is not set'), dir);
                cb(null, dir);
            },
            filename: (_req, file, cb) => {
                const ext = node_path_1.default.extname(file.originalname || '').toLowerCase();
                const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
                cb(null, `${(0, node_crypto_1.randomUUID)()}${safeExt}`);
            },
        }),
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            const ok = file.mimetype === 'image/jpeg' ||
                file.mimetype === 'image/png' ||
                file.mimetype === 'image/webp';
            cb(ok ? null : new Error('Only JPG/PNG/WEBP allowed'), ok);
        },
    })),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, trips_dto_1.UploadTripMediaDto, Object]),
    __metadata("design:returntype", Promise)
], AdminTripsController.prototype, "uploadMedia", null);
__decorate([
    (0, common_1.Delete)(':id/media/:mediaId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('mediaId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], AdminTripsController.prototype, "deleteMedia", null);
__decorate([
    (0, common_1.Post)(':id/publish'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminTripsController.prototype, "publish", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminTripsController.prototype, "cancel", null);
__decorate([
    (0, common_1.Get)(':id/registrations'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminTripsController.prototype, "registrations", null);
__decorate([
    (0, common_1.Post)('registrations/:registrationId/approve'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('registrationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminTripsController.prototype, "approveRegistration", null);
__decorate([
    (0, common_1.Post)('registrations/:registrationId/reject'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('registrationId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminTripsController.prototype, "rejectRegistration", null);
exports.AdminTripsController = AdminTripsController = __decorate([
    (0, common_1.Controller)('admin/trips'),
    (0, auth_guard_1.RequireAuth)('SUPER_ADMIN', 'PROVINCE_ADMIN'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminTripsController);
//# sourceMappingURL=trips.controller.js.map