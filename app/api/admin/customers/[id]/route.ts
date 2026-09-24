import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { logger } from '@/lib/logger';

const STAFF_ROLES = ['ADMIN', 'STAFF'];
const ORDER_HISTORY_LIMIT = 100;

interface RouteContext {
  params: { id: string };
}

/** One customer plus their order history. Staff-only, scoped to the store. */
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser(request);
    if (!user || !STAFF_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // A customer of another store must look identical to one that never existed,
    // so the store filter is part of the lookup rather than a later check.
    const customer = await prisma.user.findFirst({
      where: { id: params.id, storeId: user.storeId, role: 'CUSTOMER' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: ORDER_HISTORY_LIMIT,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Lifetime totals come from an aggregate, not the capped history above.
    const totals = await prisma.order.aggregate({
      where: { storeId: user.storeId, userId: customer.id },
      _sum: { totalAmount: true },
      _count: { _all: true },
    });

    return NextResponse.json({
      success: true,
      customer: {
        ...customer,
        name: [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email,
        orderCount: totals._count._all,
        totalSpent: totals._sum.totalAmount ?? 0,
        historyTruncated: totals._count._all > customer.orders.length,
      },
    });
  } catch (error) {
    logger.error(
      'Failed to read customer',
      { customerId: params.id },
      error instanceof Error ? error : String(error)
    );
    return NextResponse.json({ error: 'Failed to read customer' }, { status: 500 });
  }
}
