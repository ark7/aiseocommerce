import { DELETE, PATCH } from '@/app/api/categories/route';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { revalidateCategory } from '@/lib/revalidate';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    category: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    // The delete guard counts products pointing at the category first.
    product: { count: jest.fn() },
  },
}));

jest.mock('@/lib/auth', () => ({ verifyToken: jest.fn() }));

jest.mock('@/lib/revalidate', () => ({
  revalidateCategory: jest.fn().mockResolvedValue(undefined),
}));

const ADMIN = { id: 'user-1', storeId: 'store-1', role: 'ADMIN' };
const CATEGORY = { id: 'cat-1', storeId: 'store-1', slug: 'minuman', name: 'Minuman' };

function request(method: 'PATCH' | 'DELETE', body: unknown) {
  return new Request('http://localhost/api/categories', {
    method,
    headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('category mutations keep the storefront cache honest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyToken as jest.Mock).mockResolvedValue(ADMIN);
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(CATEGORY);
  });

  it('purges the old and the new URL when a category slug is renamed', async () => {
    (prisma.category.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.category.update as jest.Mock).mockResolvedValue({
      ...CATEGORY,
      slug: 'minuman-dingin',
    });

    const response = await PATCH(request('PATCH', { id: CATEGORY.id, slug: 'minuman-dingin' }));

    expect(response.status).toBe(200);
    expect(revalidateCategory).toHaveBeenCalledWith('store-1', 'minuman-dingin', 'minuman');
  });

  it('purges the category page when it is deleted', async () => {
    (prisma.product.count as jest.Mock).mockResolvedValue(0);
    (prisma.category.count as jest.Mock).mockResolvedValue(0);
    (prisma.category.delete as jest.Mock).mockResolvedValue(CATEGORY);

    const response = await DELETE(request('DELETE', { id: CATEGORY.id }));

    expect(response.status).toBe(200);
    expect(revalidateCategory).toHaveBeenCalledWith('store-1', 'minuman');
  });

  it('does not purge when the delete is refused for still holding products', async () => {
    (prisma.product.count as jest.Mock).mockResolvedValue(3);

    const response = await DELETE(request('DELETE', { id: CATEGORY.id }));

    expect(response.status).toBe(400);
    expect(prisma.category.delete).not.toHaveBeenCalled();
    expect(revalidateCategory).not.toHaveBeenCalled();
  });

  it("does not purge another store's category", async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue({ ...CATEGORY, storeId: 'store-2' });

    const response = await DELETE(request('DELETE', { id: CATEGORY.id }));

    expect(response.status).toBe(403);
    expect(revalidateCategory).not.toHaveBeenCalled();
  });
});
