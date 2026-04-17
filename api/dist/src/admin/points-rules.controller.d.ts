import { PrismaService } from '../prisma/prisma.service';
export declare class AdminPointRulesController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        points: number;
        isActive: boolean;
        title: string;
        description: string | null;
        sortOrder: number;
    }[]>;
    create(body: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        points: number;
        isActive: boolean;
        title: string;
        description: string | null;
        sortOrder: number;
    }>;
    update(id: string, body: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        points: number;
        isActive: boolean;
        title: string;
        description: string | null;
        sortOrder: number;
    }>;
    remove(id: string): Promise<{
        ok: boolean;
    }>;
}
