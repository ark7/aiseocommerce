import { GET } from '@/app/api/admin/stats/route';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { logger } from '@/lib/logger';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    product: { count: jest.fn() },
    order: { count: jest.fn(), findMany: jest.fn() },
    user: { count: jest.fn() },
  },
}));

jest.mock('@/lib/auth', () => ({ verifyToken: jest.fn() }));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), info: jest.fn() } }));

const ADMIN = { id: 'user-1', storeId: 'store-1', role: 'ADMIN' };

function request(token: string | null = 'token') {
  return new Request('http://localhost/api/admin/stats', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

/**
 * Wire the five reads the handler makes in parallel. `order.count` is called
 * twice with different filters, so it answers by the filter it was given.
 */
function stub({
  products = 0,
  orders = 0,
  customers = 0,
  pending = 0,
  paid = [] as Array<{ totalAmount?: number | null }>,
} = {}) {
  (prisma.product.count as jest.Mock).mockResolvedValue(products);
  (prisma.order.count as jest.Mock).mockImplementation(({ where }) =>
    Promise.resolve(where.status === 'PENDING' ? pending : orders)
  );
  (prisma.user.count as jest.Mock).mockResolvedValue(customers);
  (prisma.order.findMany as jest.Mock).mockResolvedValue(paid);
}

async function stats() {
  const response = await GET(request());
  const body = await response.json();
  return body.stats;
}

describe('GET /api/admin/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyToken as jest.Mock).mockResolvedValue(ADMIN);
    stub();
  });

  it('sums totalAmount, the column Order actually has', async () => {
    stub({ paid: [{ totalAmount: 150000 }, { totalAmount: 250000 }, { totalAmount: 100000 }] });

    // A handler reading a non-existent `total` sums undefined and answers 0,
    // which is what put a permanent Rp 0 on the dashboard.
    await expect(stats()).resolves.toMatchObject({ revenue: 500000 });
  });

  it('counts an order with a null total as zero rather than poisoning the sum with NaN', async () => {
    stub({ paid: [{ totalAmount: 200000 }, { totalAmount: null }] });

    await expect(stats()).resolves.toMatchObject({ revenue: 200000 });
  });

  it('answers 0 revenue, not undefined, when nothing has been paid', async () => {
    stub({ paid: [] });

    await expect(stats()).resolves.toMatchObject({ revenue: 0 });
  });

  it('scopes every read to the store on the token', async () => {
    await stats();

    expect(prisma.product.count).toHaveBeenCalledWith({ where: { storeId: 'store-1' } });
    expect(prisma.order.findMany).toHaveBeenCalledWith({
      where: { storeId: 'store-1', status: 'PAID' },
    });
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: { storeId: 'store-1', role: 'CUSTOMER' },
    });
    expect(prisma.order.count).toHaveBeenCalledWith({
      where: { storeId: 'store-1', status: 'PENDING' },
    });
  });

  it('reports each count under the name the dashboard reads', async () => {
    stub({ products: 12, orders: 34, customers: 5, pending: 2 });

    await expect(stats()).resolves.toEqual({
      products: 12,
      orders: 34,
      customers: 5,
      pendingOrders: 2,
      revenue: 0,
    });
  });

  it('logs a failure through the logger instead of a bare console', async () => {
    (prisma.product.count as jest.Mock).mockRejectedValue(new Error('db down'));

    const response = await GET(request());

    expect(response.status).toBe(500);
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to fetch stats',
      undefined,
      expect.any(Error)
    );
  });

  it('rejects a caller with no token before touching the database', async () => {
    const response = await GET(request(null));

    expect(response.status).toBe(401);
    expect(prisma.product.count).not.toHaveBeenCalled();
  });

  it('rejects a customer, who may not read store-wide numbers', async () => {
    (verifyToken as jest.Mock).mockResolvedValue({ ...ADMIN, role: 'CUSTOMER' });

    const response = await GET(request());

    expect(response.status).toBe(403);
    expect(prisma.product.count).not.toHaveBeenCalled();
  });
});
