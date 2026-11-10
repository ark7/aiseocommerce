import { GET } from '@/app/api/admin/analytics/funnel/route';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    productEvent: { groupBy: jest.fn() },
    orderItem: { groupBy: jest.fn() },
    product: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/auth', () => ({ verifyToken: jest.fn() }));
jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const ADMIN = { id: 'user-1', storeId: 'store-1', role: 'ADMIN' };

function request(token = 'token', query = '') {
  return new Request(`http://localhost/api/admin/analytics/funnel${query}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

describe('GET /api/admin/analytics/funnel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyToken as jest.Mock).mockResolvedValue(ADMIN);
    (prisma.productEvent.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.orderItem.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
  });

  test('rejects a request with no token', async () => {
    const response = await GET(request(''));

    expect(response.status).toBe(401);
    expect(prisma.productEvent.groupBy).not.toHaveBeenCalled();
  });

  test('rejects a customer', async () => {
    (verifyToken as jest.Mock).mockResolvedValue({ ...ADMIN, role: 'CUSTOMER' });

    expect((await GET(request())).status).toBe(403);
  });

  test('scopes both queries to the token store, never to a query parameter', async () => {
    await GET(request('token', '?storeId=someone-else'));

    const events = (prisma.productEvent.groupBy as jest.Mock).mock.calls[0][0];
    const sales = (prisma.orderItem.groupBy as jest.Mock).mock.calls[0][0];

    expect(events.where.storeId).toBe(ADMIN.storeId);
    expect(sales.where.order.storeId).toBe(ADMIN.storeId);
  });

  test('counts only revenue statuses as sold', async () => {
    await GET(request());

    const sales = (prisma.orderItem.groupBy as jest.Mock).mock.calls[0][0];
    expect(sales.where.order.status.in).toContain('PAID');
    expect(sales.where.order.status.in).not.toContain('PENDING');
    expect(sales.where.order.status.in).not.toContain('CANCELLED');
  });

  test('merges the steps and the sales for one product into one row', async () => {
    (prisma.productEvent.groupBy as jest.Mock).mockResolvedValue([
      { productId: 'product-1', type: 'VIEW', _count: { _all: 10 } },
      { productId: 'product-1', type: 'ADD_TO_CART', _count: { _all: 4 } },
      { productId: 'product-1', type: 'CHECKOUT_START', _count: { _all: 2 } },
      { productId: 'product-2', type: 'VIEW', _count: { _all: 30 } },
    ]);
    (prisma.orderItem.groupBy as jest.Mock).mockResolvedValue([
      { productId: 'product-1', _count: { _all: 1 } },
    ]);
    (prisma.product.findMany as jest.Mock).mockResolvedValue([
      { id: 'product-1', name: 'Sepatu', slug: 'sepatu' },
      { id: 'product-2', name: 'Tas', slug: 'tas' },
    ]);

    const body = await (await GET(request())).json();

    expect(body.products).toHaveLength(2);
    // Most viewed first: the row worth acting on is the one at the top.
    expect(body.products[0]).toMatchObject({
      id: 'product-2',
      name: 'Tas',
      views: 30,
      addToCarts: 0,
      orders: 0,
    });
    expect(body.products[1]).toMatchObject({
      id: 'product-1',
      views: 10,
      addToCarts: 4,
      checkoutStarts: 2,
      orders: 1,
    });
  });

  test('asks for the products the window actually names, and no others', async () => {
    (prisma.productEvent.groupBy as jest.Mock).mockResolvedValue([
      { productId: 'product-1', type: 'VIEW', _count: { _all: 5 } },
      { productId: 'product-2', type: 'ADD_TO_CART', _count: { _all: 1 } },
    ]);

    await GET(request());

    const query = (prisma.product.findMany as jest.Mock).mock.calls[0][0];
    expect(query.where.id.in.sort()).toEqual(['product-1', 'product-2']);
  });

  test('drops a product that no longer exists rather than reporting a blank row', async () => {
    (prisma.productEvent.groupBy as jest.Mock).mockResolvedValue([
      { productId: 'deleted-product', type: 'VIEW', _count: { _all: 5 } },
    ]);
    (prisma.product.findMany as jest.Mock).mockResolvedValue([]);

    const body = await (await GET(request())).json();

    expect(body.products).toEqual([]);
  });

  test('clamps the window to something a single query can serve', async () => {
    const wide = await (await GET(request('token', '?days=10000'))).json();
    expect(wide.days).toBe(90);

    const backwards = await (await GET(request('token', '?days=-5'))).json();
    expect(backwards.days).toBe(1);

    // Junk is not a window: the default stands rather than an empty report.
    const junk = await (await GET(request('token', '?days=abc'))).json();
    expect(junk.days).toBe(7);
  });
});
