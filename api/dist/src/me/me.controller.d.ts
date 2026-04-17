import { PrismaService } from '../prisma/prisma.service';
import type { AuthedRequest } from '../auth/auth.guard';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
declare class UpdateMeProfileDto {
    nickname?: string;
    phone?: string;
    displayNamePreference?: 'FULL_NAME' | 'NICKNAME';
}
declare class ChangePasswordDto {
    currentPassword: string;
    newPassword: string;
}
export declare class MeController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private makeRedeemCode;
    myProfile(req: AuthedRequest): Promise<{
        id: string;
        email: string;
        role: import("@prisma/client").$Enums.Role;
        status: import("@prisma/client").$Enums.AccountStatus;
        phone: string | null;
        displayName: string | null;
        nickname: any;
        displayNamePreference: any;
        displayLabel: any;
        profilePhotoUrl: any;
        pointsBalance: number;
        activeStrikes: number;
        isBannedFromMain: boolean;
        isPermanentlyBanned: any;
    }>;
    updateProfile(req: AuthedRequest, dto: UpdateMeProfileDto): Promise<{
        ok: boolean;
    }>;
    private toWhatsappUrl;
    birthdays(req: AuthedRequest, modeRaw?: string, dateRaw?: string, yearRaw?: string, monthRaw?: string): Promise<{
        mode: string;
        year: number;
        month: number;
        day: number | null;
        items: {
            id: string;
            role: import("@prisma/client").$Enums.Role;
            displayLabel: any;
            email: string;
            profilePhotoUrl: string | null;
            province: string | null;
            canton: string | null;
            day: number;
            month: number;
            age: number | null;
        }[];
    }>;
    notificationUnreadCount(req: AuthedRequest): Promise<{
        count: number;
    }>;
    notifications(req: AuthedRequest, filterRaw?: string, cursorRaw?: string, takeRaw?: string): Promise<{
        items: {
            id: string;
            createdAt: Date;
            userId: string;
            data: Prisma.JsonValue | null;
            title: string;
            type: import("@prisma/client").$Enums.NotificationType;
            body: string;
            readAt: Date | null;
            actorUserId: string | null;
        }[];
        nextCursor: string | null;
    }>;
    markNotificationRead(req: AuthedRequest, id: string): Promise<{
        ok: boolean;
    }>;
    markAllNotificationsRead(req: AuthedRequest): Promise<{
        ok: boolean;
    }>;
    sendBirthdayGreeting(req: AuthedRequest, body: any): Promise<{
        ok: boolean;
    }>;
    layotsSummary(req: AuthedRequest): Promise<{
        my: {
            pointsBalance: number;
        };
        top: {
            id: string;
            displayLabel: any;
            profilePhotoUrl: string | null;
            pointsBalance: number;
            province: string | null;
            canton: string | null;
        }[];
        rules: {
            id: string;
            title: string;
            description: string | null;
            points: number;
        }[];
        rewards: {
            id: string;
            name: string;
            description: string | null;
            pointsCost: number;
            stock: number | null;
            canClaim: boolean;
            isPending: boolean;
        }[];
    }>;
    myRewardClaims(req: AuthedRequest): Promise<({
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
    createRewardClaim(req: AuthedRequest, body: any): Promise<{
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
    rewardVoucherPdf(req: AuthedRequest, id: string, res: Response): Promise<void>;
    changePassword(req: AuthedRequest, dto: ChangePasswordDto): Promise<{
        ok: boolean;
    }>;
    uploadProfilePhoto(req: AuthedRequest, file?: Express.Multer.File): Promise<{
        profilePhotoUrl: string;
    }>;
    myWhatsappGroups(req: AuthedRequest): Promise<{
        main: {
            id: string;
            name: string;
            banned: boolean;
            note: string;
        } | null;
        joinable: ({
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
        })[];
    }>;
    groupCatalog(req: AuthedRequest): Promise<{
        main: {
            id: string;
            name: string;
            banned: boolean;
            note: string;
        } | null;
        groups: {
            id: string;
            kind: import("@prisma/client").$Enums.GroupKind;
            name: string;
            province: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                slug: string;
            } | null;
            status: string;
            url: string | null;
        }[];
    }>;
    requestGroup(req: AuthedRequest, groupId: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.GroupJoinRequestStatus;
        createdAt: Date;
        userId: string;
        reviewedAt: Date | null;
        reviewedByUserId: string | null;
        reviewNote: string | null;
        groupId: string;
    } | {
        ok: boolean;
    }>;
}
export {};
