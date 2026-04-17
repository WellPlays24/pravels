import { PrismaService } from '../prisma/prisma.service';
export declare class PublicSettingsController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private toWhatsappUrl;
    get(): Promise<{
        communityName: string;
        logoUrl: string | null;
        updatedAt: Date;
        support: {
            userId: string;
            displayLabel: string | null;
            phone: string | null;
            whatsappUrl: string | null;
        } | null;
    }>;
}
