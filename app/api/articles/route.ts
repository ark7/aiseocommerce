import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const ArticleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  content: z.string().min(1, 'Content is required'),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  imageUrl: z.string().url('Invalid image URL').optional().or(z.literal('')),
  isFeatured: z.boolean().optional(),
});

export async function GET(
  request: Request,
) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
      return NextResponse.json({ error: 'Staff or Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const hasPagination = searchParams.has('page') || searchParams.has('limit') || searchParams.get('paginate') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const where: any = { storeId: user.storeId };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) where.createdAt.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          where.createdAt.lte = end;
        }
      }
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...(hasPagination ? { skip: (page - 1) * limit, take: limit } : {}),
        include: {
          products: {
            include: {
              product: {
                select: { id: true, name: true },
              },
            },
          },
        },
      }),
      prisma.article.count({ where }),
    ]);

    const formattedArticles = articles.map(a => ({
      ...a,
      products: a.products.map(p => ({ id: p.product.id, name: p.product.name })),
    }));

    return NextResponse.json({
      success: true,
      articles: formattedArticles,
      pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
    });
  } catch (error) {
    logger.error('Fetch articles failed', {}, error instanceof Error ? error : String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
      return NextResponse.json({ error: 'Staff or Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = ArticleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { title, slug, content, seoTitle, seoDescription, imageUrl, isFeatured } = parsed.data;

    // Check for slug uniqueness within the store
    const existing = await prisma.article.findFirst({
      where: { slug, storeId: user.storeId },
    });

    if (existing) {
      return NextResponse.json({ error: 'Slug already exists in this store' }, { status: 400 });
    }

    const article = await prisma.article.create({
      data: {
        title,
        slug,
        content,
        seoTitle,
        seoDescription,
        imageUrl,
        isFeatured: isFeatured ?? false,
        storeId: user.storeId,
      },
    });

    return NextResponse.json({ success: true, article }, { status: 201 });
  } catch (error) {
    logger.error('Create article failed', {}, error instanceof Error ? error : String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
