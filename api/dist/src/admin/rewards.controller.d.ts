import { PrismaService } from '../prisma/prisma.service';
export declare class AdminRewardsController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    usage(): Promise<{
        byRewardId: Record<string, {
            approved: number;
            redeemed: number;
        }>;
    }>;
    list(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        description: string | null;
        pointsCost: number;
        stock: number | null;
        grantsFreeTrip: boolean;
    }[]>;
    create(body: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        description: string | null;
        pointsCost: number;
        stock: number | null;
        grantsFreeTrip: boolean;
    }>;
    update(id: string, body: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        description: string | null;
        pointsCost: number;
        stock: number | null;
        grantsFreeTrip: boolean;
    }>;
    remove(id: string): Promise<{
        ok: boolean;
    }>;
}
