import { PrismaService } from '../prisma/prisma.service';
export declare class PublicRegistrationController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    register(body: any, files: {
        photo1?: Express.Multer.File[];
        photo2?: Express.Multer.File[];
        photo3?: Express.Multer.File[];
    }): Promise<{
        requestId: string;
    }>;
    status(id: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.RequestStatus;
        reviewedAt: Date | null;
        reviewNote: string | null;
        submittedAt: Date;
    }>;
}
