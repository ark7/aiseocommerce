import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { OrderStatus, LedgerType, StockType } from '@prisma/client';
import { auditOrderStatusChanged } from '@/services/auditService';
import { canTransition } from '@/lib/orderStatus';

/** Statuses that put the order's reserved stock back on the shelf. */
const RESTOCKING_STATUSES: OrderStatus[] = ['CANCELLED', 'REFUNDED'];

/** Statuses that owe the customer their money back. */
const REVERSING_STATUSES: OrderStatus[] = ['CANCELLED', 'REFUNDED'];

export interface UpdateOrderStatusInput {
  orderId: string;
  storeId: string;
  userId: string;
  newStatus: OrderStatus;
  note?: string;
}

export interface UpdateOrderStatusResult {
  success: boolean;
  status?: OrderStatus;
  error?: string;
}

/**
 * Move an order to its next status, plus the bookkeeping that move implies:
 * stock returns for a cancel/refund, a reversing ledger entry when money had
 * already come in, and an audit trail entry.
 *
 * All of it runs in one transaction so a half-applied status cannot leave stock
 * or the ledger out of step with the order.
 */
export async function updateOrderStatus(
  input: UpdateOrderStatusInput
): Promise<UpdateOrderStatusResult> {
  const { orderId, storeId, userId, newStatus, note } = input;

  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, storeId: true, status: true, totalAmount: true, orderNumber: true },
  });

  if (!existing || existing.storeId !== storeId) {
    return { success: false, error: 'Order not found' };
  }
  if (!canTransition(existing.status, newStatus)) {
    return { success: false, error: `Cannot move order from ${existing.status} to ${newStatus}` };
  }

  const isRestocking = RESTOCKING_STATUSES.includes(newStatus);
  const isReversing = REVERSING_STATUSES.includes(newStatus);

  try {
    const applied = await prisma.$transaction(async (tx) => {
      // Compare-and-swap on the status we validated against. This is what
      // serializes two concurrent requests under READ COMMITTED: the loser
      // updates 0 rows and writes no stock or ledger movement, so a
      // double-click or a client retry cannot restock twice.
      const moved = await tx.order.updateMany({
        where: { id: orderId, status: existing.status },
        data: {
          status: newStatus,
          ...(newStatus === 'SHIPPED' ? { shippedAt: new Date() } : {}),
          ...(newStatus === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
          ...(newStatus === 'COMPLETED' ? { completedAt: new Date() } : {}),
          ...(note ? { notes: note } : {}),
        },
      });

      if (moved.count === 0) return false;

      if (isRestocking) {
        const items = await tx.orderItem.findMany({
          where: { orderId },
          select: { productId: true, quantity: true },
        });

        for (const item of items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { id: true },
          });
          if (!product) continue;

          // `update` returns the post-increment row, so the log records the real
          // before/after even when another order moves the same product at once.
          const updated = await tx.product.update({
            where: { id: product.id },
            data: { stock: { increment: item.quantity } },
            select: { stock: true },
          });

          await tx.stockLog.create({
            data: {
              productId: product.id,
              type: StockType.RETURN,
              quantity: item.quantity,
              previousStock: updated.stock - item.quantity,
              newStock: updated.stock,
              reason: note || `Order ${existing.orderNumber} ${newStatus}`,
              referenceId: orderId,
              userId,
            },
          });
        }
      }

      if (isReversing) {
        const paidPayment = await tx.payment.findFirst({
          where: { orderId, status: 'PAID' },
          select: { id: true },
        });

        if (paidPayment) {
          await tx.ledger.create({
            data: {
              storeId,
              type: LedgerType.REFUND,
              amount: existing.totalAmount,
              description: `Order ${existing.orderNumber} ${newStatus}`,
              referenceId: orderId,
              referenceType: 'ORDER',
              category: 'REFUND',
            },
          });
        }
      }

      return true;
    });

    if (!applied) {
      return { success: false, error: 'Order status was already changed by another request' };
    }

    await auditOrderStatusChanged(orderId, userId, storeId, existing.status, newStatus);

    logger.info('Order status changed', {
      storeId,
      userId,
      orderId,
      previousStatus: existing.status,
      newStatus,
    });

    return { success: true, status: newStatus };
  } catch (error) {
    logger.error(
      'Failed to change order status',
      { storeId, userId, orderId, newStatus },
      error instanceof Error ? error : String(error)
    );
    return { success: false, error: 'Failed to change order status' };
  }
}
