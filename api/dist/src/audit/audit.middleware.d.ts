import type { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuditMiddleware {
    private readonly prisma;
    constructor(prisma: PrismaService);
    use(req: Request & {
        user?: any;
    }, res: Response, next: NextFunction): void;
}
