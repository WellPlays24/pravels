import { PrismaService } from '../prisma/prisma.service';
export declare class PublicGeoController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    provinces(): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
    }[]>;
    cantons(provinceIdRaw: string): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        provinceId: number;
        slug: string;
    }[]>;
}
