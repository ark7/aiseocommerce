import {
  TenantDuplicationInputSchema,
  provisionTenantStore,
  generateTenantEnvConfig,
} from '@/lib/tenantProvisioner';
import { isAllowedSuperAdminHost, isControlPlaneEnabled } from '@/lib/superAdminGuard';

describe('Workflow Opsi B: 100% Database Mandiri + Hosting Mandiri + Domain Mandiri', () => {
  const customClientDbUrl =
    'postgresql://distrobaju_owner:SuperSecretPass2026@ep-cool-cloud-99.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
  const clientDomain = 'distrobaju.com';

  it('1. Validasi Input Duplikasi Toko dengan Mode CUSTOM_DB_URL', () => {
    const rawInput = {
      storeName: 'Distro Baju Bandung',
      tenantSlug: 'distro-baju',
      domain: 'https://distrobaju.com',
      tagline: 'Fashion Pria & Wanita Keren',
      storeEmail: 'cs@distrobaju.com',
      storePhone: '081234567890',
      storeAddress: 'Jl. Riau No. 45, Bandung',
      adminName: 'Budi Santoso',
      adminEmail: 'budi@distrobaju.com',
      adminPassword: 'PasswordKuat#2026',
      primaryColor: '#059669',
      fontFamily: 'poppins',
      defaultPageSize: 10,
      seedPreset: 'STARTER_FASHION',
      seedLedgerCategories: true,
      generateLegalPages: true,
      dbMode: 'CUSTOM_DB_URL',
      customDatabaseUrl: customClientDbUrl,
      deployMode: 'MANUAL_EXPORT',
      subscriptionPlan: 'BUSINESS',
    };

    const validated = TenantDuplicationInputSchema.parse(rawInput);
    expect(validated.domain).toBe('distrobaju.com');
    expect(validated.dbMode).toBe('CUSTOM_DB_URL');
    expect(validated.customDatabaseUrl).toBe(customClientDbUrl);
    expect(validated.seedPreset).toBe('STARTER_FASHION');
  });

  it('2. Menginisialisasi Data ke Database Mandiri Klien (Mock Client DB)', async () => {
    const mockClientPrisma: any = {
      store: {
        upsert: jest.fn().mockResolvedValue({
          id: 'store-distro-001',
          name: 'Distro Baju Bandung',
          domain: clientDomain,
          email: 'cs@distrobaju.com',
          phone: '081234567890',
        }),
      },
      storeSettings: {
        upsert: jest.fn().mockResolvedValue({ id: 'settings-distro-001' }),
      },
      user: {
        upsert: jest.fn().mockResolvedValue({
          id: 'admin-budi-001',
          email: 'budi@distrobaju.com',
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
        create: jest.fn().mockResolvedValue({ id: 'prod-distro-1' }),
      },
    };

    const result = await provisionTenantStore(
      {
        storeName: 'Distro Baju Bandung',
        tenantSlug: 'distro-baju',
        domain: clientDomain,
        tagline: 'Fashion Pria & Wanita Keren',
        storeEmail: 'cs@distrobaju.com',
        storePhone: '081234567890',
        adminName: 'Budi Santoso',
        adminEmail: 'budi@distrobaju.com',
        adminPassword: 'PasswordKuat#2026',
        primaryColor: '#059669',
        fontFamily: 'poppins',
        defaultPageSize: 10,
        seedPreset: 'STARTER_FASHION',
        seedLedgerCategories: true,
        generateLegalPages: true,
        dbMode: 'CUSTOM_DB_URL',
        customDatabaseUrl: customClientDbUrl,
        deployMode: 'MANUAL_EXPORT',
        subscriptionPlan: 'BUSINESS',
      },
      mockClientPrisma
    );

    // Verifikasi eksekusi pada client DB
    expect(mockClientPrisma.store.upsert).toHaveBeenCalled();
    expect(mockClientPrisma.storeSettings.upsert).toHaveBeenCalled();
    expect(mockClientPrisma.user.upsert).toHaveBeenCalled();
    expect(result.store.domain).toBe('distrobaju.com');
    expect(result.adminUser.email).toBe('budi@distrobaju.com');
  });

  it('3. Menghasilkan Konfigurasi .env Terisolasi untuk Hosting Klien', () => {
    const config = generateTenantEnvConfig({
      domain: clientDomain,
      databaseUrl: customClientDbUrl,
    });

    // 1. Menggunakan DATABASE_URL mandiri milik klien
    expect(config.envContent).toContain(`DATABASE_URL="${customClientDbUrl}"`);

    // 2. Mengikat hosting ke domain klien
    expect(config.envContent).toContain(`DEFAULT_STORE_DOMAIN="${clientDomain}"`);
    expect(config.envContent).toContain(`NEXT_PUBLIC_APP_URL="https://${clientDomain}"`);

    // 3. Cryptographic secret unik (bukan secret bersama)
    expect(config.jwtSecret).toHaveLength(64);
    expect(config.cronSecret).toHaveLength(48);
    expect(config.envContent).toContain(`JWT_SECRET="${config.jwtSecret}"`);
    expect(config.envContent).toContain(`CRON_SECRET="${config.cronSecret}"`);

    // 4. Mengunci portal Super-Admin agar tidak terbuka di hosting klien
    expect(config.envContent).toContain('ENABLE_SUPER_ADMIN_CONTROL_PLANE="false"');

    // 5. Mewarisi kunci master PostHog untuk pelacakan terpusat
    expect(config.envContent).toContain('NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com"');
  });

  it('4. Memverifikasi Keamanan Super-Admin Terkunci di Hosting Klien', () => {
    const clientEnv = {
      ENABLE_SUPER_ADMIN_CONTROL_PLANE: 'false',
      SUPER_ADMIN_ALLOWED_HOSTS: 'localhost:3000',
    };

    const originalEnv = process.env;
    process.env = { ...originalEnv, ...clientEnv };

    try {
      // Di hosting klien, control plane dimatikan total
      expect(isControlPlaneEnabled()).toBe(false);

      // Bahkan jika seseorang mencoba akses dari domain klien
      expect(isAllowedSuperAdminHost('distrobaju.com')).toBe(false);
    } finally {
      process.env = originalEnv;
    }
  });
});

