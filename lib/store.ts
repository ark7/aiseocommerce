import { prisma } from '@/lib/prisma';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { isControlPlaneEnabled } from '@/lib/superAdminGuard';

const safeCache = typeof cache === 'function' ? cache : <T extends (...args: any[]) => any>(fn: T) => fn;

/**
 * Resolves the primary store for this standalone e-commerce deployment.
 * Supports override via:
 * 1. domainHint (direct argument)
 * 2. Host / x-forwarded-host header from incoming request
 * 3. active_store_domain or preview_store_domain cookie
 * 4. DEFAULT_STORE_DOMAIN or LANDING_STORE_DOMAIN environment variables
 * 5. Fallback to active registered store (prioritizing non-demo user stores)
 */
export const getActiveStore = safeCache(async (domainHint?: string) => {
  try {
    // 1. Check direct domain hint if valid
    if (domainHint && domainHint !== 'localhost' && domainHint !== '127.0.0.1') {
      const store = await prisma.store.findUnique({
        where: { domain: domainHint },
        include: { settings: true },
      });
      if (store) return store;
    }

    // 2. Check Host / x-forwarded-host header from incoming request
    try {
      const headerList = headers();
      const host = headerList.get('x-forwarded-host') || headerList.get('host');
      const rawDomain = host?.split(':')[0]?.trim().toLowerCase();
      if (rawDomain && rawDomain !== 'localhost' && rawDomain !== '127.0.0.1') {
        const storeByHost = await prisma.store.findUnique({
          where: { domain: rawDomain },
          include: { settings: true },
        });
        if (storeByHost) return storeByHost;
      }
    } catch {
      // headers() might not be available in non-request contexts or unit tests
    }

    // 3. Check active / preview store cookie
    try {
      const cookieStore = cookies();
      const cookieDomain =
        cookieStore.get('active_store_domain')?.value ||
        cookieStore.get('preview_store_domain')?.value;
      if (cookieDomain) {
        const store = await prisma.store.findUnique({
          where: { domain: cookieDomain },
          include: { settings: true },
        });
        if (store) return store;
      }
    } catch {
      // cookies() might not be available in non-request contexts or unit tests
    }

    // 4. Check explicit default domain from environment variables
    const defaultDomain = process.env.DEFAULT_STORE_DOMAIN || process.env.LANDING_STORE_DOMAIN;
    if (defaultDomain) {
      const store = await prisma.store.findUnique({
        where: { domain: defaultDomain },
        include: { settings: true },
      });
      if (store) return store;
    }

    // 5. In multi-tenant database without domain hint, prefer non-demo store
    const nonDemoStore = await prisma.store.findFirst({
      where: { domain: { not: 'demo-store.local' } },
      orderBy: { createdAt: 'desc' },
      include: { settings: true },
    });
    if (nonDemoStore) return nonDemoStore;

    // Default to first registered store in single-tenant deployment
    return await prisma.store.findFirst({
      orderBy: { createdAt: 'asc' },
      include: { settings: true },
    });
  } catch (error) {
    console.error('[getActiveStore] Primary query failed, attempting minimal store fallback:', error);
    try {
      const fallbackNonDemo = await prisma.store.findFirst({
        where: { domain: { not: 'demo-store.local' } },
        orderBy: { createdAt: 'desc' },
      });
      if (fallbackNonDemo) {
        return { ...fallbackNonDemo, settings: null };
      }

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
