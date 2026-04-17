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
const notifications_util_1 = require("../notifications/notifications.util");
const pdfkit_1 = __importDefault(require("pdfkit"));
const promises_1 = require("node:fs/promises");
let TripsController = class TripsController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(req, scopeRaw) {
        const scope = scopeRaw === 'past' ? 'past' : 'upcoming';
        const now = new Date();
        const where = scope === 'past'
            ? { status: 'PUBLISHED', endsAt: { lt: now } }
            : { status: 'PUBLISHED', endsAt: { gte: now } };
        const trips = await this.prisma.trip.findMany({
            where,
            include: {
                province: true,
                canton: true,
                media: { orderBy: { sortOrder: 'asc' } },
            },
            orderBy: { startsAt: scope === 'past' ? 'desc' : 'asc' },
        });
        const tripIds = trips.map((t) => t.id);
        const regs = tripIds.length
            ? await this.prisma.tripRegistration.findMany({
                where: { userId: req.user.id, tripId: { in: tripIds } },
                select: { tripId: true, status: true },
            })
            : [];
        const regByTrip = new Map(regs.map((r) => [r.tripId, r.status]));
        return trips.map((t) => ({
            ...t,
            myRegistrationStatus: regByTrip.get(t.id) ?? null,
        }));
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
    async flyerPdf(req, id, inlineRaw, res) {
        const trip = await this.prisma.trip.findUnique({
            where: { id },
            include: { province: true, canton: true, media: { orderBy: { sortOrder: 'asc' } } },
        });
        if (!trip || trip.status !== 'PUBLISHED')
            throw new common_1.NotFoundException('Not found');
        const settings = await this.prisma.generalSetting.findUnique({ where: { id: 'global' } });
        const communityName = settings?.communityName?.trim() || 'Pravels';
        const safeTitle = String(trip.title || 'viaje')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 80);
        const filename = `flyer-${safeTitle || trip.id}.pdf`;
        const inline = inlineRaw === '1' || inlineRaw === 'true';
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${filename}"`);
        const doc = new pdfkit_1.default({ size: 'A4', margin: 36 });
        doc.pipe(res);
        const pageW = doc.page.width;
        const pageH = doc.page.height;
        const margin = 36;
        const contentW = pageW - margin * 2;
        let logoPath = null;
        if (settings?.logoUrl && settings.logoUrl.startsWith('/files/content/')) {
            const base = process.env.PRAVELS_CONTENT_DIR;
            const filenamePart = settings.logoUrl.split('/').pop() || '';
            const decoded = decodeURIComponent(filenamePart);
            if (base && decoded) {
                const candidate = node_path_1.default.join(base, decoded);
                try {
                    await (0, promises_1.access)(candidate);
                    const ext = node_path_1.default.extname(candidate).toLowerCase();
                    if (ext === '.jpg' || ext === '.jpeg' || ext === '.png')
                        logoPath = candidate;
                }
                catch {
                }
            }
        }
        const hero = trip.media.find((m) => m.kind === 'FLYER') ?? trip.media[0];
        let heroPath = null;
        if (hero?.url && hero.url.startsWith('/files/planes/')) {
            const base = process.env.PRAVELS_PLANES_DIR;
            const filenamePart = hero.url.split('/').pop() || '';
            const decoded = decodeURIComponent(filenamePart);
            if (base && decoded) {
                const candidate = node_path_1.default.join(base, decoded);
                try {
                    await (0, promises_1.access)(candidate);
                    const ext = node_path_1.default.extname(candidate).toLowerCase();
                    if (ext === '.jpg' || ext === '.jpeg' || ext === '.png')
                        heroPath = candidate;
                }
                catch {
                }
            }
        }
        const fmtDate = new Intl.DateTimeFormat('es-EC', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const fmtTime = new Intl.DateTimeFormat('es-EC', { hour: '2-digit', minute: '2-digit' });
        const startDate = fmtDate.format(trip.startsAt);
        const endDate = fmtDate.format(trip.endsAt);
        const startTime = fmtTime.format(trip.startsAt);
        const endTime = fmtTime.format(trip.endsAt);
        function clampLines(text, width, maxLines) {
            const cleaned = String(text ?? '').replace(/\s+/g, ' ').trim();
            if (!cleaned)
                return '';
            const split = doc.splitTextToSize;
            const lines = typeof split === 'function' ? split.call(doc, cleaned, width) : [cleaned];
            if (lines.length <= maxLines)
                return cleaned;
            const out = lines.slice(0, maxLines);
            let last = String(out[out.length - 1] ?? '').trimEnd();
            while (last.length > 0 && doc.widthOfString(`${last}...`) > width) {
                last = last.slice(0, -1).trimEnd();
            }
            out[out.length - 1] = `${last}...`;
            return out.join('\n');
        }
        doc.save();
        doc.rect(0, 0, pageW, pageH).fill('#fff7ed');
        doc.restore();
        const heroH = 320;
        const heroY = 0;
        if (heroPath) {
            doc.save();
            doc.rect(0, heroY, pageW, heroH).clip();
            doc.image(heroPath, 0, heroY, { fit: [pageW, heroH], align: 'center', valign: 'center' });
            doc.restore();
            doc.save();
            doc.fillOpacity?.(0.28);
            doc.rect(0, heroY + heroH - 110, pageW, 110).fill('#000000');
            doc.fillOpacity?.(1);
            doc.restore();
        }
        else {
            doc.save();
            doc.rect(0, 0, pageW, heroH).fill('#fb923c');
            doc.fillColor('#f59e0b');
            doc.circle(pageW - 90, 70, 120).fill();
            doc.fillColor('#fdba74');
            doc.circle(70, 70, 90).fill();
            doc.restore();
        }
        const chipY = 22;
        const chipX = margin;
        const chipH = 34;
        const chipW = Math.min(320, contentW);
        doc.save();
        doc.roundedRect(chipX, chipY, chipW, chipH, 12).fill('#111827');
        doc.restore();
        if (logoPath) {
            try {
                doc.image(logoPath, chipX + 10, chipY + 7, { width: 20, height: 20 });
            }
            catch {
            }
        }
        doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold');
        doc.text(communityName, chipX + (logoPath ? 36 : 12), chipY + 10, { width: chipW - 16 });
        const titleY = heroY + heroH - 96;
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(28);
        const titleText = clampLines(trip.title, contentW, 2);
        doc.text(titleText || trip.title, margin, titleY, { width: contentW });
        doc.fillColor('#ffffff').font('Helvetica').fontSize(12);
        doc.text(`${trip.province?.name ?? ''} - ${trip.canton?.name ?? ''}`, margin, titleY + 34, { width: contentW });
        const cardY = heroH - 12;
        const cardH = 250;
        doc.save();
        doc.roundedRect(margin, cardY, contentW, cardH, 18).fill('#ffffff');
        doc.restore();
        doc.save();
        doc.roundedRect(margin, cardY, contentW, 14, 18).fill('#fb923c');
        doc.restore();
        const innerX = margin + 18;
        let y = cardY + 26;
        const colGap = 16;
        const colW = (contentW - colGap) / 2;
        function labelValue(label, value, x, y0) {
            doc.fillColor('#6b7280').font('Helvetica').fontSize(10).text(label.toUpperCase(), x, y0);
            doc.fillColor('#111827').font('Helvetica-Bold').fontSize(14).text(value, x, y0 + 14, { width: colW });
        }
        labelValue('Fecha', startDate === endDate ? startDate : `${startDate} - ${endDate}`, innerX, y);
        labelValue('Hora', `${startTime} - ${endTime}`, innerX + colW + colGap, y);
        y += 58;
        const cuota = trip.priceCents != null ? `$${(trip.priceCents / 100).toFixed(2)}` : 'Sin cuota';
        const cupos = trip.capacity != null ? String(trip.capacity) : 'Ilimitados';
        labelValue('Cuota', cuota, innerX, y);
        labelValue('Cupos', cupos, innerX + colW + colGap, y);
        y += 58;
        doc.fillColor('#6b7280').font('Helvetica').fontSize(10).text('DESCRIPCION', innerX, y);
        y += 16;
        doc.fillColor('#111827').font('Helvetica').fontSize(11);
        const desc = String(trip.description || '').trim();
        const descText = desc.length ? desc : 'Un plan para compartir, conocer y disfrutar.';
        const descClamped = clampLines(descText, contentW - 36, 4);
        doc.text(descClamped || descText, innerX, y, { width: contentW - 36 });
        const footerY = pageH - 64;
        doc.save();
        doc.roundedRect(margin, footerY, contentW, 44, 16).fill('#111827');
        doc.restore();
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(12);
        doc.text('Inscríbete en la app y asegura tu cupo', margin, footerY + 14, { width: contentW, align: 'center' });
        doc.end();
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
            rewardClaimId: reg.rewardClaimId,
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
            const updated = await this.prisma.tripRegistration.update({
                where: { id: existing.id },
                data: { paymentProofUrl: proofUrl, amountCents: trip.priceCents ?? null, status: 'PENDING' },
            });
            const adminIds = await (0, notifications_util_1.findAdminRecipientIds)(this.prisma, trip.provinceId);
            if (adminIds.length) {
                await this.prisma.notification.createMany({
                    data: adminIds.map((userId) => ({
                        userId,
                        actorUserId: req.user.id,
                        type: 'TRIP_REGISTRATION_PENDING',
                        title: 'Nueva inscripcion a viaje',
                        body: `Hay una inscripcion pendiente para el viaje: ${trip.title}`,
                        data: { tripId: trip.id, registrationId: updated.id, href: '/admin/registrations' },
                    })),
                });
            }
            return updated;
        }
        const created = await this.prisma.tripRegistration.create({
            data: {
                tripId: id,
                userId: req.user.id,
                status: 'PENDING',
                amountCents: trip.priceCents ?? null,
                paymentProofUrl: proofUrl,
            },
        });
        const adminIds = await (0, notifications_util_1.findAdminRecipientIds)(this.prisma, trip.provinceId);
        if (adminIds.length) {
            await this.prisma.notification.createMany({
                data: adminIds.map((userId) => ({
                    userId,
                    actorUserId: req.user.id,
                    type: 'TRIP_REGISTRATION_PENDING',
                    title: 'Nueva inscripcion a viaje',
                    body: `Hay una inscripcion pendiente para el viaje: ${trip.title}`,
                    data: { tripId: trip.id, registrationId: created.id, href: '/admin/registrations' },
                })),
            });
        }
        return created;
    }
    async registerWithReward(req, id, body) {
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
        const code = String(body?.code ?? '').trim().toUpperCase();
        if (!code)
            throw new common_1.BadRequestException('code is required');
        const claim = await this.prisma.rewardClaim.findFirst({
            where: {
                userId: req.user.id,
                status: 'APPROVED',
                redeemCode: code,
                redeemedAt: null,
            },
            include: { reward: true },
        });
        if (!claim)
            throw new common_1.BadRequestException('Codigo invalido o ya fue usado');
        if (!claim.reward.grantsFreeTrip)
            throw new common_1.BadRequestException('Codigo invalido o ya fue usado');
        const adminIds = await (0, notifications_util_1.findAdminRecipientIds)(this.prisma, trip.provinceId);
        const reg = await this.prisma.$transaction(async (tx) => {
            await tx.rewardClaim.update({
                where: { id: claim.id },
                data: { redeemedAt: new Date(), redeemedTripId: trip.id },
            });
            const existing = await tx.tripRegistration.findFirst({
                where: { tripId: id, userId: req.user.id },
            });
            const data = {
                status: 'CONFIRMED',
                amountCents: 0,
                paymentProofUrl: null,
                rewardClaimId: claim.id,
                reviewedAt: new Date(),
                reviewNote: `Viaje gratis por premio: ${claim.reward.name}`,
            };
            let saved;
            if (existing) {
                if (existing.status === 'CONFIRMED')
                    return existing;
                saved = await tx.tripRegistration.update({ where: { id: existing.id }, data });
            }
            else {
                saved = await tx.tripRegistration.create({
                    data: {
                        tripId: id,
                        userId: req.user.id,
                        ...data,
                    },
                });
            }
            await tx.notification.create({
                data: {
                    userId: req.user.id,
                    actorUserId: null,
                    type: 'TRIP_REGISTRATION_APPROVED',
                    title: 'Inscripcion confirmada',
                    body: `Tu inscripcion al viaje "${trip.title}" fue confirmada usando tu premio de viaje gratis.`,
                    data: { tripId: trip.id, href: `/trips/${trip.id}` },
                },
            });
            if (adminIds.length) {
                await tx.notification.createMany({
                    data: adminIds.map((userId) => ({
                        userId,
                        actorUserId: req.user.id,
                        type: 'TRIP_REGISTRATION_PENDING',
                        title: 'Viaje gratis usado',
                        body: `Un miembro uso un premio de viaje gratis y quedo confirmado en: ${trip.title}`,
                        data: { tripId: trip.id, registrationId: saved.id, href: '/admin/registrations' },
                    })),
                });
            }
            return saved;
        });
        return reg;
    }
};
exports.TripsController = TripsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('scope')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
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
    (0, common_1.Get)(':id/flyer.pdf'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('inline')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", Promise)
], TripsController.prototype, "flyerPdf", null);
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
__decorate([
    (0, common_1.Post)(':id/register-reward'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], TripsController.prototype, "registerWithReward", null);
exports.TripsController = TripsController = __decorate([
    (0, common_1.Controller)('trips'),
    (0, auth_guard_1.RequireAuth)('SUPER_ADMIN', 'PROVINCE_ADMIN', 'MEMBER'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TripsController);
//# sourceMappingURL=trips.controller.js.map