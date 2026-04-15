import { PrismaService } from '../prisma/prisma.service';
import type { AuthedRequest } from '../auth/auth.guard';
declare class UpdateMeProfileDto {
    nickname?: string;
    displayNamePreference?: 'FULL_NAME' | 'NICKNAME';
}
export declare class MeController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    myProfile(req: AuthedRequest): Promise<{
        id: string;
        email: string;
        role: import("@prisma/client").$Enums.Role;
        status: import("@prisma/client").$Enums.AccountStatus;
        displayName: string | null;
        nickname: any;
        displayNamePreference: any;
        displayLabel: any;
        profilePhotoUrl: any;
    }>;
    updateProfile(req: AuthedRequest, dto: UpdateMeProfileDto): Promise<{
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
