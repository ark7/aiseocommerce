import { GET } from '@/app/api/orders/route';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    order: { findMany: jest.fn(), count: jest.fn() },
  },
}));

jest.mock('@/lib/auth', () => ({ requireUser: jest.fn() }));

const ADMIN = { id: 'user-1', storeId: 'store-1', role: 'ADMIN' };

function request(query = '') {
  return new Request(`http://localhost/api/orders${query}`, {
    headers: { Authorization: 'Bearer token' },
  });
}

async function list(query = '') {
  const response = await GET(request(query));
  return response.json();
}

describe('GET /api/orders pagination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireUser as jest.Mock).mockResolvedValue(ADMIN);
    (prisma.order.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.order.count as jest.Mock).mockResolvedValue(0);
  });

  it('defaults to page 1 and asks for no rows before it', async () => {
    await list();

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 50 })
    );
  });

  it('skips the pages already seen', async () => {
    await list('?page=3&limit=25');

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 50, take: 25 })
    );
    expect((await list('?page=3&limit=25')).pagination).toEqual({
      page: 3,
      limit: 25,
      total: 0,
      totalPages: 1,
    });
  });

  it('reports total pages from the filtered count, and never zero', async () => {
    (prisma.order.count as jest.Mock).mockResolvedValue(51);

    const body = await list('?limit=25&status=PAID');

    expect(prisma.order.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ storeId: ADMIN.storeId, status: 'PAID' }),
      })
    );
    expect(body.pagination).toEqual({ page: 1, limit: 25, total: 51, totalPages: 3 });
  });

  it('clamps limit to 100 and ignores a negative page', async () => {
    await list('?limit=5000&page=-2');

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 100 })
    );
  });

  it('scopes a customer to their own orders', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ ...ADMIN, id: 'cust-1', role: 'CUSTOMER' });

    await list();

    const where = (prisma.order.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where).toEqual({ storeId: ADMIN.storeId, userId: 'cust-1' });
  });
});
