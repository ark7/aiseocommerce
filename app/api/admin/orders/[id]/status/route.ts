import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireStoreRole } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { updateOrderStatus } from '@/services/orderStatusService';

const StatusSchema = z.object({
  status: z.enum([
    'PENDING',
    'PAID',
    'MANUAL_VERIFICATION',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
    'REFUNDED',
  ]),
  note: z.string().max(500).optional(),
});

interface RouteContext {
  params: { id: string };
}

/**
 * Move an order along its lifecycle. Stock and ledger side effects live in the
 * service, so this stays a thin validate-authorize-delegate shell.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      select: { id: true, storeId: true },
    });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const user = await requireStoreRole(request, order.storeId, ['ADMIN', 'STAFF']);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { status, note } = StatusSchema.parse(await request.json());

    const result = await updateOrderStatus({
      orderId: order.id,
      storeId: order.storeId,
      userId: user.id,
      newStatus: status,
      note,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, status: result.status });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }

    logger.error(
      'Admin order status route failed',
      { orderId: params.id },
      error instanceof Error ? error : String(error)
    );
    return NextResponse.json({ error: 'Failed to change order status' }, { status: 500 });
  }
}
