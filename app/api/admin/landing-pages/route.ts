import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { revalidateLandingPage } from '@/lib/revalidate';

const LandingPageSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug only allows lowercase letters, numbers, and hyphens'),
  customPath: z.string().optional().nullable(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  seoKeywords: z.string().optional().nullable(),
  ogImage: z.string().optional().nullable(),
  isPublished: z.boolean().default(true),
  productId: z.string().optional().nullable(),
  sections: z.array(z.any()).default([]),
});

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
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
        { slug: { contains: search, mode: 'insensitive' } },
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

    const [landingPages, total] = await Promise.all([
      prisma.landingPage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...(hasPagination ? { skip: (page - 1) * limit, take: limit } : {}),
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sellingPrice: true,
              discountPrice: true,
              images: {
                where: { isPrimary: true },
                take: 1,
                select: { url: true },
              },
            },
          },
        },
      }),
      typeof (prisma.landingPage as any)?.count === 'function'
        ? prisma.landingPage.count({ where })
        : Promise.resolve(0),
    ]);

    return NextResponse.json({
      success: true,
      landingPages,
      pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
    });
  } catch (error) {
    logger.error('Fetch landing pages failed', {}, error instanceof Error ? error : String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
      return NextResponse.json({ error: 'Staff or Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = LandingPageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    // Check slug uniqueness
    const existing = await prisma.landingPage.findFirst({
      where: { slug: data.slug, storeId: user.storeId },
    });

    if (existing) {
      return NextResponse.json({ error: 'Slug already exists in this store' }, { status: 400 });
    }

    const landingPage = await prisma.landingPage.create({
      data: {
        title: data.title,
        slug: data.slug,
        customPath: data.customPath || null,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        seoKeywords: data.seoKeywords || null,
        ogImage: data.ogImage || null,
        isPublished: data.isPublished,
        productId: data.productId || null,
        sections: data.sections,
        storeId: user.storeId,
      },
    });

    // Trigger instant cache purge and sitemap update
    await revalidateLandingPage(user.storeId, landingPage.slug);

    return NextResponse.json({ success: true, landingPage }, { status: 201 });
  } catch (error) {
    logger.error('Create landing page failed', {}, error instanceof Error ? error : String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

