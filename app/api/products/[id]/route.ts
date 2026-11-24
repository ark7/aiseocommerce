import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbacServer';
import { logger } from '@/lib/logger';

interface RouteContext {
  params: { id: string };
}

/**
 * Single product, for the admin edit form.
 *
 * The store is read off the row and never off the request: whoever asks has to
 * already belong to the store that owns this product.
 */
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        images: { orderBy: { order: 'asc' } },
        category: true,
        priceTiers: {
          where: { variantId: null },
          orderBy: { minQty: 'asc' },
        },
        variants: {
          include: {
            priceTiers: { orderBy: { minQty: 'asc' } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const auth = await requirePermission(request, 'products', {
      unauthenticatedStatus: 403,
      storeId: product.storeId,
    });
    if (!auth.authorized) return auth.response;
    if (auth.user.storeId !== product.storeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ success: true, product });
  } catch (error) {
    logger.error(
      'Product fetch failed',
      { productId: params.id },
      error instanceof Error ? error : String(error)
    );
    return NextResponse.json({ error: 'Failed to load product' }, { status: 500 });
  }
}
