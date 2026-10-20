import sitemap from '@/app/sitemap';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    store: { findFirst: jest.fn() },
    product: { findMany: jest.fn() },
    category: { findMany: jest.fn() },
    article: { findMany: jest.fn() },
    landingPage: { findMany: jest.fn() },
  },
}));

const STORE = { id: 'store-1', domain: 'tokosaya.example' };

describe('app/sitemap.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.store.findFirst as jest.Mock).mockResolvedValue(STORE);
    (prisma.product.findMany as jest.Mock).mockResolvedValue([
      { slug: 'kopi-arabika', updatedAt: new Date('2026-01-02T03:04:05.000Z') },
    ]);
    (prisma.category.findMany as jest.Mock).mockResolvedValue([
      { slug: 'minuman', updatedAt: new Date('2026-01-01T00:00:00.000Z') },
    ]);
    (prisma.article.findMany as jest.Mock).mockResolvedValue([
      { slug: 'manfaat-kopi', updatedAt: new Date('2026-01-03T00:00:00.000Z') },
    ]);
    (prisma.landingPage.findMany as jest.Mock).mockResolvedValue([
      { slug: 'promo-ramadhan', updatedAt: new Date('2026-01-04T00:00:00.000Z') },
    ]);
  });

  it('returns empty array when no store is found', async () => {
    (prisma.store.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await sitemap();
    expect(result).toEqual([]);
    expect(prisma.product.findMany).not.toHaveBeenCalled();
    expect(prisma.landingPage.findMany).not.toHaveBeenCalled();
  });

  it('generates URLs for homepage, products, categories, articles, and commercial landing pages', async () => {
    const result = await sitemap();

    const urls = result.map((item) => item.url);
    expect(urls).toContain('https://tokosaya.example');
    expect(urls).toContain('https://tokosaya.example/products');
    expect(urls).toContain('https://tokosaya.example/product/kopi-arabika');
    expect(urls).toContain('https://tokosaya.example/category/minuman');
    expect(urls).toContain('https://tokosaya.example/articles/manfaat-kopi');
    expect(urls).toContain('https://tokosaya.example/lp/promo-ramadhan');

    const lpEntry = result.find((item) => item.url === 'https://tokosaya.example/lp/promo-ramadhan');
    expect(lpEntry?.priority).toBe(0.9);
    expect(lpEntry?.changeFrequency).toBe('daily');
  });

  it('filters published products and landing pages only', async () => {
    await sitemap();

    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: { storeId: STORE.id, isPublished: true },
      select: { slug: true, updatedAt: true },
    });

    expect(prisma.landingPage.findMany).toHaveBeenCalledWith({
      where: { storeId: STORE.id, isPublished: true },
      select: { slug: true, updatedAt: true },
    });
  });

  it('returns empty array on unexpected database error', async () => {
    (prisma.store.findFirst as jest.Mock).mockRejectedValue(new Error('db crash'));

    const result = await sitemap();
    expect(result).toEqual([]);
  });
});

