import { DELETE } from '@/app/api/products/route';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { revalidateProduct } from '@/lib/revalidate';

jest.mock('@/lib/prisma', () => ({
  prisma: { product: { findUnique: jest.fn(), delete: jest.fn() } },
}));

jest.mock('@/lib/auth', () => ({ verifyToken: jest.fn() }));

jest.mock('@/lib/revalidate', () => ({
  revalidateProduct: jest.fn().mockResolvedValue(undefined),
}));

const PRODUCT = {
  id: 'prod-1',
  storeId: 'store-1',
  slug: 'kopi-arabika',
  images: [],
};

function deleteRequest(id: string) {
  return new Request('http://localhost/api/products', {
    method: 'DELETE',
    headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
}

describe('DELETE /api/products', () => {
  beforeEach(() => jest.clearAllMocks());

  it('purges the storefront cache for the deleted product', async () => {
    (verifyToken as jest.Mock).mockResolvedValue({ id: 'user-1', storeId: 'store-1', role: 'ADMIN' });
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(PRODUCT);
    (prisma.product.delete as jest.Mock).mockResolvedValue(PRODUCT);

    const response = await DELETE(deleteRequest(PRODUCT.id));

    expect(response.status).toBe(200);
    expect(revalidateProduct).toHaveBeenCalledWith('store-1', 'kopi-arabika');
  });

  it('does not purge when the caller is not an admin', async () => {
    (verifyToken as jest.Mock).mockResolvedValue({
      id: 'user-1',
      storeId: 'store-1',
      role: 'CUSTOMER',
    });

    const response = await DELETE(deleteRequest(PRODUCT.id));

    expect(response.status).toBe(403);
    expect(prisma.product.delete).not.toHaveBeenCalled();
    expect(revalidateProduct).not.toHaveBeenCalled();
  });

  it("does not purge another store's product", async () => {
    (verifyToken as jest.Mock).mockResolvedValue({ id: 'user-1', storeId: 'store-1', role: 'ADMIN' });
    (prisma.product.findUnique as jest.Mock).mockResolvedValue({ ...PRODUCT, storeId: 'store-2' });

    const response = await DELETE(deleteRequest(PRODUCT.id));

    expect(response.status).toBe(403);
    expect(revalidateProduct).not.toHaveBeenCalled();
  });
});
