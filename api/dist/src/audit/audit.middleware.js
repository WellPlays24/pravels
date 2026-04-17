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
exports.AuditMiddleware = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
function redact(obj) {
    const SENSITIVE = new Set([
        'password',
        'currentPassword',
        'newPassword',
        'passwordHash',
        'token',
        'accessToken',
        'code',
        'redeemCode',
    ]);
    if (obj == null)
        return obj;
    if (Array.isArray(obj))
        return obj.map((x) => redact(x));
    if (typeof obj !== 'object')
        return obj;
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        if (SENSITIVE.has(k))
            out[k] = '[REDACTED]';
        else
            out[k] = redact(v);
    }
    return out;
}
let AuditMiddleware = class AuditMiddleware {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    use(req, res, next) {
        const started = Date.now();
        res.on('finish', () => {
            void (async () => {
                try {
                    const durationMs = Math.max(0, Date.now() - started);
                    const actorUserId = req.user?.id ?? null;
                    const actorRole = req.user?.role ?? null;
                    const method = String(req.method || 'GET');
                    const path = String(req.originalUrl || req.url || '');
                    const statusCode = Number(res.statusCode || 0);
                    const isLogin = method === 'POST' && (path.startsWith('/auth/login') || path.startsWith('/api/auth/login'));
                    const isMutating = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
                    if (!isLogin && !isMutating)
                        return;
                    const event = isLogin ? 'AUTH_LOGIN' : 'HTTP_REQUEST';
                    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
                    const userAgent = req.headers['user-agent'] || null;
                    const query = Object.keys(req.query || {}).length ? redact(req.query) : null;
                    const params = Object.keys(req.params || {}).length ? redact(req.params) : null;
                    const body = req.body && Object.keys(req.body).length ? redact(req.body) : null;
                    await this.prisma.auditLog.create({
                        data: {
                            actorUserId,
                            actorRole,
                            event,
                            method,
                            path,
                            query,
                            params,
                            body,
                            statusCode,
                            durationMs,
                            ip,
                            userAgent,
                        },
                    });
                }
                catch {
                }
            })();
        });
        next();
    }
};
exports.AuditMiddleware = AuditMiddleware;
exports.AuditMiddleware = AuditMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditMiddleware);
//# sourceMappingURL=audit.middleware.js.map