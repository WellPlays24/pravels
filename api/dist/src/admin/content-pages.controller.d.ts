import { PrismaService } from '../prisma/prisma.service';
export declare class AdminContentPagesController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(): Promise<{
        id: string;
        updatedAt: Date;
        slug: string;
        title: string;
    }[]>;
    get(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        title: string;
        body: string;
        contentJson: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
    uploadAsset(id: string, file?: Express.Multer.File): Promise<{
        url: string;
    }>;
    create(body: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        title: string;
        body: string;
        contentJson: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
    update(id: string, body: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        title: string;
        body: string;
        contentJson: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
    remove(id: string): Promise<{
        ok: boolean;
    }>;
}
