import type { MetadataRoute } from 'next';

/**
 * ponytail: one root robots.txt, because storefronts are served by path segment
 * (/{storeDomain}/...) rather than by host rewrite. If host-based routing lands
 * later, move this to app/[storeDomain]/robots.txt/route.ts so each store can
 * advertise its own sitemap URL.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/login'],
    },
  };
}
