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

    const articles = await prisma.article.findMany({
      where: { storeId: user.storeId },
      orderBy: { createdAt: 'desc' },
      include: {
        products: {
          include: {
            product: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    const formattedArticles = articles.map(a => ({
      ...a,
      products: a.products.map(p => ({ id: p.product.id, name: p.product.name })),
    }));

    return NextResponse.json({ success: true, articles: formattedArticles });
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
