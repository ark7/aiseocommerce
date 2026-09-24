import { DELETE, PATCH, POST } from '@/app/api/categories/route';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { revalidateCategory } from '@/lib/revalidate';
import { auditCategoryUpdated, auditCategoryCreated } from '@/services/auditService';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    category: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
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

jest.mock('@/services/auditService', () => ({
  auditCategoryCreated: jest.fn().mockResolvedValue(undefined),
  auditCategoryUpdated: jest.fn().mockResolvedValue(undefined),
  auditCategoryDeleted: jest.fn().mockResolvedValue(undefined),
}));

const ADMIN = { id: 'user-1', storeId: 'store-1', role: 'ADMIN' };
const CATEGORY = { id: 'cat-1', storeId: 'store-1', slug: 'minuman', name: 'Minuman' };

function request(method: 'POST' | 'PATCH' | 'DELETE', body: unknown) {
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

  it('audits the rename with the value it replaced, not a full record dump', async () => {
    (prisma.category.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.category.update as jest.Mock).mockResolvedValue({
      ...CATEGORY,
      slug: 'minuman-dingin',
    });

    await PATCH(request('PATCH', { id: CATEGORY.id, slug: 'minuman-dingin' }));

    expect(auditCategoryUpdated).toHaveBeenCalledWith(
      CATEGORY.id,
      ADMIN.id,
      ADMIN.storeId,
      { slug: 'minuman' },
      { slug: 'minuman-dingin' },
      expect.any(String)
    );
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

describe('POST /api/categories', () => {
  const CREATED = { ...CATEGORY, description: null, parentId: null };

  beforeEach(() => {
    jest.clearAllMocks();
    (auditCategoryCreated as jest.Mock).mockResolvedValue(undefined);
    (verifyToken as jest.Mock).mockResolvedValue(ADMIN);
    (prisma.category.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.category.create as jest.Mock).mockResolvedValue(CREATED);
  });

  it('creates the category under the store of the token, never the request body', async () => {
    await POST(request('POST', { name: 'Minuman', slug: 'minuman', storeId: 'store-2' }));

    expect(prisma.category.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ storeId: ADMIN.storeId, name: 'Minuman', slug: 'minuman' }),
    });
  });

  it('audits the created row, so a category cannot appear with no trace of who made it', async () => {
    const response = await POST(request('POST', { name: 'Minuman', slug: 'minuman' }));

    expect(response.status).toBe(200);
    expect(auditCategoryCreated).toHaveBeenCalledWith(
      CREATED.id,
      ADMIN.id,
      ADMIN.storeId,
      {
        name: CREATED.name,
        slug: CREATED.slug,
        description: CREATED.description,
        parentId: CREATED.parentId,
      },
      expect.any(String)
    );
  });

  it('writes the row before auditing it, so a log failure cannot strand a category', async () => {
    const order: string[] = [];
    (prisma.category.create as jest.Mock).mockImplementation(async () => {
      order.push('create');
      return CREATED;
    });
    (auditCategoryCreated as jest.Mock).mockImplementation(async () => {
      order.push('audit');
    });

    await POST(request('POST', { name: 'Minuman', slug: 'minuman' }));

    expect(order).toEqual(['create', 'audit']);
  });

  it('refuses a duplicate slug with 400 instead of a constraint error', async () => {
    (prisma.category.findFirst as jest.Mock).mockResolvedValue(CATEGORY);

    const response = await POST(request('POST', { name: 'Minuman', slug: 'minuman' }));

    expect(response.status).toBe(400);
    expect(prisma.category.create).not.toHaveBeenCalled();
    expect(auditCategoryCreated).not.toHaveBeenCalled();
  });

  it('refuses a parent category owned by another store', async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue({ ...CATEGORY, storeId: 'store-2' });

    const response = await POST(request('POST', { name: 'Minuman', slug: 'minuman', parentId: CATEGORY.id }));

    expect(response.status).toBe(403);
    expect(prisma.category.create).not.toHaveBeenCalled();
  });
});
