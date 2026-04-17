import { PrismaService } from '../prisma/prisma.service';
import type { AuthedRequest } from '../auth/auth.guard';
export declare class AdminUsersController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private parseDateOnly;
    private addMonths;
    allowedProvinceIds(req: AuthedRequest): Promise<number[] | null>;
    list(req: AuthedRequest, roleRaw?: string, statusRaw?: string, provinceIdRaw?: string, cantonIdRaw?: string, qRaw?: string): Promise<{
        id: string;
        email: string;
        role: import("@prisma/client").$Enums.Role;
        status: import("@prisma/client").$Enums.AccountStatus;
        phone: string | null;
        birthDate: Date | null;
        displayName: string | null;
        nickname: string | null;
        displayNamePreference: import("@prisma/client").$Enums.DisplayNamePreference;
        profilePhotoUrl: string | null;
        isBannedFromMain: boolean;
        primaryProvinceId: number | null;
        primaryCantonId: number | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    get(req: AuthedRequest, id: string): Promise<{
        id: string;
        email: string;
        role: import("@prisma/client").$Enums.Role;
        status: import("@prisma/client").$Enums.AccountStatus;
        phone: string | null;
        birthDate: Date | null;
        displayName: string | null;
        nickname: string | null;
        displayNamePreference: import("@prisma/client").$Enums.DisplayNamePreference;
        profilePhotoUrl: string | null;
        pointsBalance: number;
        isBannedFromMain: boolean;
        isPermanentlyBanned: boolean;
        primaryProvinceId: number | null;
        primaryCantonId: number | null;
        approvedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(req: AuthedRequest, id: string, body: any): Promise<{
        id: string;
        email: string;
        role: import("@prisma/client").$Enums.Role;
        status: import("@prisma/client").$Enums.AccountStatus;
        phone: string | null;
        birthDate: Date | null;
        displayName: string | null;
        nickname: string | null;
        displayNamePreference: import("@prisma/client").$Enums.DisplayNamePreference;
        profilePhotoUrl: string | null;
        pointsBalance: number;
        isBannedFromMain: boolean;
        isPermanentlyBanned: boolean;
        primaryProvinceId: number | null;
        primaryCantonId: number | null;
        approvedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    uploadProfilePhoto(req: AuthedRequest, id: string, file?: Express.Multer.File): Promise<{
        profilePhotoUrl: string;
    }>;
    setPassword(req: AuthedRequest, id: string, body: any): Promise<{
        ok: boolean;
    }>;
    listStrikes(req: AuthedRequest, id: string): Promise<{
        activeCount: number;
        isBannedFromMain: boolean;
        isPermanentlyBanned: any;
        strikes: {
            id: string;
            createdAt: Date;
            userId: string;
            createdByUserId: string | null;
            note: string | null;
            expiresAt: Date;
        }[];
    }>;
    addStrike(req: AuthedRequest, id: string, body: any): Promise<{
        ok: boolean;
        activeCount: number;
    }>;
    unbanAndReset(req: AuthedRequest, id: string): Promise<{
        ok: boolean;
    }>;
    banPermanent(req: AuthedRequest, id: string): Promise<{
        ok: boolean;
    }>;
    points(req: AuthedRequest, id: string): Promise<{
        pointsBalance: number;
        transactions: {
            id: string;
            delta: number;
            reason: string;
            createdAt: Date;
            createdBy: {
                id: string;
                email: string;
                displayName: string | null;
            } | null;
        }[];
    }>;
    addPoints(req: AuthedRequest, id: string, body: any): Promise<{
        ok: boolean;
        pointsBalance: number;
    }>;
    resetPoints(req: AuthedRequest, id: string): Promise<{
        ok: boolean;
        pointsBalance: number;
    }>;
}
