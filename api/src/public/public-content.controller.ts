import { BadRequestException, Controller, Get, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('public')
export class PublicContentController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('content/:slug')
  async getBySlug(@Param('slug') slug: string) {
    const s = String(slug || '').trim();
    if (!s) throw new BadRequestException('slug is required');

    const page = await this.prisma.contentPage.findUnique({
      where: { slug: s },
      select: { slug: true, title: true, body: true, contentJson: true, updatedAt: true },
    });

    if (page) return page;

    // Safe fallback: return an empty page instead of 404 for first-run.
    return {
      slug: s,
      title: 'Contenido pendiente',
      body: '',
      contentJson: null,
      updatedAt: new Date(0),
    };
  }
}
