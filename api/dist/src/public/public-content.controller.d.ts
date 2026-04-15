import { PrismaService } from '../prisma/prisma.service';
export declare class PublicContentController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getBySlug(slug: string): Promise<{
        updatedAt: Date;
        slug: string;
        title: string;
        body: string;
        contentJson: import("@prisma/client/runtime/client").JsonValue;
    }>;
}
