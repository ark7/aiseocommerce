import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { revalidateLandingPage } from '@/lib/revalidate';

const LandingPageUpdateSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug only allows lowercase letters, numbers, and hyphens')
    .optional(),
  customPath: z.string().optional().nullable(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  seoKeywords: z.string().optional().nullable(),
  ogImage: z.string().optional().nullable(),
  isPublished: z.boolean().optional(),
  productId: z.string().optional().nullable(),
  sections: z.array(z.any()).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireUser(request);
    if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
      return NextResponse.json({ error: 'Staff or Admin access required' }, { status: 403 });
    }

    const landingPage = await prisma.landingPage.findFirst({
      where: { id, storeId: user.storeId },
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
    });

    if (!landingPage) {
      return NextResponse.json({ error: 'Landing page not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, landingPage });
  } catch (error) {
    logger.error('Fetch landing page detail failed', {}, error instanceof Error ? error : String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireUser(request);
    if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
      return NextResponse.json({ error: 'Staff or Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = LandingPageUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.landingPage.findFirst({
      where: { id, storeId: user.storeId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Landing page not found' }, { status: 404 });
    }

    // Check slug uniqueness if slug is being updated
    if (parsed.data.slug && parsed.data.slug !== existing.slug) {
      const duplicate = await prisma.landingPage.findFirst({
        where: { slug: parsed.data.slug, storeId: user.storeId },
      });
      if (duplicate) {
        return NextResponse.json({ error: 'Slug already exists in this store' }, { status: 400 });
      }
    }

    const updated = await prisma.landingPage.update({
      where: { id },
      data: {
        ...(parsed.data.title !== undefined && { title: parsed.data.title }),
        ...(parsed.data.slug !== undefined && { slug: parsed.data.slug }),
        ...(parsed.data.customPath !== undefined && { customPath: parsed.data.customPath || null }),
        ...(parsed.data.seoTitle !== undefined && { seoTitle: parsed.data.seoTitle || null }),
        ...(parsed.data.seoDescription !== undefined && { seoDescription: parsed.data.seoDescription || null }),
        ...(parsed.data.seoKeywords !== undefined && { seoKeywords: parsed.data.seoKeywords || null }),
        ...(parsed.data.ogImage !== undefined && { ogImage: parsed.data.ogImage || null }),
        ...(parsed.data.isPublished !== undefined && { isPublished: parsed.data.isPublished }),
        ...(parsed.data.productId !== undefined && { productId: parsed.data.productId || null }),
        ...(parsed.data.sections !== undefined && { sections: parsed.data.sections }),
      },
    });

    // Revalidate paths including previous slug if renamed
    await revalidateLandingPage(user.storeId, updated.slug, existing.slug);

    return NextResponse.json({ success: true, landingPage: updated });
  } catch (error) {
    logger.error('Update landing page failed', {}, error instanceof Error ? error : String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireUser(request);
    if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
      return NextResponse.json({ error: 'Staff or Admin access required' }, { status: 403 });
    }

    const existing = await prisma.landingPage.findFirst({
      where: { id, storeId: user.storeId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Landing page not found' }, { status: 404 });
    }

    await prisma.landingPage.delete({
      where: { id },
    });

    // Purge cached landing page and update sitemap
    await revalidateLandingPage(user.storeId, existing.slug);

    return NextResponse.json({ success: true, message: 'Landing page deleted successfully' });
  } catch (error) {
    logger.error('Delete landing page failed', {}, error instanceof Error ? error : String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

