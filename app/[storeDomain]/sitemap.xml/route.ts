import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * ponytail: a CDN copy heals in 5 minutes; the app-side cache is purged
 * immediately by lib/revalidate.ts on every metadata mutation. If instant
 * publication is ever required, wrap the reads in unstable_cache and switch to
 * revalidateTag.
 */
const REVALIDATE_SECONDS = 300;

/** Escape the five XML metacharacters before dropping a value into the sitemap. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(loc: string, lastmod?: Date, priority = '0.7'): string {
  return [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod.toISOString()}</lastmod>` : null,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Per-store sitemap, served at https://<storeDomain>/sitemap.xml.
 *
 * Static pages alone are not enough to be crawlable: search engines and AI
 * answer engines need one document listing every published product URL.
 * Regenerated hourly, so a new listing appears without a redeploy.
 */
export async function GET(_request: Request, { params }: { params: { storeDomain: string } }) {
  try {
    const store = await prisma.store.findUnique({
      where: { domain: params.storeDomain },
      select: { id: true, domain: true },
    });

    if (!store) return new Response('Not found', { status: 404 });

    const [products, categories] = await Promise.all([
      prisma.product.findMany({
        where: { storeId: store.id, isPublished: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 5000,
      }),
      prisma.category.findMany({
        where: { storeId: store.id },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    const base = `https://${store.domain}`;
    const entries = [
      urlEntry(`${base}/`, undefined, '1.0'),
      urlEntry(`${base}/products`, undefined, '0.9'),
      ...categories.map((category) =>
        urlEntry(`${base}/category/${category.slug}`, category.updatedAt)
      ),
      ...products.map((product) =>
        urlEntry(`${base}/product/${product.slug}`, product.updatedAt, '0.8')
      ),
    ];

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...entries,
      '</urlset>',
    ].join('\n');

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': `public, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=3600`,
      },
    });
  } catch (error) {
    logger.error(
      'Failed to build sitemap',
      { storeDomain: params.storeDomain },
      error instanceof Error ? error : String(error)
    );
    return new Response('Failed to build sitemap', { status: 500 });
  }
}
