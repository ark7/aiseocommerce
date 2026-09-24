import { POST, PATCH, DELETE } from '@/app/api/products/route';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { auditProductUpdated, auditProductDeleted } from '@/services/auditService';
import { unlink } from 'fs/promises';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    productImage: { delete: jest.fn() },
  },
}));

jest.mock('@/lib/auth', () => ({ verifyToken: jest.fn() }));

jest.mock('@/lib/revalidate', () => ({
  revalidateProduct: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/services/auditService', () => ({
  auditProductCreated: jest.fn().mockResolvedValue(undefined),
  auditProductUpdated: jest.fn().mockResolvedValue(undefined),
  auditProductDeleted: jest.fn().mockResolvedValue(undefined),
}));

// The upload helpers would otherwise create ./public/uploads on every run.
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

const ADMIN = { id: 'user-1', storeId: 'store-1', email: 'a@b.c', role: 'ADMIN' };
const EXISTING = { id: 'product-1', storeId: 'store-1', slug: 'kopi', name: 'Kopi Gayo', images: [] };

function formRequest(fields: Record<string, string>, method: 'POST' | 'PATCH') {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => form.append(key, value));

  return new Request('http://localhost/api/products', {
    method,
    headers: { Authorization: 'Bearer token' },
    body: form,
  });
}

function patchedData() {
  return (prisma.product.update as jest.Mock).mock.calls[0][0].data;
}

describe('POST /api/products', () => {
  beforeEach(() => jest.clearAllMocks());

  it('coerces the strings FormData always sends into the numbers and booleans Prisma expects', async () => {
    (verifyToken as jest.Mock).mockResolvedValue(ADMIN);
    (prisma.product.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.product.create as jest.Mock).mockResolvedValue({ id: 'product-1', slug: 'kopi', images: [] });

    const response = await POST(
      formRequest(
        {
          name: 'Kopi Gayo',
          slug: 'kopi-gayo',
          basePrice: '15000',
          sellingPrice: '20000',
          stock: '5',
          isPublished: 'true',
        },
        'POST'
      )
    );

    expect(response.status).toBe(200);
    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          basePrice: 15000,
          sellingPrice: 20000,
          stock: 5,
          isPublished: true,
        }),
      })
    );
  });

  it('defaults an omitted stock to 0 rather than rejecting the request', async () => {
    (verifyToken as jest.Mock).mockResolvedValue(ADMIN);
    (prisma.product.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.product.create as jest.Mock).mockResolvedValue({ id: 'product-1', slug: 'kopi', images: [] });

    const response = await POST(
      formRequest({ name: 'Kopi', slug: 'kopi', basePrice: '1000', sellingPrice: '2000' }, 'POST')
    );

    expect(response.status).toBe(200);
    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ stock: 0, isPublished: true }) })
    );
  });
});

describe('PATCH /api/products', () => {
  beforeEach(() => jest.clearAllMocks());

  beforeEach(() => {
    (verifyToken as jest.Mock).mockResolvedValue(ADMIN);
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(EXISTING);
    (prisma.product.update as jest.Mock).mockResolvedValue({
      id: EXISTING.id,
      slug: EXISTING.slug,
      images: [],
    });
  });

  it('turns the publish toggle\'s "false" into a real false', async () => {
    const response = await PATCH(formRequest({ id: EXISTING.id, isPublished: 'false' }, 'PATCH'));

    expect(response.status).toBe(200);
    expect(patchedData().isPublished).toBe(false);
  });

  it('writes only the fields it was sent, so toggling publish cannot zero the stock', async () => {
    await PATCH(formRequest({ id: EXISTING.id, isPublished: 'false' }, 'PATCH'));

    expect(patchedData()).not.toHaveProperty('stock');
    expect(patchedData()).not.toHaveProperty('basePrice');
  });

  it('clears a nullable field on a blank value instead of silently changing nothing', async () => {
    await PATCH(formRequest({ id: EXISTING.id, description: '', categoryId: '' }, 'PATCH'));

    // null sets the column; undefined would mean "leave it alone", which is
    // what made clearing a field look like it worked and quietly do nothing.
    expect(patchedData().description).toBeNull();
    expect(patchedData().categoryId).toBeNull();
  });

  it('audits only the fields the request changed, with their previous values', async () => {
    await PATCH(formRequest({ id: EXISTING.id, name: 'Nama Baru' }, 'PATCH'));

    expect(auditProductUpdated).toHaveBeenCalledWith(
      EXISTING.id,
      ADMIN.id,
      ADMIN.storeId,
      { name: EXISTING.name },
      { name: 'Nama Baru' },
      expect.any(String)
    );
  });

  it('leaves a NOT NULL column alone on a blank value rather than sending null', async () => {
    await PATCH(formRequest({ id: EXISTING.id, stock: '' }, 'PATCH'));

    expect(patchedData().stock).toBeUndefined();
  });

  it('answers 400 with a usable message when the SKU is already taken', async () => {
    (prisma.product.update as jest.Mock).mockRejectedValue(
      Object.assign(new Error('Unique constraint failed'), { code: 'P2002', meta: { target: ['sku'] } })
    );

    const response = await PATCH(formRequest({ id: EXISTING.id, sku: 'SKU-OTHER' }, 'PATCH'));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'SKU already exists' });
  });

  it('answers 400 rather than 500 when the slug is already taken in this store', async () => {
    (prisma.product.update as jest.Mock).mockRejectedValue(
      Object.assign(new Error('Unique constraint failed'), {
        code: 'P2002',
        meta: { target: ['storeId', 'slug'] },
      })
    );

    const response = await PATCH(formRequest({ id: EXISTING.id, slug: 'kompor-gas' }, 'PATCH'));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Slug already exists' });
  });

  it('deletes the image row even when the file lives outside /uploads', async () => {
    const external = { id: 'img-external', url: 'https://cdn.example.com/a.jpg' };
    (prisma.product.findUnique as jest.Mock).mockResolvedValue({ ...EXISTING, images: [external] });

    const response = await PATCH(
      formRequest({ id: EXISTING.id, deleteImage_img_external: 'img-external' }, 'PATCH')
    );

    expect(response.status).toBe(200);
    expect(prisma.productImage.delete).toHaveBeenCalledWith({ where: { id: 'img-external' } });
  });

  it('rejects an unknown field with 400 and writes nothing', async () => {
    const response = await PATCH(formRequest({ id: EXISTING.id, isFeatured_x: 'true' }, 'PATCH'));

    expect(response.status).toBe(400);
    expect(prisma.product.update).not.toHaveBeenCalled();
  });

  it('refuses a product belonging to another store', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue({ ...EXISTING, storeId: 'store-2' });

    const response = await PATCH(formRequest({ id: EXISTING.id, isPublished: 'false' }, 'PATCH'));

    expect(response.status).toBe(403);
    expect(prisma.product.update).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/products', () => {
  const ROW = {
    ...EXISTING,
    sku: 'SKU-1',
    sellingPrice: 20000,
    stock: 3,
    isPublished: true,
    images: [{ id: 'img-1', url: '/uploads/a.jpg' }],
  };

  function deleteRequest(id: string) {
    return new Request('http://localhost/api/products', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer token' },
      body: JSON.stringify({ id }),
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    // One test replaces this implementation; the rest need the plain stub back.
    (auditProductDeleted as jest.Mock).mockResolvedValue(undefined);
    (verifyToken as jest.Mock).mockResolvedValue(ADMIN);
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(ROW);
    (prisma.product.delete as jest.Mock).mockResolvedValue(ROW);
  });

  it('audits the snapshot the admin can no longer look up afterwards', async () => {
    const response = await DELETE(deleteRequest(ROW.id));

    expect(response.status).toBe(200);
    expect(auditProductDeleted).toHaveBeenCalledWith(
      ROW.id,
      ADMIN.id,
      ADMIN.storeId,
      {
        name: ROW.name,
        slug: ROW.slug,
        sku: ROW.sku,
        sellingPrice: ROW.sellingPrice,
        stock: ROW.stock,
        isPublished: ROW.isPublished,
      },
      expect.any(String)
    );
  });

  it('deletes the row before auditing it, so a log failure cannot strand the product', async () => {
    const order: string[] = [];
    (prisma.product.delete as jest.Mock).mockImplementation(async () => {
      order.push('delete');
      return ROW;
    });
    (auditProductDeleted as jest.Mock).mockImplementation(async () => {
      order.push('audit');
    });

    await DELETE(deleteRequest(ROW.id));

    expect(order).toEqual(['delete', 'audit']);
  });

  it('refuses a product belonging to another store, and deletes nothing', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue({ ...ROW, storeId: 'store-2' });

    const response = await DELETE(deleteRequest(ROW.id));

    expect(response.status).toBe(403);
    expect(prisma.product.delete).not.toHaveBeenCalled();
    expect(auditProductDeleted).not.toHaveBeenCalled();
  });

  it('answers 404 for a product that is already gone', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await DELETE(deleteRequest('missing'));

    expect(response.status).toBe(404);
    expect(prisma.product.delete).not.toHaveBeenCalled();
  });

  it('removes the uploaded file alongside the row that pointed at it', async () => {
    await DELETE(deleteRequest(ROW.id));

    expect(unlink).toHaveBeenCalledWith(expect.stringContaining('a.jpg'));
  });

  it('leaves a file it does not own alone', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue({
      ...ROW,
      images: [{ id: 'img-2', url: 'https://cdn.example.com/b.jpg' }],
    });

    await DELETE(deleteRequest(ROW.id));

    expect(unlink).not.toHaveBeenCalled();
    expect(prisma.product.delete).toHaveBeenCalled();
  });
});
