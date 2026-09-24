import { GET } from '@/app/[storeDomain]/sitemap.xml/route';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    store: { findUnique: jest.fn() },
    product: { findMany: jest.fn() },
    category: { findMany: jest.fn() },
  },
}));

const STORE = { id: 'store-1', domain: 'tokosaya.example' };

function get(domain = STORE.domain) {
  return GET(new Request(`http://localhost/${domain}/sitemap.xml`), {
    params: { storeDomain: domain },
  });
}

describe('GET /[storeDomain]/sitemap.xml', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.store.findUnique as jest.Mock).mockResolvedValue(STORE);
    (prisma.product.findMany as jest.Mock).mockResolvedValue([
      { slug: 'kopi-arabika', updatedAt: new Date('2026-01-02T03:04:05.000Z') },
    ]);
    (prisma.category.findMany as jest.Mock).mockResolvedValue([
      { slug: 'minuman', updatedAt: new Date('2026-01-01T00:00:00.000Z') },
    ]);
  });

  it('returns 404 for an unknown store domain', async () => {
    (prisma.store.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await get('nope.example');

    expect(response.status).toBe(404);
    expect(prisma.product.findMany).not.toHaveBeenCalled();
  });

  it('lists the storefront, listing, category and product URLs', async () => {
    const body = await (await get()).text();

    expect(body).toContain('<loc>https://tokosaya.example/</loc>');
    expect(body).toContain('<loc>https://tokosaya.example/products</loc>');
    expect(body).toContain('<loc>https://tokosaya.example/category/minuman</loc>');
    expect(body).toContain('<loc>https://tokosaya.example/product/kopi-arabika</loc>');
  });

  it('emits ISO-8601 lastmod dates', async () => {
    const body = await (await get()).text();

    expect(body).toContain('<lastmod>2026-01-02T03:04:05.000Z</lastmod>');
  });

  it('escapes XML metacharacters so a crafted slug cannot break the document', async () => {
    (prisma.product.findMany as jest.Mock).mockResolvedValue([
      { slug: 'kopi&teh<script>', updatedAt: new Date('2026-01-02T03:04:05.000Z') },
    ]);

    const body = await (await get()).text();

    expect(body).toContain('kopi&amp;teh&lt;script&gt;');
    expect(body).not.toContain('<script>');
  });

  it('only advertises published products of the requested store', async () => {
    await get();

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { storeId: STORE.id, isPublished: true } })
    );
    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { storeId: STORE.id } })
    );
  });

  it('serves XML, not HTML', async () => {
    const response = await get();

    expect(response.headers.get('Content-Type')).toContain('application/xml');
  });

  it('returns 500 and logs the failure instead of throwing when the database fails', async () => {
    (prisma.product.findMany as jest.Mock).mockRejectedValue(new Error('db down'));

    const response = await get();

    expect(response.status).toBe(500);
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to build sitemap',
      { storeDomain: STORE.domain },
      expect.any(Error)
    );
  });
});
