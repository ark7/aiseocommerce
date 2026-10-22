import { prisma } from '@/lib/prisma';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { isControlPlaneEnabled } from '@/lib/superAdminGuard';

/**
 * Resolves the primary store for this standalone e-commerce deployment.
 * Supports override via:
 * 1. domainHint (direct argument)
 * 2. Incoming request host header (x-forwarded-host or host)
 * 3. preview_store_domain cookie (useful for previewing any customer's store in Super-Admin localhost)
 * 4. DEFAULT_STORE_DOMAIN or LANDING_STORE_DOMAIN environment variables
 * 5. Fallback to the first registered store in the database
 */
export const getActiveStore = cache(async (domainHint?: string) => {
  try {
    let resolvedDomain = domainHint;

    // Automatically resolve domain from incoming HTTP request headers if not explicitly hinted
    if (!resolvedDomain) {
      try {
        const headerList = headers();
        const rawHost = headerList.get('x-forwarded-host') || headerList.get('host');
        if (rawHost) {
          resolvedDomain = rawHost.split(':')[0].toLowerCase();
        }
      } catch {
        // headers() is unavailable outside request scope or during static generation
      }
    }

    if (resolvedDomain && resolvedDomain !== 'localhost' && resolvedDomain !== '127.0.0.1') {
      const store = await prisma.store.findUnique({
        where: { domain: resolvedDomain },
        include: { settings: true },
      });
      if (store) return store;
    }

    // Check preview cookie (only allowed when Super-Admin Control Plane is enabled in dev/localhost)
    if (isControlPlaneEnabled()) {
      try {
        const cookieStore = cookies();
        const previewDomain = cookieStore.get('preview_store_domain')?.value;
        if (previewDomain) {
          const store = await prisma.store.findUnique({
            where: { domain: previewDomain },
            include: { settings: true },
          });
          if (store) return store;
        }
      } catch {
        // cookies() might not be available in non-request contexts or unit tests
      }
    }

    const defaultDomain = process.env.DEFAULT_STORE_DOMAIN || process.env.LANDING_STORE_DOMAIN;
    if (defaultDomain) {
      const store = await prisma.store.findUnique({
        where: { domain: defaultDomain },
        include: { settings: true },
      });
      if (store) return store;
    }

    // Default to first registered store in single-tenant deployment
    return await prisma.store.findFirst({
      orderBy: { createdAt: 'asc' },
      include: { settings: true },
    });
  } catch {
    return null;
  }
});
