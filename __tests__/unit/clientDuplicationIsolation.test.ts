import fs from 'fs';
import path from 'path';
import { isDemoModeEnabled, shouldShowDemoQuickLogin } from '@/lib/demoGuard';
import { provisionTenantStore } from '@/lib/tenantProvisioner';

jest.mock('@/lib/prisma', () => ({ prisma: {} }));

describe('Client Duplication Isolation & Demo Quick-Login Guard', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.ENABLE_DEMO_MODE;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('shouldShowDemoQuickLogin & isDemoModeEnabled', () => {
    it('returns false unconditionally when ENABLE_DEMO_MODE="false", even for demo-store-001', () => {
      process.env.ENABLE_DEMO_MODE = 'false';
      expect(isDemoModeEnabled()).toBe(false);
      expect(
        shouldShowDemoQuickLogin({
          id: 'demo-store-001',
          domain: 'demo.larisdari.web.id',
          isDemo: true,
        })
      ).toBe(false);
    });

    it('returns false for client stores and null/fallback stores', () => {
      expect(shouldShowDemoQuickLogin(null)).toBe(false);
      expect(shouldShowDemoQuickLogin(undefined)).toBe(false);
      expect(
        shouldShowDemoQuickLogin({
          id: 'store-klien-123',
          domain: 'tokoklien.com',
          isDemo: false,
        })
      ).toBe(false);
    });

    it('returns true only on demo server when ENABLE_DEMO_MODE is enabled and store is demo', () => {
      process.env.ENABLE_DEMO_MODE = 'true';
      expect(
        shouldShowDemoQuickLogin({
          id: 'demo-store-001',
          domain: 'demo.larisdari.web.id',
          isDemo: true,
        })
      ).toBe(true);
    });
  });

  describe('Static Auth & Deployment Config Guards', () => {
    const root = process.cwd();

    it('does not hardcode DEFAULT_STORE_DOMAIN=demo.larisdari.web.id in docker-compose.yml', () => {
      const compose = fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8');
      expect(compose).not.toMatch(/^\s*-\s*DEFAULT_STORE_DOMAIN=demo\.larisdari\.web\.id\s*$/m);
      expect(compose).toContain('DEFAULT_STORE_DOMAIN=${DEFAULT_STORE_DOMAIN:-demo.larisdari.web.id}');
    });

    it('keeps auth pages free of demo-store-001 fallback and gates ?store= override behind isControlPlaneEnabled()', () => {
      for (const relPath of ['app/login/page.tsx', 'app/register/page.tsx', 'app/forgot-password/page.tsx']) {
        const content = fs.readFileSync(path.join(root, relPath), 'utf8');
        expect(content).not.toContain('demo-store-001');
        expect(content).not.toContain('LarisDari Demo Store');
        expect(content).toContain('isControlPlaneEnabled()');
      }

      const loginPage = fs.readFileSync(path.join(root, 'app/login/page.tsx'), 'utf8');
      expect(loginPage).toContain('shouldShowDemoQuickLogin(store)');
    });

    it('gates preview_store_domain cookie lookup in lib/store.ts behind isControlPlaneEnabled()', () => {
      const storeContent = fs.readFileSync(path.join(root, 'lib/store.ts'), 'utf8');
      expect(storeContent).toMatch(/isControlPlaneEnabled\(\)[\s\S]*preview_store_domain/);
    });
  });

  describe('provisionTenantStore CLEAN Preset Seeding & Env Generation', () => {
    it('marks store non-demo, seeds 8 ledger categories (incl. Setoran PPN), 1 SEO article, 1 inactive voucher, and zero @demo-store.local accounts', async () => {
      const mockPrisma: any = {
        store: {
          upsert: jest.fn().mockResolvedValue({
            id: 'store-clean-1',
            name: 'Kopi Nusantara',
            domain: 'kopinusantara.id',
            email: 'halo@kopinusantara.id',
            phone: '08123456789',
            isDemo: false,
          }),
        },
        storeSettings: { upsert: jest.fn().mockResolvedValue({ id: 'set-1' }) },
        user: { upsert: jest.fn().mockResolvedValue({ id: 'u-admin-1', email: 'owner@kopinusantara.id', role: 'ADMIN' }) },
        ledgerCategory: { upsert: jest.fn().mockResolvedValue({ id: 'lc-1' }) },
        article: {
          upsert: jest.fn().mockResolvedValue({
            id: 'art-1',
            slug: 'panduan-belanja-resmi-kopi-nusantara',
          }),
        },
        voucher: {
          upsert: jest.fn().mockResolvedValue({
            id: 'vouch-1',
            code: 'WELCOME10',
            isActive: false,
          }),
        },
      };

      const result = await provisionTenantStore(
        {
          storeName: 'Kopi Nusantara',
          tenantSlug: 'kopi-nusantara',
          domain: 'kopinusantara.id',
          storeEmail: 'halo@kopinusantara.id',
          storePhone: '08123456789',
          adminName: 'Andi Wijaya',
          adminEmail: 'owner@kopinusantara.id',
          adminPassword: 'PasswordKuat#2026',
          seedPreset: 'CLEAN',
        },
        mockPrisma
      );

      expect(result.seededCounts).toEqual({
        ledgerCategories: 8,
        categories: 0,
        products: 0,
        articles: 1,
        vouchers: 1,
      });

      const userEmails = mockPrisma.user.upsert.mock.calls.map((c: any[]) => c[0].create.email);
      expect(userEmails).toEqual(['owner@kopinusantara.id']);
      expect(userEmails.some((e: string) => e.endsWith('@demo-store.local'))).toBe(false);

      const ledgerNames = mockPrisma.ledgerCategory.upsert.mock.calls.map((c: any[]) => c[0].create.name);
      expect(ledgerNames).toContain('Setoran PPN');

      expect(mockPrisma.article.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            slug: 'panduan-belanja-resmi-kopi-nusantara',
            isFeatured: true,
          }),
        })
      );

      expect(mockPrisma.voucher.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            code: 'WELCOME10',
            isActive: false,
          }),
        })
      );

      expect(result.deployment.envContent).toContain('ENABLE_DEMO_MODE="false"');
      expect(result.deployment.envContent).toContain('ENABLE_SUPER_ADMIN_CONTROL_PLANE="false"');
      expect(result.deployment.envContent).toContain('TURNSTILE_HOSTNAMES="kopinusantara.id"');
    });
  });
});
