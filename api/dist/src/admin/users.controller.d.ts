import { PrismaService } from '../prisma/prisma.service';
import type { AuthedRequest } from '../auth/auth.guard';
export declare class AdminUsersController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    allowedProvinceIds(req: AuthedRequest): Promise<number[] | null>;
    list(req: AuthedRequest, roleRaw?: string, statusRaw?: string, provinceIdRaw?: string, cantonIdRaw?: string, qRaw?: string): Promise<{
        id: string;
        email: string;
        role: import("@prisma/client").$Enums.Role;
        status: import("@prisma/client").$Enums.AccountStatus;
        phone: string | null;
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
        displayName: string | null;
        nickname: string | null;
        displayNamePreference: import("@prisma/client").$Enums.DisplayNamePreference;
        profilePhotoUrl: string | null;
        pointsBalance: number;
        isBannedFromMain: boolean;
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
        displayName: string | null;
        nickname: string | null;
        displayNamePreference: import("@prisma/client").$Enums.DisplayNamePreference;
        profilePhotoUrl: string | null;
        pointsBalance: number;
        isBannedFromMain: boolean;
        primaryProvinceId: number | null;
        primaryCantonId: number | null;
        approvedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
