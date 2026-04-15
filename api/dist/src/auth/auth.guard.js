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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthGuard = void 0;
exports.RequireAuth = RequireAuth;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const jose_1 = require("jose");
const prisma_service_1 = require("../prisma/prisma.service");
const AUTH_META = {
    required: 'auth.required',
    roles: 'auth.roles',
};
function RequireAuth(...roles) {
    return (0, common_1.applyDecorators)((0, common_1.SetMetadata)(AUTH_META.required, true), (0, common_1.SetMetadata)(AUTH_META.roles, roles));
}
let AuthGuard = class AuthGuard {
    reflector;
    prisma;
    constructor(reflector, prisma) {
        this.reflector = reflector;
        this.prisma = prisma;
    }
    async canActivate(ctx) {
        const required = this.reflector.getAllAndOverride(AUTH_META.required, [
            ctx.getHandler(),
            ctx.getClass(),
        ]);
        if (!required)
            return true;
        const req = ctx.switchToHttp().getRequest();
        const authHeader = req.headers?.authorization;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;
        if (!token)
            throw new common_1.UnauthorizedException('Missing bearer token');
        const secret = process.env.JWT_SECRET;
        if (!secret)
            throw new Error('JWT_SECRET is required');
        let sub;
        try {
            const res = await (0, jose_1.jwtVerify)(token, new TextEncoder().encode(secret));
            sub = res.payload.sub;
            if (!sub)
                throw new Error('Missing sub');
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid token');
        }
        const user = await this.prisma.userProfile.findUnique({
            where: { id: sub },
        });
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        const preference = user.displayNamePreference ?? 'FULL_NAME';
        const nickname = (user.nickname ?? null);
        const displayName = (user.displayName ?? null);
        const displayLabel = preference === 'NICKNAME' && nickname && nickname.trim().length
            ? nickname.trim()
            : displayName && displayName.trim().length
                ? displayName.trim()
                : user.email;
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            status: user.status,
            displayName: user.displayName,
            nickname,
            displayNamePreference: preference,
            displayLabel,
            profilePhotoUrl: (user.profilePhotoUrl ?? null),
            primaryProvinceId: user.primaryProvinceId ?? null,
        };
        const roles = this.reflector.getAllAndOverride(AUTH_META.roles, [
            ctx.getHandler(),
            ctx.getClass(),
        ]) ?? [];
        if (roles.length > 0 && !roles.includes(user.role)) {
            throw new common_1.ForbiddenException('Insufficient role');
        }
        return true;
    }
};
exports.AuthGuard = AuthGuard;
exports.AuthGuard = AuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        prisma_service_1.PrismaService])
], AuthGuard);
//# sourceMappingURL=auth.guard.js.map