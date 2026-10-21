import jwt from 'jsonwebtoken';
import {
  verifyOwnerCredentials,
  generateSuperAdminToken,
  verifySuperAdminToken,
  requireSuperAdminOwner,
} from '@/lib/superAdminAuth';
import {
  TenantDuplicationInputSchema,
  provisionTenantStore,
  generateTenantEnvConfig,
} from '@/lib/tenantProvisioner';
import { GET as listTenants, POST as createTenant } from '@/app/api/super-admin/tenants/route';
import { GET as getTenant, PUT as updateTenant } from '@/app/api/super-admin/tenants/[id]/route';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    store: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    storeSettings: {
      upsert: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    },
  },
}));

describe('Super-Admin Owner Control Plane & Website Duplication', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...ORIGINAL_ENV,
      ENABLE_SUPER_ADMIN_CONTROL_PLANE: 'true',
      SUPER_ADMIN_EMAIL: 'myowner@aiseo.id',
      SUPER_ADMIN_PASSWORD: 'SecretOwnerPass#99',
      SUPER_ADMIN_JWT_SECRET: 'super-secret-owner-jwt-signing-key-2026',
      JWT_SECRET: 'store-tenant-jwt-secret-key-2026',
    };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('Single-Owner Authentication Guard (superAdminAuth)', () => {
    it('allows only the configured owner email and password to authenticate', async () => {
      await expect(
        verifyOwnerCredentials('myowner@aiseo.id', 'SecretOwnerPass#99')
      ).resolves.toBe(true);

      // Wrong email (e.g. a client store admin email)
      await expect(
        verifyOwnerCredentials('clientadmin@tokoklien.com', 'SecretOwnerPass#99')
      ).resolves.toBe(false);

      // Wrong password
      await expect(
        verifyOwnerCredentials('myowner@aiseo.id', 'WrongPassword')
      ).resolves.toBe(false);
    });

    it('rejects regular store ADMIN JWT tokens from accessing duplication endpoints', async () => {
      // A valid JWT for a Store ADMIN (not the Super-Admin Owner)
      const regularStoreAdminToken = jwt.sign(
        {
          id: 'user-store-admin-1',
          email: 'myowner@aiseo.id',
          role: 'ADMIN',
          storeId: 'store-1',
        },
        process.env.JWT_SECRET!
      );

      expect(verifySuperAdminToken(regularStoreAdminToken)).toBeNull();

      const req = new Request('http://localhost/api/super-admin/tenants', {
        headers: { Authorization: `Bearer ${regularStoreAdminToken}` },
      });

      expect(requireSuperAdminOwner(req)).toBeNull();
      const res = await listTenants(req);
      expect(res.status).toBe(403);
    });

    it('blocks all access with 404 when ENABLE_SUPER_ADMIN_CONTROL_PLANE is false (on client stores)', async () => {
      const ownerToken = generateSuperAdminToken('myowner@aiseo.id');
      process.env.ENABLE_SUPER_ADMIN_CONTROL_PLANE = 'false';

      const req = new Request('http://localhost/api/super-admin/tenants', {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      const res = await listTenants(req);
      expect(res.status).toBe(404);
    });
  });

  describe('7-Group Duplication Form Input & Provisioning Engine', () => {
    it('validates and normalizes the 7-group duplication form input', () => {
      const parsed = TenantDuplicationInputSchema.parse({
        storeName: 'Berkah Hijab Official',
        tenantSlug: 'berkah-hijab',
        domain: 'https://BerkahHijab.com/katalog',
        tagline: 'Hijab Nyaman & Elegan',
        storeEmail: 'cs@berkahhijab.com',
        storePhone: '081234567890',
        storeAddress: 'Jl. Melati No. 12, Bandung',
        adminName: 'Siti Aminah',
        adminEmail: 'owner@berkahhijab.com',
        adminPassword: 'Berkah#2026Password',
        primaryColor: '#059669',
        fontFamily: 'poppins',
        defaultPageSize: 10,
        seedPreset: 'STARTER_FASHION',
        seedLedgerCategories: true,
        generateLegalPages: true,
      });

      expect(parsed.domain).toBe('berkahhijab.com');
      expect(parsed.primaryColor).toBe('#059669');
      expect(parsed.defaultPageSize).toBe(10);
      expect(parsed.seedPreset).toBe('STARTER_FASHION');
    });

    it('provisions store, settings, legal pages, ledger categories, admin user, and starter products', async () => {
      const mockPrisma: any = {
        store: {
          upsert: jest.fn().mockResolvedValue({
            id: 'store-berkah-1',
            name: 'Berkah Hijab Official',
            domain: 'berkahhijab.com',
            email: 'cs@berkahhijab.com',
            phone: '081234567890',
          }),
        },
        storeSettings: {
          upsert: jest.fn().mockResolvedValue({ id: 'settings-1' }),
        },
        user: {
          upsert: jest.fn().mockResolvedValue({
            id: 'admin-user-1',
            email: 'owner@berkahhijab.com',
            role: 'ADMIN',
          }),
        },
        ledgerCategory: {
          upsert: jest.fn().mockResolvedValue({ id: 'lc-1' }),
        },
        category: {
          upsert: jest.fn().mockImplementation(({ create }) =>
            Promise.resolve({ id: `cat-${create.slug}`, ...create })
          ),
        },
        product: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'prod-1' }),
        },
      };

      const result = await provisionTenantStore(
        {
          storeName: 'Berkah Hijab Official',
          tenantSlug: 'berkah-hijab',
          domain: 'berkahhijab.com',
          tagline: 'Hijab Nyaman & Elegan',
          storeEmail: 'cs@berkahhijab.com',
          storePhone: '081234567890',
          storeAddress: 'Jl. Melati No. 12, Bandung',
          adminName: 'Siti Aminah',
          adminEmail: 'owner@berkahhijab.com',
          adminPassword: 'Berkah#2026Password',
          primaryColor: '#059669',
          fontFamily: 'poppins',
          defaultPageSize: 10,
          socialLinks: { instagram: 'https://instagram.com/berkahhijab' },
          seedPreset: 'STARTER_FASHION',
          seedLedgerCategories: true,
          generateLegalPages: true,
          cookieConsentEnabled: true,
          ga4Id: 'G-TEST12345',
          turnstileEnabled: false,
          dbMode: 'CURRENT_DB',
          deployMode: 'MANUAL_EXPORT',
          subscriptionPlan: 'BUSINESS',
        },
        mockPrisma
      );

      expect(result.store.domain).toBe('berkahhijab.com');
      expect(result.adminUser.email).toBe('owner@berkahhijab.com');
      expect(result.seededCounts.ledgerCategories).toBe(7);
      expect(result.seededCounts.categories).toBeGreaterThan(0);
      expect(result.seededCounts.products).toBeGreaterThan(0);

      // Verify legal pages were generated with the client's store name
      const settingsCall = mockPrisma.storeSettings.upsert.mock.calls[0][0];
      expect(settingsCall.create.termsContent).toContain('Berkah Hijab Official');
      expect(settingsCall.create.privacyContent).toContain('cs@berkahhijab.com');
      expect(settingsCall.create.defaultPageSize).toBe(10);

      // Verify generated .env disables Super-Admin Control Plane on the client's deployment
      expect(result.deployment.envContent).toContain('ENABLE_SUPER_ADMIN_CONTROL_PLANE="false"');
      expect(result.deployment.envContent).toContain('DEFAULT_STORE_DOMAIN="berkahhijab.com"');
    });

    it('generates isolated .env config with unique cryptographic secrets', () => {
      const cfg1 = generateTenantEnvConfig({
        domain: 'klien1.com',
        databaseUrl: 'postgresql://db1',
      });
      const cfg2 = generateTenantEnvConfig({
        domain: 'klien2.com',
        databaseUrl: 'postgresql://db2',
      });

      expect(cfg1.jwtSecret).not.toEqual(cfg2.jwtSecret);
      expect(cfg1.cronSecret).not.toEqual(cfg2.cronSecret);
      expect(cfg1.envContent).toContain('ENABLE_SUPER_ADMIN_CONTROL_PLANE="false"');
    });
  });

  describe('Tenant Editing & Password Reset (PUT /api/super-admin/tenants/[id])', () => {
    it('rejects unauthenticated or regular store admin callers', async () => {
      const regularAdminToken = jwt.sign(
        { id: 'user-1', email: 'owner@berkah.com', role: 'ADMIN', storeId: 'store-1' },
        process.env.JWT_SECRET!
      );

      const req = new Request('http://localhost/api/super-admin/tenants/store-1', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${regularAdminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ storeName: 'New Name' }),
      });

      const res = await updateTenant(req, { params: { id: 'store-1' } });
      expect(res.status).toBe(403);
    });

    it('allows Super-Admin Owner to update store data and reset admin password', async () => {
      const ownerToken = generateSuperAdminToken('myowner@aiseo.id');
      const existingStore = {
        id: 'store-1',
        name: 'Toko Lama',
        domain: 'tokolama.com',
        email: 'cs@tokolama.com',
        phone: '0812000000',
        settings: {
          primaryColor: '#4F46E5',
          fontFamily: 'inter',
          defaultPageSize: 10,
        },
        users: [
          {
            id: 'admin-1',
            email: 'admin@tokolama.com',
            firstName: 'Budi',
            lastName: 'Santoso',
            role: 'ADMIN',
          },
        ],
      };

      (prisma.store.findUnique as jest.Mock).mockResolvedValue(existingStore);
      (prisma.store.update as jest.Mock).mockResolvedValue({
        ...existingStore,
        name: 'Toko Baru Makmur',
        domain: 'tokobarumakmur.com',
      });
      (prisma.storeSettings.upsert as jest.Mock).mockResolvedValue({ id: 'settings-1' });
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: 'admin-1' });

      const req = new Request('http://localhost/api/super-admin/tenants/store-1', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeName: 'Toko Baru Makmur',
          domain: 'tokobarumakmur.com',
          primaryColor: '#10B981',
          defaultPageSize: 25,
          adminName: 'Budi Hartono',
          adminEmail: 'budi@tokobarumakmur.com',
          newAdminPassword: 'PasswordBaru#2026',
        }),
      });

      const res = await updateTenant(req, { params: { id: 'store-1' } });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.adminUpdated).toBe(true);
      expect(data.resetPasswordMessage).toBeDefined();
      expect(data.resetPasswordMessage).toContain('PasswordBaru#2026');
      expect(data.resetPasswordMessage).toContain('budi@tokobarumakmur.com');
      expect(data.resetPasswordMessage).toContain('tokobarumakmur.com');

      // Verify Prisma was called with passwordHash
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'admin-1' },
          data: expect.objectContaining({
            email: 'budi@tokobarumakmur.com',
            firstName: 'Budi',
            lastName: 'Hartono',
            passwordHash: expect.any(String),
          }),
        })
      );
    });
  });
});

