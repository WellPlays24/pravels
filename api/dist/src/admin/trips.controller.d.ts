import { PrismaService } from '../prisma/prisma.service';
import type { AuthedRequest } from '../auth/auth.guard';
import { AddTripMediaDto, CreateTripDto, UpdateTripDto, UploadTripMediaDto } from './trips.dto';
export declare class AdminTripsController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    allRegistrations(req: AuthedRequest, statusRaw?: string, tripId?: string): Promise<({
        trip: {
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
        };
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
    } & {
        id: string;
        status: import("@prisma/client").$Enums.TripRegistrationStatus;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        tripId: string;
        amountCents: number | null;
        paymentProofUrl: string | null;
        reviewedAt: Date | null;
        reviewedByUserId: string | null;
        reviewNote: string | null;
    })[]>;
    list(req: AuthedRequest): Promise<({
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
    })[]>;
    cantons(provinceIdRaw: string): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        provinceId: number;
        slug: string;
    }[]>;
    create(req: AuthedRequest, dto: CreateTripDto): Promise<{
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
    get(req: AuthedRequest, id: string): Promise<{
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
    update(req: AuthedRequest, id: string, dto: UpdateTripDto): Promise<{
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
    addMedia(req: AuthedRequest, id: string, dto: AddTripMediaDto): Promise<{
        url: string;
        id: string;
        createdAt: Date;
        kind: import("@prisma/client").$Enums.TripMediaKind;
        sortOrder: number;
        tripId: string;
    }>;
    uploadMedia(req: AuthedRequest, id: string, dto: UploadTripMediaDto, file?: Express.Multer.File): Promise<{
        url: string;
        id: string;
        createdAt: Date;
        kind: import("@prisma/client").$Enums.TripMediaKind;
        sortOrder: number;
        tripId: string;
    }>;
    deleteMedia(req: AuthedRequest, id: string, mediaId: string): Promise<{
        ok: boolean;
    }>;
    publish(req: AuthedRequest, id: string): Promise<{
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
    cancel(req: AuthedRequest, id: string): Promise<{
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
    registrations(req: AuthedRequest, id: string): Promise<({
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
    } & {
        id: string;
        status: import("@prisma/client").$Enums.TripRegistrationStatus;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        tripId: string;
        amountCents: number | null;
        paymentProofUrl: string | null;
        reviewedAt: Date | null;
        reviewedByUserId: string | null;
        reviewNote: string | null;
    })[]>;
    approveRegistration(req: AuthedRequest, registrationId: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.TripRegistrationStatus;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        tripId: string;
        amountCents: number | null;
        paymentProofUrl: string | null;
        reviewedAt: Date | null;
        reviewedByUserId: string | null;
        reviewNote: string | null;
    }>;
    rejectRegistration(req: AuthedRequest, registrationId: string, body: any): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.TripRegistrationStatus;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        tripId: string;
        amountCents: number | null;
        paymentProofUrl: string | null;
        reviewedAt: Date | null;
        reviewedByUserId: string | null;
        reviewNote: string | null;
    }>;
}
