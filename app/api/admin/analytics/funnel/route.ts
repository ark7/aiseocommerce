import { NextResponse } from 'next/server';
import type { OrderStatus, ProductEventType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { REVENUE_STATUSES } from '@/lib/orderStatus';

const DEFAULT_DAYS = 7;
const MAX_DAYS = 90;

const STAFF_ROLES = ['ADMIN', 'STAFF'];

/** Where each funnel step lands in a report row. */
const STEP_FIELD: Record<ProductEventType, 'views' | 'addToCarts' | 'checkoutStarts'> = {
  VIEW: 'views',
  ADD_TO_CART: 'addToCarts',
  CHECKOUT_START: 'checkoutStarts',
};

interface FunnelRow {
  views: number;
  addToCarts: number;
  checkoutStarts: number;
  orders: number;
}

// Reads the Authorization header, so it can never be served statically.
export const dynamic = 'force-dynamic';

/**
 * The upper half of the funnel, per product, next to what it sold.
 *
 * Counts visits rather than units, so the rates mean what they look like: of the
 * people who saw this listing, how many moved on. Two counts per product come
 * from two tables — the steps from ProductEvent, the purchase from OrderItem —
 * which is why a purchase is not also recorded as an event.
 */
export async function GET(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await verifyToken(token);
    if (!user || !STAFF_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Admin/Staff access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    // A window in days rather than a period switch: four period cases here would
    // be four more chances to disagree with the ledger's own date arithmetic.
    const days = Math.min(Math.max(Number(searchParams.get('days')) || DEFAULT_DAYS, 1), MAX_DAYS);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Scope comes from the token only. A `?storeId=` param would let any admin
    // read another store's numbers.
    const [events, sold] = await Promise.all([
      prisma.productEvent.groupBy({
        by: ['productId', 'type'],
        where: { storeId: user.storeId, createdAt: { gte: since } },
        _count: { _all: true },
      }),
      // An order item row is a purchase of that product; the cart merges repeats
      // into one line, so this counts orders rather than units.
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            storeId: user.storeId,
            status: { in: REVENUE_STATUSES as OrderStatus[] },
            createdAt: { gte: since },
          },
        },
        _count: { _all: true },
      }),
    ]);

    const rows = new Map<string, FunnelRow>();
    const rowFor = (productId: string): FunnelRow => {
      const existing = rows.get(productId);
      if (existing) return existing;

      const created: FunnelRow = { views: 0, addToCarts: 0, checkoutStarts: 0, orders: 0 };
      rows.set(productId, created);
      return created;
    };

    for (const event of events) {
      rowFor(event.productId)[STEP_FIELD[event.type]] += event._count._all;
    }
    for (const item of sold) {
      rowFor(item.productId).orders += item._count._all;
    }

    // A product deleted after its events were recorded drops out here rather
    // than showing up as an unnamed row.
    const products = await prisma.product.findMany({
      // Array.from, not spread: the project's tsc target downlevels a spread of a
      // Map iterator to a type error.
      where: { id: { in: Array.from(rows.keys()) }, storeId: user.storeId },
      select: { id: true, name: true, slug: true },
    });

    const report = products
      .map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        ...rowFor(product.id),
      }))
      // Most seen first: the listing worth acting on is the one at the top.
      .sort((a, b) => b.views - a.views);

    return NextResponse.json({ success: true, days, products: report });
  } catch (error) {
    logger.error(
      'Failed to build funnel report',
      undefined,
      error instanceof Error ? error : String(error)
    );
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}
