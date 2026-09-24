import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import {
  revalidateCategory,
  revalidateProduct,
  revalidateStoreSettings,
  storefrontPaths,
} from '@/lib/revalidate';

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

// The helpers log on the failure paths under test; keep the output quiet and
// assert on the log instead.
jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: { store: { findUnique: jest.fn() } },
}));

const STORE_ID = 'store-1';
const DOMAIN = 'tokosaya.example';

function purged(): string[] {
  return (revalidatePath as jest.Mock).mock.calls.map(([path]) => path);
}

describe('storefrontPaths', () => {
  it('builds the storefront URLs a mutation has to purge', () => {
    const paths = storefrontPaths(DOMAIN);

    expect(paths.root).toBe(`/${DOMAIN}`);
    expect(paths.products).toBe(`/${DOMAIN}/products`);
    expect(paths.sitemap).toBe(`/${DOMAIN}/sitemap.xml`);
    expect(paths.product('kopi-arabika')).toBe(`/${DOMAIN}/product/kopi-arabika`);
    expect(paths.category('minuman')).toBe(`/${DOMAIN}/category/minuman`);
  });
});

describe('revalidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.store.findUnique as jest.Mock).mockResolvedValue({ domain: DOMAIN });
  });

  it('purges the product page, the listing and the sitemap on a product change', async () => {
    await revalidateProduct(STORE_ID, 'kopi-arabika');

    expect(purged()).toEqual([
      `/${DOMAIN}/product/kopi-arabika`,
      `/${DOMAIN}/products`,
      `/${DOMAIN}/sitemap.xml`,
    ]);
  });

  it('also purges the old URL when a slug was renamed', async () => {
    await revalidateProduct(STORE_ID, 'kopi-arabika-baru', 'kopi-arabika');

    expect(purged()).toContain(`/${DOMAIN}/product/kopi-arabika`);
    expect(purged()).toContain(`/${DOMAIN}/product/kopi-arabika-baru`);
  });

  it('does not purge the same path twice when the slug is unchanged', async () => {
    await revalidateProduct(STORE_ID, 'kopi-arabika', 'kopi-arabika');

    expect(purged()).toEqual([
      `/${DOMAIN}/product/kopi-arabika`,
      `/${DOMAIN}/products`,
      `/${DOMAIN}/sitemap.xml`,
    ]);
  });

  it('purges the category page, the listing and the sitemap', async () => {
    await revalidateCategory(STORE_ID, 'minuman');

    expect(purged()).toEqual([
      `/${DOMAIN}/category/minuman`,
      `/${DOMAIN}/products`,
      `/${DOMAIN}/sitemap.xml`,
    ]);
  });

  it('purges the storefront shell when settings change', async () => {
    await revalidateStoreSettings(STORE_ID);

    expect(purged()).toEqual([`/${DOMAIN}`, `/${DOMAIN}/products`, `/${DOMAIN}/sitemap.xml`]);
  });

  it('does nothing when the store no longer exists', async () => {
    (prisma.store.findUnique as jest.Mock).mockResolvedValue(null);

    await revalidateProduct(STORE_ID, 'kopi-arabika');

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('swallows a failing purge so the committed write is never rolled back', async () => {
    (revalidatePath as jest.Mock).mockImplementation(() => {
      throw new Error('cache unavailable');
    });

    await expect(revalidateProduct(STORE_ID, 'kopi-arabika')).resolves.toBeUndefined();
  });

  it('swallows a database failure while resolving the domain', async () => {
    (prisma.store.findUnique as jest.Mock).mockRejectedValue(new Error('db down'));

    await expect(revalidateStoreSettings(STORE_ID)).resolves.toBeUndefined();
  });
});
