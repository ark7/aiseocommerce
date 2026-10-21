/**
 * Script Bootstrap Tenant Pelanggan Baru (Tanpa Data Dummy Sampah)
 *
 * Contoh Penggunaan via CLI / Environment Variables:
 *   STORE_NAME="Berkah Hijab" \
 *   STORE_DOMAIN="berkahhijab.com" \
 *   STORE_EMAIL="cs@berkahhijab.com" \
 *   STORE_PHONE="081234567890" \
 *   ADMIN_NAME="Siti Aminah" \
 *   ADMIN_EMAIL="owner@berkahhijab.com" \
 *   ADMIN_PASSWORD="PasswordKuat#2026" \
 *   SEED_PRESET="CLEAN" \
 *   npm run tenant:bootstrap
 */

import { provisionTenantStore, SeedPresetEnum } from '../lib/tenantProvisioner';

async function main() {
  const storeName = process.env.STORE_NAME || 'Toko Baru Official';
  const tenantSlug =
    process.env.TENANT_SLUG ||
    storeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  const domain = process.env.STORE_DOMAIN || `${tenantSlug}.local`;
  const storeEmail = process.env.STORE_EMAIL || `cs@${domain}`;
  const storePhone = process.env.STORE_PHONE || '081200000000';
  const storeAddress = process.env.STORE_ADDRESS || '';
  const tagline = process.env.STORE_TAGLINE || '';
  const adminName = process.env.ADMIN_NAME || 'Owner Toko';
  const adminEmail = process.env.ADMIN_EMAIL || `admin@${domain}`;
  const adminPassword = process.env.ADMIN_PASSWORD || 'OwnerStore#2026!';
  const primaryColor = process.env.PRIMARY_COLOR || '#4F46E5';
  const rawPreset = process.env.SEED_PRESET || 'CLEAN';
  const seedPreset = SeedPresetEnum.safeParse(rawPreset).success
    ? (rawPreset as any)
    : 'CLEAN';

  console.log(`\n🚀 Memulai Duplikasi & Bootstrap Toko Pelanggan: ${storeName} (${domain})...`);

  const result = await provisionTenantStore({
    storeName,
    tenantSlug,
    domain,
    tagline,
    storeEmail,
    storePhone,
    storeAddress,
    adminName,
    adminEmail,
    adminPassword,
    primaryColor,
    fontFamily: 'inter',
    defaultPageSize: Number(process.env.DEFAULT_PAGE_SIZE) || 10,
    socialLinks: {},
    seedPreset,
    seedLedgerCategories: true,
    generateLegalPages: true,
    cookieConsentEnabled: true,
    turnstileEnabled: false,
    dbMode: process.env.CUSTOM_DATABASE_URL ? 'CUSTOM_DB_URL' : 'CURRENT_DB',
    customDatabaseUrl: process.env.CUSTOM_DATABASE_URL || null,
    deployMode: 'MANUAL_EXPORT',
    subscriptionPlan: 'BUSINESS',
  });

  console.log(`✅ Toko berhasil dibuat! ID: ${result.store.id}`);
  console.log(`👤 Akun Admin Klien: ${result.adminUser.email}`);
  console.log(
    `📦 Data Diinisialisasi: ${result.seededCounts.ledgerCategories} kategori keuangan, ${result.seededCounts.categories} kategori produk, ${result.seededCounts.products} produk awal.\n`
  );
  console.log(`================ KARTU SERAH TERIMA KLIEN ================`);
  console.log(result.deployment.handoverMessage);
  console.log(`==========================================================\n`);
}

main().catch((err) => {
  console.error('❌ Gagal melakukan bootstrap toko pelanggan:', err);
  process.exit(1);
});

