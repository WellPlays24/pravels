import { PrismaService } from '../prisma/prisma.service';
import type { AuthedRequest } from '../auth/auth.guard';
import type { Response } from 'express';
export declare class TripsController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(req: AuthedRequest, scopeRaw: string | undefined): Promise<{
        myRegistrationStatus: import("@prisma/client").$Enums.TripRegistrationStatus | null;
        province: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            slug: string;
        };
        canton: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            provinceId: number;
            slug: string;
        };
        media: {
            url: string;
            id: string;
            createdAt: Date;
            kind: import("@prisma/client").$Enums.TripMediaKind;
            sortOrder: number;
            tripId: string;
        }[];
        id: string;
        status: import("@prisma/client").$Enums.TripStatus;
        createdAt: Date;
        updatedAt: Date;
        provinceId: number;
        createdByUserId: string | null;
        title: string;
        description: string;
        startsAt: Date;
        endsAt: Date;
        cantonId: number;
        priceCents: number | null;
        capacity: number | null;
        bankName: string | null;
        bankAccountName: string | null;
        bankAccountNumber: string | null;
        bankAccountType: string | null;
        paymentInstructions: string | null;
    }[]>;
    get(id: string): Promise<{
        province: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            slug: string;
        };
        canton: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            provinceId: number;
            slug: string;
        };
        media: {
            url: string;
            id: string;
            createdAt: Date;
            kind: import("@prisma/client").$Enums.TripMediaKind;
            sortOrder: number;
            tripId: string;
        }[];
    } & {
        id: string;
        status: import("@prisma/client").$Enums.TripStatus;
        createdAt: Date;
        updatedAt: Date;
        provinceId: number;
        createdByUserId: string | null;
        title: string;
        description: string;
        startsAt: Date;
        endsAt: Date;
        cantonId: number;
        priceCents: number | null;
        capacity: number | null;
        bankName: string | null;
        bankAccountName: string | null;
        bankAccountNumber: string | null;
        bankAccountType: string | null;
        paymentInstructions: string | null;
    }>;
    flyerPdf(req: AuthedRequest, id: string, inlineRaw: string | undefined, res: Response): Promise<void>;
    myRegistration(req: AuthedRequest, id: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.TripRegistrationStatus;
        amountCents: number | null;
        paymentProofUrl: string | null;
        rewardClaimId: string | null;
        reviewedAt: Date | null;
        reviewNote: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    register(req: AuthedRequest, id: string, paymentProof?: Express.Multer.File, _body?: any): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.TripRegistrationStatus;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        tripId: string;
        amountCents: number | null;
        paymentProofUrl: string | null;
        rewardClaimId: string | null;
        reviewedAt: Date | null;
        reviewedByUserId: string | null;
        reviewNote: string | null;
    }>;
    registerWithReward(req: AuthedRequest, id: string, body: any): Promise<any>;
}
