import { PrismaService } from '../prisma/prisma.service';
import type { AuthedRequest } from '../auth/auth.guard';
import { CreateWhatsappGroupDto, UpdateWhatsappGroupDto } from './whatsapp-groups.dto';
export declare class AdminController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    provinces(): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
    }[]>;
    listGroups(req: AuthedRequest): Promise<({
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
    })[]>;
    createGroup(req: AuthedRequest, dto: CreateWhatsappGroupDto): Promise<{
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
    }>;
    updateGroup(req: AuthedRequest, id: string, dto: UpdateWhatsappGroupDto): Promise<{
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
    }>;
    deleteGroup(req: AuthedRequest, id: string): Promise<{
        ok: boolean;
    }>;
}
