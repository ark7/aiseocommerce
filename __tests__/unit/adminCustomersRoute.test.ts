import { GET as listCustomers } from '@/app/api/admin/customers/route';
import { GET as getCustomer } from '@/app/api/admin/customers/[id]/route';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn() },
    order: { groupBy: jest.fn(), aggregate: jest.fn() },
  },
}));

jest.mock('@/lib/auth', () => ({ requireUser: jest.fn() }));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

const ADMIN = { id: 'user-1', storeId: 'store-1', email: 'a@b.c', role: 'ADMIN' };

const RAW_CUSTOMER = {
  id: 'cust-1',
  email: 'someone@example.com',
  firstName: 'Michel',
  lastName: 'Boyle',
  phone: '613.581.7894',
  isActive: true,
  emailVerified: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

function listRequest(query = '') {
  return new Request(`http://localhost/api/admin/customers${query}`, {
    headers: { Authorization: 'Bearer token' },
  });
}

function getRequest(id = RAW_CUSTOMER.id) {
  return {
    request: new Request(`http://localhost/api/admin/customers/${id}`, {
      headers: { Authorization: 'Bearer token' },
    }),
    context: { params: { id } },
  };
}

describe('GET /api/admin/customers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireUser as jest.Mock).mockResolvedValue(ADMIN);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([RAW_CUSTOMER]);
    (prisma.user.count as jest.Mock).mockResolvedValue(1);
    (prisma.order.groupBy as jest.Mock).mockResolvedValue([
      {
        userId: 'cust-1',
        _count: { _all: 3 },
        _sum: { totalAmount: 1500000 },
        _max: { createdAt: new Date('2026-02-02T00:00:00.000Z') },
      },
    ]);
  });

  it('forbids callers that are not admin or staff', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ ...ADMIN, role: 'CUSTOMER' });

    const response = await listCustomers(listRequest());

    expect(response.status).toBe(403);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('scopes the query to the caller store and to customers', async () => {
    await listCustomers(listRequest());

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ storeId: 'store-1', role: 'CUSTOMER' }),
      })
    );
  });

  it('never selects passwordHash', async () => {
    await listCustomers(listRequest());

    const select = (prisma.user.findMany as jest.Mock).mock.calls[0][0].select;
    expect(select).not.toHaveProperty('passwordHash');
    expect(select).toHaveProperty('email', true);
  });

  it('merges order aggregates into each row and joins the display name', async () => {
    const response = await listCustomers(listRequest());
    const body = await response.json();

    expect(body.customers[0]).toEqual(
      expect.objectContaining({
        id: 'cust-1',
        name: 'Michel Boyle',
        orderCount: 3,
        totalSpent: 1500000,
      })
    );
    expect(body.pagination).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
  });

  it('reports zero orders for a customer with no aggregate row', async () => {
    (prisma.order.groupBy as jest.Mock).mockResolvedValue([]);

    const response = await listCustomers(listRequest());
    const body = await response.json();

    expect(body.customers[0]).toEqual(
      expect.objectContaining({ orderCount: 0, totalSpent: 0, lastOrderAt: null })
    );
  });

  it('does not run the aggregate query when the page is empty', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.user.count as jest.Mock).mockResolvedValue(0);

    const response = await listCustomers(listRequest());

    expect(response.status).toBe(200);
    expect(prisma.order.groupBy).not.toHaveBeenCalled();
  });

  it('applies search across name, email and phone', async () => {
    await listCustomers(listRequest('?search=michel'));

    const where = (prisma.user.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.OR).toHaveLength(4);
    expect(where.OR[0]).toHaveProperty('firstName');
  });

  it('pages with skip and take', async () => {
    await listCustomers(listRequest('?page=3&limit=10'));

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 })
    );
  });

  it('rejects an out-of-range limit with 400', async () => {
    const response = await listCustomers(listRequest('?limit=5000'));

    expect(response.status).toBe(400);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('returns 500 instead of throwing when the database fails', async () => {
    (prisma.user.findMany as jest.Mock).mockRejectedValue(new Error('db down'));

    const response = await listCustomers(listRequest());

    expect(response.status).toBe(500);
  });
});

describe('GET /api/admin/customers/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireUser as jest.Mock).mockResolvedValue(ADMIN);
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      ...RAW_CUSTOMER,
      orders: [
        {
          id: 'demo-order-001',
          orderNumber: 'DEMO-ORD-001',
          status: 'PAID',
          totalAmount: 500000,
          createdAt: new Date('2026-02-02T00:00:00.000Z'),
        },
      ],
    });
    (prisma.order.aggregate as jest.Mock).mockResolvedValue({
      _count: { _all: 1 },
      _sum: { totalAmount: 500000 },
    });
  });

  it('looks the customer up inside the caller store, so a foreign id is a 404', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
    const { request, context } = getRequest('someone-elses-id');

    const response = await getCustomer(request, context);

    expect(response.status).toBe(404);
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'someone-elses-id', storeId: 'store-1', role: 'CUSTOMER' },
      })
    );
  });

  it('returns the profile, lifetime totals and history', async () => {
    const { request, context } = getRequest();

    const response = await getCustomer(request, context);
    const body = await response.json();

    expect(body.customer).toEqual(
      expect.objectContaining({
        name: 'Michel Boyle',
        orderCount: 1,
        totalSpent: 500000,
        historyTruncated: false,
      })
    );
    expect(body.customer.orders).toHaveLength(1);
    expect(body.customer).not.toHaveProperty('passwordHash');
  });

  it('flags a truncated history when the aggregate exceeds the returned page', async () => {
    (prisma.order.aggregate as jest.Mock).mockResolvedValue({
      _count: { _all: 250 },
      _sum: { totalAmount: 9000000 },
    });
    const { request, context } = getRequest();

    const response = await getCustomer(request, context);
    const body = await response.json();

    expect(body.customer.historyTruncated).toBe(true);
  });

  it('forbids non-staff callers', async () => {
    (requireUser as jest.Mock).mockResolvedValue(null);
    const { request, context } = getRequest();

    const response = await getCustomer(request, context);

    expect(response.status).toBe(403);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });
});
