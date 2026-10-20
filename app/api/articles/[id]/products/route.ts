import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const ProductAssociationSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: articleId } = await params;
    const user = await requireUser(request);

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = ProductAssociationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { productId } = parsed.data;

    // Ensure article belongs to store
    const article = await prisma.article.findFirst({
      where: { id: articleId, storeId: user.storeId },
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Ensure product belongs to store
    const product = await prisma.product.findFirst({
      where: { id: productId, storeId: user.storeId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    await prisma.articleProduct.upsert({
      where: {
        articleId_productId: {
          articleId,
          productId,
        },
      },
      update: {},
      create: {
        articleId,
        productId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Associate product failed', {}, error instanceof Error ? error : String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: articleId } = await params;
    const user = await requireUser(request);

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = ProductAssociationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { productId } = parsed.data;

    // Ensure article belongs to store
    const article = await prisma.article.findFirst({
      where: { id: articleId, storeId: user.storeId },
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    await prisma.articleProduct.deleteMany({
      where: {
        articleId,
        productId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Dissociate product failed', {}, error instanceof Error ? error : String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
