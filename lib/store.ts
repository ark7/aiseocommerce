import { prisma } from '@/lib/prisma';
import { cache } from 'react';

/**
 * Resolves the primary store for this standalone e-commerce deployment.
 * Supports override via DEFAULT_STORE_DOMAIN or LANDING_STORE_DOMAIN environment variables.
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

