import { prisma } from '@/lib/prisma';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { isControlPlaneEnabled } from '@/lib/superAdminGuard';

/**
 * Resolves the primary store for this standalone e-commerce deployment.
 * Supports override via:
 * 1. domainHint (direct argument)
 * 2. preview_store_domain cookie (useful for previewing any customer's store in Super-Admin localhost)
 * 3. DEFAULT_STORE_DOMAIN or LANDING_STORE_DOMAIN environment variables
 * 4. Fallback to the first registered store in the database
 */
export const getActiveStore = cache(async (domainHint?: string) => {
  try {
    if (domainHint && domainHint !== 'localhost' && domainHint !== '127.0.0.1') {
      const store = await prisma.store.findUnique({
        where: { domain: domainHint },
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
  } catch (error) {
    console.error('[getActiveStore] Primary query failed, attempting minimal store fallback:', error);
    try {
      const fallbackStore = await prisma.store.findFirst({
        orderBy: { createdAt: 'asc' },
      });
      if (fallbackStore) {
        return { ...fallbackStore, settings: null };
      }
    } catch (fallbackErr) {
      console.error('[getActiveStore] Minimal fallback failed:', fallbackErr);
    }
    return null;
  }
});
