import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStoreRole } from '@/lib/auth';
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
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const user = await requireStoreRole(request, product.storeId, ['ADMIN']);
    if (!user) {
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
