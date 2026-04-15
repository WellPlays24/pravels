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
exports.PublicRegistrationController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const multer_1 = require("multer");
const platform_express_1 = require("@nestjs/platform-express");
const node_path_1 = __importDefault(require("node:path"));
const promises_1 = require("node:fs/promises");
const bcrypt = __importStar(require("bcrypt"));
function safeIdFolder(idNumber) {
    const cleaned = idNumber.trim();
    if (!/^[0-9A-Za-z-]+$/.test(cleaned)) {
        throw new common_1.BadRequestException('idNumber contains invalid characters');
    }
    return cleaned;
}
function extFromMimetype(mime) {
    if (mime === 'image/jpeg')
        return '.jpg';
    if (mime === 'image/png')
        return '.png';
    if (mime === 'image/webp')
        return '.webp';
    return null;
}
let PublicRegistrationController = class PublicRegistrationController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async register(body, files) {
        const { fullName, nickname, displayNamePreference, email, phone, idType, idNumber, birthDate, socialUrl, priorityProvinceId, priorityCantonId, requestedProvinceIds, password, } = body;
        if (!fullName || !email || !phone || !idType || !idNumber || !birthDate || !socialUrl || !password) {
            throw new common_1.BadRequestException('Missing required fields');
        }
        if (String(password).length < 6)
            throw new common_1.BadRequestException('Password must be at least 6 chars');
        if (idType !== 'CEDULA' && idType !== 'PASSPORT')
            throw new common_1.BadRequestException('Invalid idType');
        const pref = displayNamePreference ? String(displayNamePreference) : 'FULL_NAME';
        if (pref !== 'FULL_NAME' && pref !== 'NICKNAME')
            throw new common_1.BadRequestException('Invalid displayNamePreference');
        const nick = nickname != null ? String(nickname).trim() : '';
        if (pref === 'NICKNAME' && !nick)
            throw new common_1.BadRequestException('nickname is required when displayNamePreference=NICKNAME');
        const pProvId = Number(priorityProvinceId);
        const pCantonId = Number(priorityCantonId);
        if (!pProvId || !pCantonId)
            throw new common_1.BadRequestException('priorityProvinceId and priorityCantonId are required');
        const canton = await this.prisma.canton.findUnique({ where: { id: pCantonId } });
        if (!canton || canton.provinceId !== pProvId) {
            throw new common_1.BadRequestException('priorityCantonId must belong to priorityProvinceId');
        }
        const photo1 = files.photo1?.[0];
        const photo2 = files.photo2?.[0];
        const photo3 = files.photo3?.[0];
        if (!photo1 || !photo2 || !photo3)
            throw new common_1.BadRequestException('3 photos are required');
        const folder = safeIdFolder(String(idNumber));
        const photo1Url = `/files/members/${encodeURIComponent(folder)}/${encodeURIComponent(photo1.filename)}`;
        const photo2Url = `/files/members/${encodeURIComponent(folder)}/${encodeURIComponent(photo2.filename)}`;
        const photo3Url = `/files/members/${encodeURIComponent(folder)}/${encodeURIComponent(photo3.filename)}`;
        let provinceIds = [];
        try {
            provinceIds = requestedProvinceIds ? JSON.parse(String(requestedProvinceIds)) : [];
            if (!Array.isArray(provinceIds))
                provinceIds = [];
        }
        catch {
            provinceIds = [];
        }
        provinceIds = provinceIds.map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0);
        if (!provinceIds.includes(pProvId))
            provinceIds.push(pProvId);
        provinceIds = Array.from(new Set(provinceIds));
        const passwordHash = await bcrypt.hash(String(password), 10);
        const reqRecord = await this.prisma.registrationRequest.create({
            data: {
                status: 'PENDING',
                fullName: String(fullName),
                nickname: nick ? nick : null,
                displayNamePreference: pref,
                email: String(email).toLowerCase().trim(),
                phone: String(phone).trim(),
                idType,
                idNumber: String(idNumber).trim(),
                birthDate: new Date(String(birthDate)),
                socialUrl: String(socialUrl).trim(),
                passwordHash,
                photo1Url,
                photo2Url,
                photo3Url,
                priorityProvinceId: pProvId,
                priorityCantonId: pCantonId,
                requestedProvinces: {
                    create: provinceIds.map((provinceId) => ({ provinceId })),
                },
            },
            include: { requestedProvinces: true },
        });
        return { requestId: reqRecord.id };
    }
    async status(id) {
        const rr = await this.prisma.registrationRequest.findUnique({
            where: { id },
            select: { id: true, status: true, submittedAt: true, reviewedAt: true, reviewNote: true },
        });
        if (!rr)
            throw new common_1.BadRequestException('Not found');
        return rr;
    }
};
exports.PublicRegistrationController = PublicRegistrationController;
__decorate([
    (0, common_1.Post)('register'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([
        { name: 'photo1', maxCount: 1 },
        { name: 'photo2', maxCount: 1 },
        { name: 'photo3', maxCount: 1 },
    ], {
        storage: (0, multer_1.diskStorage)({
            destination: async (req, file, cb) => {
                try {
                    const base = process.env.PRAVELS_MEMBERS_DIR;
                    if (!base)
                        throw new Error('PRAVELS_MEMBERS_DIR is not set');
                    const idNumber = safeIdFolder(String(req.body?.idNumber ?? ''));
                    const dest = node_path_1.default.join(base, idNumber);
                    await (0, promises_1.mkdir)(dest, { recursive: true });
                    cb(null, dest);
                }
                catch (e) {
                    cb(e);
                }
            },
            filename: (req, file, cb) => {
                const mimeExt = extFromMimetype(file.mimetype);
                if (!mimeExt)
                    return cb(new Error('Only JPG/PNG/WEBP allowed'));
                const field = String(file.fieldname);
                const name = field === 'photo1' || field === 'photo2' || field === 'photo3' ? field : 'photo';
                cb(null, `${name}${mimeExt}`);
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
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PublicRegistrationController.prototype, "register", null);
__decorate([
    (0, common_1.Get)('registration-requests/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PublicRegistrationController.prototype, "status", null);
exports.PublicRegistrationController = PublicRegistrationController = __decorate([
    (0, common_1.Controller)('public'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PublicRegistrationController);
//# sourceMappingURL=public-registration.controller.js.map