import { GET } from '@/app/api/products/[id]/route';
import { prisma } from '@/lib/prisma';
import { requireStoreRole } from '@/lib/auth';

jest.mock('@/lib/prisma', () => ({
  prisma: { product: { findUnique: jest.fn() } },
}));

jest.mock('@/lib/auth', () => ({ requireStoreRole: jest.fn() }));

const PRODUCT = {
  id: 'product-1',
  storeId: 'store-1',
  slug: 'kopi',
  name: 'Kopi',
  images: [],
  category: null,
};
const ADMIN = { id: 'user-1', storeId: 'store-1', email: 'a@b.c', role: 'ADMIN' };

function getRequest(id = PRODUCT.id) {
  return {
    request: new Request(`http://localhost/api/products/${id}`, {
      headers: { Authorization: 'Bearer token' },
    }),
    context: { params: { id } },
  };
}

describe('GET /api/products/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when the product does not exist', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);
    const { request, context } = getRequest();

    const response = await GET(request, context);

    expect(response.status).toBe(404);
    expect(requireStoreRole).not.toHaveBeenCalled();
  });

  it('returns 403 when the caller has no role in the store that owns it', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(PRODUCT);
    (requireStoreRole as jest.Mock).mockResolvedValue(null);
    const { request, context } = getRequest();

    const response = await GET(request, context);

    expect(response.status).toBe(403);
  });

  it('authorises against the store on the row, never the request', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(PRODUCT);
    (requireStoreRole as jest.Mock).mockResolvedValue(ADMIN);
    const { request, context } = getRequest();

    const response = await GET(request, context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, product: PRODUCT });
    expect(requireStoreRole).toHaveBeenCalledWith(request, PRODUCT.storeId, ['ADMIN']);
  });
});
