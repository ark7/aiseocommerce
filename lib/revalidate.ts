import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * Cache invalidation for the storefront surfaces that are cached by ISR or by a
 * CDN. Every metadata-changing mutation calls one of these so a product edit
 * shows up in the HTML and in sitemap.xml without a redeploy.
 *
 * Nothing here may throw: a failed cache purge must never roll back or fail the
 * write that already committed. Failures are logged and swallowed.
 */

export interface StorefrontPaths {
  root: string;
  products: string;
  sitemap: string;
  product: (slug: string) => string;
  category: (slug: string) => string;
}

/** Pure path builder — kept separate so it can be asserted without a database. */
export function storefrontPaths(domain: string): StorefrontPaths {
  return {
    root: `/${domain}`,
    products: `/${domain}/products`,
    sitemap: `/${domain}/sitemap.xml`,
    product: (slug: string) => `/${domain}/product/${slug}`,
    category: (slug: string) => `/${domain}/category/${slug}`,
  };
}

async function findDomain(storeId: string): Promise<string | null> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { domain: true },
  });
  return store?.domain ?? null;
}

async function purge(
  storeId: string,
  build: (paths: StorefrontPaths) => (string | undefined)[]
): Promise<void> {
  try {
    const domain = await findDomain(storeId);
    if (!domain) return;

    const paths = build(storefrontPaths(domain)).filter((path): path is string => Boolean(path));

    for (const path of paths) {
      revalidatePath(path);
    }

    logger.info('Storefront cache revalidated', { storeId, domain, paths });
  } catch (error) {
    logger.warn('Storefront cache revalidation failed', { storeId });
    logger.debug('Revalidation error detail', {
      storeId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * A product changed. Pass `previousSlug` when the slug was renamed, otherwise the
 * old URL keeps serving the page it was cached as.
 */
export async function revalidateProduct(
  storeId: string,
  slug: string,
  previousSlug?: string
): Promise<void> {
  await purge(storeId, (paths) => [
    paths.product(slug),
    previousSlug && previousSlug !== slug ? paths.product(previousSlug) : undefined,
    paths.products,
    paths.sitemap,
  ]);
}

/** Store-level settings changed (SEO defaults, analytics ids) — refresh the shell. */
export async function revalidateStoreSettings(storeId: string): Promise<void> {
  await purge(storeId, (paths) => [paths.root, paths.products, paths.sitemap]);
}

/** A category changed or was removed. */
export async function revalidateCategory(
  storeId: string,
  slug: string,
  previousSlug?: string
): Promise<void> {
  await purge(storeId, (paths) => [
    paths.category(slug),
    previousSlug && previousSlug !== slug ? paths.category(previousSlug) : undefined,
    paths.products,
    paths.sitemap,
  ]);
}
