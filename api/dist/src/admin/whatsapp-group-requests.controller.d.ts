import { PrismaService } from '../prisma/prisma.service';
import type { AuthedRequest } from '../auth/auth.guard';
export declare class AdminWhatsappGroupRequestsController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    allowedProvinceIds(req: AuthedRequest): Promise<number[] | null>;
    list(req: AuthedRequest, statusRaw?: string): Promise<({
        user: {
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
        };
        group: {
            province: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                slug: string;
            } | null;
        } & {
            url: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            kind: import("@prisma/client").$Enums.GroupKind;
            provinceId: number | null;
            isActive: boolean;
            createdByUserId: string | null;
        };
    } & {
        id: string;
        status: import("@prisma/client").$Enums.GroupJoinRequestStatus;
        createdAt: Date;
        userId: string;
        reviewedAt: Date | null;
        reviewedByUserId: string | null;
        reviewNote: string | null;
        groupId: string;
    })[]>;
    approve(req: AuthedRequest, id: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.GroupJoinRequestStatus;
        createdAt: Date;
        userId: string;
        reviewedAt: Date | null;
        reviewedByUserId: string | null;
        reviewNote: string | null;
        groupId: string;
    }>;
    reject(req: AuthedRequest, id: string, body: any): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.GroupJoinRequestStatus;
        createdAt: Date;
        userId: string;
        reviewedAt: Date | null;
        reviewedByUserId: string | null;
        reviewNote: string | null;
        groupId: string;
    }>;
}
