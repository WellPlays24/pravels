import { Injectable } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

function redact(obj: any): any {
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

  if (obj == null) return obj;
  if (Array.isArray(obj)) return obj.map((x) => redact(x));
  if (typeof obj !== 'object') return obj;

  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE.has(k)) out[k] = '[REDACTED]';
    else out[k] = redact(v);
  }
  return out;
}

@Injectable()
export class AuditMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  use(req: Request & { user?: any }, res: Response, next: NextFunction) {
    const started = Date.now();

    res.on('finish', () => {
      // Don't block response on audit failures.
      void (async () => {
        try {
          const durationMs = Math.max(0, Date.now() - started);
          const actorUserId = req.user?.id ?? null;
          const actorRole = req.user?.role ?? null;

          const method = String(req.method || 'GET');
          const path = String((req as any).originalUrl || req.url || '');
          const statusCode = Number(res.statusCode || 0);

          // Only audit mutating actions (plus login). Avoid logging read-only page loads.
          const isLogin = method === 'POST' && (path.startsWith('/auth/login') || path.startsWith('/api/auth/login'));
          const isMutating = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
          if (!isLogin && !isMutating) return;

          const event = isLogin ? 'AUTH_LOGIN' : 'HTTP_REQUEST';

          const ip = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || null;
          const userAgent = (req.headers['user-agent'] as string) || null;

          const query = Object.keys(req.query || {}).length ? redact(req.query) : null;
          const params = Object.keys((req as any).params || {}).length ? redact((req as any).params) : null;
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
            } as any,
          });
        } catch {
          // ignore
        }
      })();
    });

    next();
  }
}
