import { updateOrderStatus } from '@/services/orderStatusService';
import { prisma } from '@/lib/prisma';
import { auditOrderStatusChanged } from '@/services/auditService';
import { logger } from '@/lib/logger';

jest.mock('@/lib/prisma', () => ({
  prisma: { order: { findUnique: jest.fn() }, $transaction: jest.fn() },
}));

jest.mock('@/services/auditService', () => ({
  auditOrderStatusChanged: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

const ORDER = {
  id: 'order-1',
  storeId: 'store-1',
  status: 'PAID',
  totalAmount: 500000,
  orderNumber: 'ORD-1',
};

function makeTx(overrides: Record<string, unknown> = {}) {
  return {
    order: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    orderItem: { findMany: jest.fn().mockResolvedValue([{ productId: 'prod-1', quantity: 3 }]) },
    product: {
      findUnique: jest.fn().mockResolvedValue({ id: 'prod-1', stock: 10 }),
      update: jest.fn().mockResolvedValue({ stock: 13 }),
    },
    stockLog: { create: jest.fn().mockResolvedValue({}) },
    payment: { findFirst: jest.fn().mockResolvedValue({ id: 'pay-1' }) },
    ledger: { create: jest.fn().mockResolvedValue({}) },
    ...overrides,
  };
}

type Tx = ReturnType<typeof makeTx>;

function run(tx: Tx, newStatus: string, order: Record<string, unknown> = ORDER) {
  (prisma.order.findUnique as jest.Mock).mockResolvedValue(order);
  (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (client: Tx) => unknown) =>
    fn(tx)
  );

  return updateOrderStatus({
    orderId: (order as typeof ORDER).id,
    storeId: (order as typeof ORDER).storeId,
    userId: 'user-1',
    newStatus: newStatus as never,
  });
}

describe('updateOrderStatus', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects an illegal transition without touching the database', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue({ ...ORDER, status: 'CANCELLED' });

    const result = await updateOrderStatus({
      orderId: ORDER.id,
      storeId: ORDER.storeId,
      userId: 'user-1',
      newStatus: 'SHIPPED',
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Cannot move order/);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('hides orders belonging to another store', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(ORDER);

    const result = await updateOrderStatus({
      orderId: ORDER.id,
      storeId: 'other-store',
      userId: 'user-1',
      newStatus: 'PROCESSING',
    });

    expect(result).toEqual({ success: false, error: 'Order not found' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('moves PROCESSING to SHIPPED without stock or ledger movement', async () => {
    const tx = makeTx();
    const result = await run(tx, 'SHIPPED', { ...ORDER, status: 'PROCESSING' });

    expect(result).toEqual({ success: true, status: 'SHIPPED' });
    expect(tx.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ORDER.id, status: 'PROCESSING' },
        data: expect.objectContaining({ status: 'SHIPPED' }),
      })
    );
    expect(tx.stockLog.create).not.toHaveBeenCalled();
    expect(tx.ledger.create).not.toHaveBeenCalled();
    expect(auditOrderStatusChanged).toHaveBeenCalledWith(
      ORDER.id,
      'user-1',
      ORDER.storeId,
      'PROCESSING',
      'SHIPPED'
    );
  });

  it('returns stock and writes a reversing entry when a paid order is cancelled', async () => {
    const tx = makeTx();
    const result = await run(tx, 'CANCELLED');

    expect(result.success).toBe(true);
    expect(tx.product.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'prod-1' }, data: { stock: { increment: 3 } } })
    );
    expect(tx.stockLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'RETURN', previousStock: 10, newStock: 13 }),
      })
    );
    expect(tx.ledger.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'REFUND', amount: 500000, referenceId: ORDER.id }),
      })
    );
  });

  it('writes no reversing entry when no payment was ever confirmed', async () => {
    const tx = makeTx({ payment: { findFirst: jest.fn().mockResolvedValue(null) } });
    await run(tx, 'CANCELLED');

    expect(tx.ledger.create).not.toHaveBeenCalled();
    expect(tx.stockLog.create).toHaveBeenCalled();
  });

  it('writes nothing when another request already moved the order', async () => {
    const tx = makeTx({ order: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) } });
    const result = await run(tx, 'CANCELLED');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already changed/);
    // The loser must not restock or write a refund.
    expect(tx.product.update).not.toHaveBeenCalled();
    expect(tx.stockLog.create).not.toHaveBeenCalled();
    expect(tx.ledger.create).not.toHaveBeenCalled();
    expect(auditOrderStatusChanged).not.toHaveBeenCalled();
  });

  it('reports a failed transaction instead of throwing, and logs it', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(ORDER);
    (prisma.$transaction as jest.Mock).mockRejectedValue(new Error('deadlock'));

    const result = await updateOrderStatus({
      orderId: ORDER.id,
      storeId: ORDER.storeId,
      userId: 'user-1',
      newStatus: 'CANCELLED',
    });

    expect(result).toEqual({ success: false, error: 'Failed to change order status' });
    expect(auditOrderStatusChanged).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to change order status',
      expect.objectContaining({ orderId: ORDER.id, newStatus: 'CANCELLED' }),
      expect.any(Error)
    );
  });
});
