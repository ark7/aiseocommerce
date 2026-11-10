import { releaseExpiredReservations } from '@/services/transactionService';
import { prisma } from '@/lib/prisma';

/**
 * The sweep that puts abandoned checkouts back on sale. What matters here is
 * which orders it picks — an unpaid one past its deadline — and that one
 * failing order does not stop the rest.
 */
jest.mock('@/lib/prisma', () => ({
  prisma: {
    order: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    product: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    stockLog: { create: jest.fn() },
    voucherClaim: { updateMany: jest.fn() },
    voucher: { updateMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

const NOW = new Date('2026-10-01T12:00:00.000Z');

/** `releaseStock` opens a transaction; hand it the same mocked client. */
function transactionRunsInline() {
  (prisma.$transaction as jest.Mock).mockImplementation((callback) => callback(prisma));
}

function orderFound(overrides: Record<string, unknown> = {}) {
  (prisma.order.findUnique as jest.Mock).mockResolvedValue({
    id: 'order-1',
    status: 'PENDING',
    orderNumber: 'ORD-1',
    orderItems: [],
    voucherClaim: null,
    ...overrides,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  transactionRunsInline();
  (prisma.order.update as jest.Mock).mockResolvedValue({});
  // `releaseStock` skips a line whose product no longer exists, so the sweep
  // needs a product to unwind.
  (prisma.product.findUnique as jest.Mock).mockResolvedValue({
    id: 'product-1',
    stock: 10,
    saleQuota: null,
  });
  (prisma.product.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
  (prisma.voucherClaim.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
  (prisma.voucher.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
  (prisma.order.findMany as jest.Mock).mockResolvedValue([]);
});

describe('releaseExpiredReservations', () => {
  test('hanya mengambil order PENDING yang sudah lewat tenggat', async () => {
    await releaseExpiredReservations(50, NOW);

    const query = (prisma.order.findMany as jest.Mock).mock.calls[0][0];

    // Order yang sudah dibayar atau dibatalkan tidak boleh ikut tersapu.
    expect(query.where).toEqual({
      status: 'PENDING',
      reservationExpiresAt: { lte: NOW },
    });
    expect(query.take).toBe(50);
  });

  test('membatalkan tiap order yang kedaluwarsa dan melaporkan jumlahnya', async () => {
    (prisma.order.findMany as jest.Mock).mockResolvedValue([{ id: 'order-1' }, { id: 'order-2' }]);
    orderFound();

    const result = await releaseExpiredReservations(50, NOW);

    expect(result).toEqual({ released: 2, failed: [] });
    expect(prisma.order.update).toHaveBeenCalledTimes(2);
    expect((prisma.order.update as jest.Mock).mock.calls[0][0].data).toEqual({
      status: 'CANCELLED',
    });
  });

  test('satu order yang gagal tidak menghentikan sisanya', async () => {
    (prisma.order.findMany as jest.Mock).mockResolvedValue([{ id: 'order-1' }, { id: 'order-2' }]);
    // Order pertama sudah hilang saat hendak dilepas.
    (prisma.order.findUnique as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'order-2',
        status: 'PENDING',
        orderNumber: 'ORD-2',
        orderItems: [],
        voucherClaim: null,
      });

    const result = await releaseExpiredReservations(50, NOW);

    expect(result.released).toBe(1);
    expect(result.failed).toEqual(['order-1']);
  });

  test('mengembalikan kuota coret hanya untuk baris yang memakainya', async () => {
    (prisma.order.findMany as jest.Mock).mockResolvedValue([{ id: 'order-1' }]);
    orderFound({
      orderItems: [
        { productId: 'product-1', quantity: 2, saleQuotaUsed: true },
        { productId: 'product-2', quantity: 1, saleQuotaUsed: false },
      ],
    });

    await releaseExpiredReservations(50, NOW);

    const quotaWrites = (prisma.product.updateMany as jest.Mock).mock.calls.filter(
      ([args]) => 'saleSold' in args.data
    );

    expect(quotaWrites).toHaveLength(1);
    expect(quotaWrites[0][0].where).toEqual({ id: 'product-1', saleSold: { gte: 2 } });
  });

  test('membuka kembali voucher yang ditahan order yang batal', async () => {
    (prisma.order.findMany as jest.Mock).mockResolvedValue([{ id: 'order-1' }]);
    orderFound({ voucherClaim: { id: 'claim-1', voucherId: 'voucher-1' } });

    await releaseExpiredReservations(50, NOW);

    expect((prisma.voucherClaim.updateMany as jest.Mock).mock.calls[0][0]).toMatchObject({
      where: { id: 'claim-1', orderId: 'order-1' },
      data: { usedAt: null, orderId: null },
    });
  });

  test('tidak menyentuh apa pun saat tidak ada yang kedaluwarsa', async () => {
    const result = await releaseExpiredReservations(50, NOW);

    expect(result).toEqual({ released: 0, failed: [] });
    expect(prisma.order.update).not.toHaveBeenCalled();
  });
});
