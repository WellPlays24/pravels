import { PrismaService } from '../prisma/prisma.service';
export declare class AdminAuditController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(qRaw?: string, eventRaw?: string, methodRaw?: string, statusRaw?: string, cursorRaw?: string, takeRaw?: string): Promise<{
        items: ({
            actor: {
                id: string;
                email: string;
                role: import("@prisma/client").$Enums.Role;
            } | null;
        } & {
            path: string;
            query: import("@prisma/client/runtime/client").JsonValue | null;
            params: import("@prisma/client/runtime/client").JsonValue | null;
            id: string;
            createdAt: Date;
            body: import("@prisma/client/runtime/client").JsonValue | null;
            actorUserId: string | null;
            event: string;
            method: string;
            actorRole: import("@prisma/client").$Enums.Role | null;
            statusCode: number;
            durationMs: number;
            ip: string | null;
            userAgent: string | null;
        })[];
        nextCursor: string | null;
    }>;
}
