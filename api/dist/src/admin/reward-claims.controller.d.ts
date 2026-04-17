import { PrismaService } from '../prisma/prisma.service';
import type { AuthedRequest } from '../auth/auth.guard';
export declare class AdminRewardClaimsController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private makeCode;
    list(statusRaw?: string): Promise<({
        user: {
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
        };
        reward: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            isActive: boolean;
            description: string | null;
            pointsCost: number;
            stock: number | null;
            grantsFreeTrip: boolean;
        };
    } & {
        id: string;
        status: import("@prisma/client").$Enums.RewardClaimStatus;
        createdAt: Date;
        userId: string;
        reviewedAt: Date | null;
        reviewedByUserId: string | null;
        reviewNote: string | null;
        rewardId: string;
        pointsCostAtClaim: number;
        redeemCode: string | null;
        redeemedAt: Date | null;
        redeemedTripId: string | null;
    })[]>;
    verify(codeRaw?: string): Promise<{
        user: {
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
        };
        reward: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            isActive: boolean;
            description: string | null;
            pointsCost: number;
            stock: number | null;
            grantsFreeTrip: boolean;
        };
    } & {
        id: string;
        status: import("@prisma/client").$Enums.RewardClaimStatus;
        createdAt: Date;
        userId: string;
        reviewedAt: Date | null;
        reviewedByUserId: string | null;
        reviewNote: string | null;
        rewardId: string;
        pointsCostAtClaim: number;
        redeemCode: string | null;
        redeemedAt: Date | null;
        redeemedTripId: string | null;
    }>;
    approve(req: AuthedRequest, id: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.RewardClaimStatus;
        createdAt: Date;
        userId: string;
        reviewedAt: Date | null;
        reviewedByUserId: string | null;
        reviewNote: string | null;
        rewardId: string;
        pointsCostAtClaim: number;
        redeemCode: string | null;
        redeemedAt: Date | null;
        redeemedTripId: string | null;
    }>;
    reject(req: AuthedRequest, id: string, body: any): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.RewardClaimStatus;
        createdAt: Date;
        userId: string;
        reviewedAt: Date | null;
        reviewedByUserId: string | null;
        reviewNote: string | null;
        rewardId: string;
        pointsCostAtClaim: number;
        redeemCode: string | null;
        redeemedAt: Date | null;
        redeemedTripId: string | null;
    }>;
}
