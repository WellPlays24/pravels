import { PrismaService } from '../prisma/prisma.service';
export declare class AdminSettingsController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    ensure(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        communityName: string;
        logoUrl: string | null;
        supportUserId: string | null;
    }>;
    get(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        communityName: string;
        logoUrl: string | null;
        supportUserId: string | null;
    }>;
    update(body: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        communityName: string;
        logoUrl: string | null;
        supportUserId: string | null;
    }>;
    uploadLogo(file?: Express.Multer.File): Promise<{
        url: string;
    }>;
}
