import { PrismaService } from '../prisma/prisma.service';
import type { AuthedRequest } from '../auth/auth.guard';
export declare class AdminRegistrationRequestsController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(req: AuthedRequest, statusRaw?: string): Promise<({
        priorityProvince: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            slug: string;
        };
        priorityCanton: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            provinceId: number;
            slug: string;
        };
        requestedProvinces: ({
            province: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                slug: string;
            };
        } & {
            provinceId: number;
            requestId: string;
        })[];
    } & {
        id: string;
        email: string;
        status: import("@prisma/client").$Enums.RequestStatus;
        phone: string;
        nickname: string | null;
        displayNamePreference: import("@prisma/client").$Enums.DisplayNamePreference;
        profilePhotoUrl: string | null;
        passwordHash: string;
        reviewedAt: Date | null;
        reviewedByUserId: string | null;
        reviewNote: string | null;
        fullName: string;
        idType: import("@prisma/client").$Enums.IdType;
        idNumber: string;
        birthDate: Date;
        socialUrl: string;
        photo1Url: string;
        photo2Url: string;
        photo3Url: string;
        priorityProvinceId: number;
        priorityCantonId: number;
        approvedAuthUserId: string | null;
        submittedAt: Date;
    })[]>;
    get(req: AuthedRequest, id: string): Promise<{
        priorityProvince: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            slug: string;
        };
        priorityCanton: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            provinceId: number;
            slug: string;
        };
        requestedProvinces: ({
            province: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                slug: string;
            };
        } & {
            provinceId: number;
            requestId: string;
        })[];
    } & {
        id: string;
        email: string;
        status: import("@prisma/client").$Enums.RequestStatus;
        phone: string;
        nickname: string | null;
        displayNamePreference: import("@prisma/client").$Enums.DisplayNamePreference;
        profilePhotoUrl: string | null;
        passwordHash: string;
        reviewedAt: Date | null;
        reviewedByUserId: string | null;
        reviewNote: string | null;
        fullName: string;
        idType: import("@prisma/client").$Enums.IdType;
        idNumber: string;
        birthDate: Date;
        socialUrl: string;
        photo1Url: string;
        photo2Url: string;
        photo3Url: string;
        priorityProvinceId: number;
        priorityCantonId: number;
        approvedAuthUserId: string | null;
        submittedAt: Date;
    }>;
    approve(req: AuthedRequest, id: string): Promise<{
        ok: boolean;
    }>;
    reject(req: AuthedRequest, id: string, body: any): Promise<{
        ok: boolean;
    }>;
}
