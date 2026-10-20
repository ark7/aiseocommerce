import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const store = await prisma.store.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (!store) return [];

    const baseUrl = `https://${store.domain}`;

    // 1. Static Pages
    const staticPages: MetadataRoute.Sitemap = [
      { url: baseUrl, changeFrequency: 'daily' as const, priority: 1 },
      { url: `${baseUrl}/products`, changeFrequency: 'daily' as const, priority: 0.8 },
      { url: `${baseUrl}/terms`, changeFrequency: 'monthly' as const, priority: 0.3 },
      { url: `${baseUrl}/privacy`, changeFrequency: 'monthly' as const, priority: 0.3 },
    ];

    // 2. Dynamic Products
    const products = await prisma.product.findMany({
      where: { storeId: store.id, isPublished: true },
      select: { slug: true, updatedAt: true },
    });

    const productUrls: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${baseUrl}/product/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    // 3. Dynamic Categories
    const categories = await prisma.category.findMany({
      where: { storeId: store.id, parentId: null },
      select: { slug: true, updatedAt: true },
    });

    const categoryUrls: MetadataRoute.Sitemap = categories.map((c) => ({
      url: `${baseUrl}/category/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

    // 4. Dynamic Articles (CMS)
    const articles = await prisma.article.findMany({
      where: { storeId: store.id },
      select: { slug: true, updatedAt: true },
    });

    const articleUrls: MetadataRoute.Sitemap = articles.map((a) => ({
      url: `${baseUrl}/articles/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }));

    // 5. Dynamic Commercial Landing Pages (CMS)
    const landingPages = await prisma.landingPage.findMany({
      where: { storeId: store.id, isPublished: true },
      select: { slug: true, updatedAt: true },
    });

    const landingPageUrls: MetadataRoute.Sitemap = landingPages.map((lp) => ({
      url: `${baseUrl}/lp/${lp.slug}`,
      lastModified: lp.updatedAt,
      changeFrequency: 'daily' as const,
      priority: 0.9,
    }));

    return [...staticPages, ...landingPageUrls, ...productUrls, ...categoryUrls, ...articleUrls];
  } catch {
    return [];
  }
}
