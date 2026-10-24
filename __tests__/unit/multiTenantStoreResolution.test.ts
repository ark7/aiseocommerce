/**
 * @jest-environment jsdom
 */

import { getActiveStore } from '@/lib/store';
import { getCart, addToCart } from '@/lib/cart';
import { prisma } from '@/lib/prisma';
import { headers, cookies } from 'next/headers';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    store: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('next/headers', () => ({
  headers: jest.fn(),
  cookies: jest.fn(),
}));

describe('Multi-Tenant Store Resolution & Isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.DEFAULT_STORE_DOMAIN;
    delete process.env.LANDING_STORE_DOMAIN;
  });

  describe('getActiveStore()', () => {
    const TOKODEMOKU = {
      id: 'store-real-1',
      name: 'tokodemoku',
      domain: 'tokodemoyuhu.com',
      createdAt: new Date('2026-10-21'),
    };

    const DEMO_STORE = {
      id: 'demo-store-001',
      name: 'AI SEO Demo Store',
      domain: 'demo-store.local',
      createdAt: new Date('2026-10-10'),
    };

    it('resolves store via direct valid domainHint', async () => {
      (prisma.store.findUnique as jest.Mock).mockResolvedValue(TOKODEMOKU);

      const store = await getActiveStore('tokodemoyuhu.com');
      expect(store).toEqual(TOKODEMOKU);
      expect(prisma.store.findUnique).toHaveBeenCalledWith({
        where: { domain: 'tokodemoyuhu.com' },
        include: { settings: true },
      });
    });

    it('resolves store via incoming Host header when domainHint is omitted or localhost', async () => {
      (headers as jest.Mock).mockReturnValue(
        new Map([['host', 'tokodemoyuhu.com:3000']])
      );
      (prisma.store.findUnique as jest.Mock).mockResolvedValue(TOKODEMOKU);

      const store = await getActiveStore('localhost');
      expect(store).toEqual(TOKODEMOKU);
      expect(prisma.store.findUnique).toHaveBeenCalledWith({
        where: { domain: 'tokodemoyuhu.com' },
        include: { settings: true },
      });
    });

    it('resolves store via active_store_domain cookie', async () => {
      (headers as jest.Mock).mockReturnValue(new Map([['host', 'localhost:3000']]));
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn((name) => (name === 'active_store_domain' ? { value: 'tokodemoyuhu.com' } : undefined)),
      });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue(TOKODEMOKU);

      const store = await getActiveStore();
      expect(store).toEqual(TOKODEMOKU);
      expect(prisma.store.findUnique).toHaveBeenCalledWith({
        where: { domain: 'tokodemoyuhu.com' },
        include: { settings: true },
      });
    });

    it('resolves store via DEFAULT_STORE_DOMAIN environment variable', async () => {
      process.env.DEFAULT_STORE_DOMAIN = 'tokodemoyuhu.com';
      (headers as jest.Mock).mockReturnValue(new Map());
      (cookies as jest.Mock).mockReturnValue({ get: jest.fn().mockReturnValue(undefined) });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue(TOKODEMOKU);

      const store = await getActiveStore();
      expect(store).toEqual(TOKODEMOKU);
      expect(prisma.store.findUnique).toHaveBeenCalledWith({
        where: { domain: 'tokodemoyuhu.com' },
        include: { settings: true },
      });
    });

    it('prioritizes real non-demo store over dummy demo-store.local in fallback', async () => {
      (headers as jest.Mock).mockReturnValue(new Map());
      (cookies as jest.Mock).mockReturnValue({ get: jest.fn().mockReturnValue(undefined) });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.store.findFirst as jest.Mock).mockImplementation(({ where }) => {
        if (where?.domain?.not === 'demo-store.local') {
          return Promise.resolve(TOKODEMOKU);
        }
        return Promise.resolve(DEMO_STORE);
      });

      const store = await getActiveStore();
      expect(store).toEqual(TOKODEMOKU);
      expect(prisma.store.findFirst).toHaveBeenCalledWith({
        where: { domain: { not: 'demo-store.local' } },
        orderBy: { createdAt: 'desc' },
        include: { settings: true },
      });
    });
  });

  describe('Cart Tenant Isolation (lib/cart.ts)', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('prevents cross-tenant product leakage in getCart', () => {
      // Seed item belonging to demo store
      addToCart('demo-store.local', {
        productId: 'demo-prod-008',
        name: 'Kacamata Hitam',
        price: 500000,
        quantity: 1,
        storeDomain: 'demo-store.local',
      });

      // Cart for tokodemoyuhu.com should be completely empty and not leak Kacamata Hitam
      const tokokuCart = getCart('tokodemoyuhu.com');
      expect(tokokuCart).toHaveLength(0);

      // Cart for demo-store.local contains only its own item
      const demoCart = getCart('demo-store.local');
      expect(demoCart).toHaveLength(1);
      expect(demoCart[0].productId).toBe('demo-prod-008');
    });
  });
});
