import { PrismaService } from '../prisma/prisma.service';
export declare class PublicStaffController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private toWhatsappUrl;
    staff(): Promise<{
        id: string;
        role: import("@prisma/client").$Enums.Role;
        displayLabel: string;
        email: string;
        profilePhotoUrl: string | null;
        whatsappUrl: string | null;
        province: string | null;
        canton: string | null;
    }[]>;
}
