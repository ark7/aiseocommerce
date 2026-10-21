import { z } from 'zod';
import crypto from 'crypto';
import { PrismaClient, Role, LedgerType } from '@prisma/client';
import { prisma as defaultPrisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export const SeedPresetEnum = z.enum([
  'CLEAN',
  'STARTER_FASHION',
  'STARTER_FNB',
  'STARTER_ELECTRONICS',
  'STARTER_GENERAL',
]);

export type SeedPreset = z.infer<typeof SeedPresetEnum>;

export const DbProvisionModeEnum = z.enum([
  'CURRENT_DB',
  'CUSTOM_DB_URL',
  'AUTO_NEON',
]);

export const DeployModeEnum = z.enum([
  'MANUAL_EXPORT',
  'AUTO_VERCEL',
  'AUTO_COOLIFY',
]);

export const SubscriptionPlanEnum = z.enum([
  'STARTER',
  'BUSINESS',
  'ENTERPRISE',
  'CUSTOM',
]);

/**
 * Complete 7-Group Form Input Schema for Customer Website Duplication
 */
export const TenantDuplicationInputSchema = z.object({
  // --- GRUP 1: Identitas Toko & Domain (Wajib) ---
  storeName: z.string().min(2, 'Nama toko minimal 2 karakter').max(120),
  tenantSlug: z
    .string()
    .min(2, 'Slug tenant minimal 2 karakter')
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Slug hanya boleh huruf kecil, angka, dan tanda hubung (-)'),
  domain: z
    .string()
    .min(3, 'Domain wajib diisi')
    .max(150)
    .transform((v) => v.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')),
  tagline: z.string().max(200).optional().nullable(),
  storeEmail: z.string().email('Format email toko tidak valid'),
  storePhone: z.string().min(6, 'Nomor telepon/WhatsApp toko wajib diisi').max(40),
  storeAddress: z.string().max(500).optional().nullable(),

  // --- GRUP 2: Akun Owner / Admin Utama Pelanggan (Wajib) ---
  adminName: z.string().min(2, 'Nama pemilik/admin wajib diisi').max(100),
  adminEmail: z.string().email('Email login admin pelanggan tidak valid'),
  adminPassword: z.string().min(8, 'Password awal admin minimal 8 karakter').max(100),

  // --- GRUP 3: Branding, Tema Visual & Pengaturan List Default ---
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Warna harus format HEX (#RRGGBB)')
    .default('#4F46E5'),
  fontFamily: z
    .enum([
      'inter',
      'poppins',
      'plus-jakarta-sans',
      'playfair-display',
      'roboto',
      'montserrat',
      'lora',
    ])
    .default('inter'),
  logoUrl: z.string().optional().nullable(),
  faviconUrl: z.string().optional().nullable(),
  heroBadge: z.string().max(80).optional().nullable(),
  heroTitle: z.string().max(160).optional().nullable(),
  heroSubtitle: z.string().max(400).optional().nullable(),
  heroCtaText: z.string().max(60).optional().nullable(),
  heroCtaLink: z.string().max(200).optional().nullable(),
  heroImageUrl: z.string().optional().nullable(),
  defaultPageSize: z.coerce.number().int().min(1).max(100).default(10),
  socialLinks: z
    .object({
      instagram: z.string().optional(),
      tiktok: z.string().optional(),
      whatsapp: z.string().optional(),
      facebook: z.string().optional(),
      shopee: z.string().optional(),
      tokopedia: z.string().optional(),
    })
    .optional()
    .default({}),

  // --- GRUP 4: Preset Konten Awal & Seeding Otomatis ---
  seedPreset: SeedPresetEnum.default('CLEAN'),
  seedLedgerCategories: z.boolean().default(true),
  generateLegalPages: z.boolean().default(true),
  cookieConsentEnabled: z.boolean().default(true),

  // --- GRUP 5: SEO Dasar & Tracking Pixel (Opsional) ---
  defaultSeoTitle: z.string().max(120).optional().nullable(),
  defaultSeoDescription: z.string().max(300).optional().nullable(),
  ga4Id: z.string().max(60).optional().nullable(),
  metaPixelId: z.string().max(60).optional().nullable(),
  tiktokPixelId: z.string().max(60).optional().nullable(),

  // --- GRUP 6: Payment Gateway & Proteksi Bot (Opsional) ---
  midtransMerchantId: z.string().max(100).optional().nullable(),
  midtransClientKey: z.string().max(150).optional().nullable(),
  midtransServerKey: z.string().max(150).optional().nullable(),
  flipApiKey: z.string().max(150).optional().nullable(),
  turnstileEnabled: z.boolean().default(false),
  turnstileSiteKey: z.string().max(150).optional().nullable(),
  turnstileSecretKey: z.string().max(150).optional().nullable(),

  // --- GRUP 7: Konfigurasi Infrastruktur & Langganan Klien ---
  dbMode: DbProvisionModeEnum.default('CURRENT_DB'),
  customDatabaseUrl: z.string().optional().nullable(),
  neonApiKey: z.string().optional().nullable(),
  neonProjectId: z.string().optional().nullable(),
  deployMode: DeployModeEnum.default('MANUAL_EXPORT'),
  vercelApiToken: z.string().optional().nullable(),
  vercelTeamId: z.string().optional().nullable(),
  gitRepoSlug: z.string().optional().nullable(),
  coolifyWebhookUrl: z.string().optional().nullable(),
  subscriptionPlan: SubscriptionPlanEnum.default('BUSINESS'),
  expiresAt: z.string().optional().nullable(),
  internalNotes: z.string().max(1000).optional().nullable(),
});

export type TenantDuplicationInput = z.infer<typeof TenantDuplicationInputSchema>;

export const DEFAULT_LEDGER_CATEGORIES: Array<{ type: LedgerType; name: string }> = [
  { type: 'INCOME', name: 'Penjualan Produk' },
  { type: 'INCOME', name: 'Pendapatan Ongkir & Layanan' },
  { type: 'INCOME', name: 'Pendapatan Lain-lain' },
  { type: 'EXPENSE', name: 'HPP / Belanja Stok Produk' },
  { type: 'EXPENSE', name: 'Biaya Iklan & Pemasaran' },
  { type: 'EXPENSE', name: 'Gaji & Operasional Toko' },
  { type: 'EXPENSE', name: 'Biaya Kemasan & Logistik' },
];

interface StarterItem {
  categoryName: string;
  categorySlug: string;
  categoryDesc: string;
  products: Array<{
    name: string;
    slug: string;
    shortDescription: string;
    description: string;
    basePrice: number;
    sellingPrice: number;
    discountPrice?: number;
    stock: number;
    isPreOrder?: boolean;
    preOrderDays?: number;
    imageUrl: string;
  }>;
}

const STARTER_CATALOGS: Record<Exclude<SeedPreset, 'CLEAN'>, StarterItem[]> = {
  STARTER_FASHION: [
    {
      categoryName: 'Koleksi Atasan & Kemeja',
      categorySlug: 'koleksi-atasan-kemeja',
      categoryDesc: 'Pilihan kemeja, tunik, dan atasan berkualitas tinggi untuk aktivitas harian.',
      products: [
        {
          name: 'Kemeja Linen Kasual Premium',
          slug: 'kemeja-linen-kasual-premium',
          shortDescription: 'Bahan linen adem, potongan modern dan rapi.',
          description:
            'Kemeja berbahan 100% katun linen pilihan yang lembut dan menyerap keringat. Cocok untuk kegiatan kasual maupun kerja.',
          basePrice: 110000,
          sellingPrice: 185000,
          discountPrice: 159000,
          stock: 35,
          imageUrl: 'https://picsum.photos/seed/fashion-linen-1/600/600',
        },
        {
          name: 'Setelan Eksklusif Custom (Pre-Order)',
          slug: 'setelan-eksklusif-custom-po',
          shortDescription: 'Jahitan butik rapi, tersedia ukuran S hingga XXL.',
          description:
            'Koleksi setelan eksklusif yang dijahit khusus sesuai pesanan untuk memastikan ukuran yang pas dan kualitas detail terbaik.',
          basePrice: 210000,
          sellingPrice: 349000,
          stock: 0,
          isPreOrder: true,
          preOrderDays: 7,
          imageUrl: 'https://picsum.photos/seed/fashion-custom-2/600/600',
        },
      ],
    },
    {
      categoryName: 'Tas & Aksesoris',
      categorySlug: 'tas-aksesoris',
      categoryDesc: 'Pelengkap gaya elegan setiap hari.',
      products: [
        {
          name: 'Tas Selempang Kulit Sintetis Minimalis',
          slug: 'tas-selempang-minimalis',
          shortDescription: 'Desain timeless, kompartemen luas & tahan cipratan air.',
          description:
            'Tas selempang multifungsi dengan material vegan leather premium, dilengkapi ritsleting anti-macet dan tali bahu yang dapat disesuaikan.',
          basePrice: 95000,
          sellingPrice: 175000,
          stock: 25,
          imageUrl: 'https://picsum.photos/seed/fashion-bag-3/600/600',
        },
      ],
    },
  ],
  STARTER_FNB: [
    {
      categoryName: 'Makanan & Hampers Spesial',
      categorySlug: 'makanan-hampers-spesial',
      categoryDesc: 'Sajian segar buatan hari ini dengan bahan baku pilihan.',
      products: [
        {
          name: 'Hampers Brownies Panggang Premium (Pre-Order)',
          slug: 'hampers-brownies-panggang-premium',
          shortDescription: 'Cokelat Belgian lumer, dibuat fresh saat dipesan.',
          description:
            'Brownies panggang dengan tekstur fudgy di dalam dan shiny crust renyah di luar. Dikemas dalam kotak eksklusif lengkap dengan kartu ucapan.',
          basePrice: 65000,
          sellingPrice: 120000,
          stock: 0,
          isPreOrder: true,
          preOrderDays: 2,
          imageUrl: 'https://picsum.photos/seed/fnb-brownies-1/600/600',
        },
        {
          name: 'Kopi Arabika Gayo Roast Bean 250gr',
          slug: 'kopi-arabika-gayo-250gr',
          shortDescription: 'Biji kopi pilihan medium roast dengan aroma karamel & cokelat.',
          description:
            '100% kopi Arabika dataran tinggi Gayo yang disangrai secara presisi untuk menghasilkan cita rasa seimbang dan aroma memikat.',
          basePrice: 55000,
          sellingPrice: 95000,
          discountPrice: 85000,
          stock: 40,
          imageUrl: 'https://picsum.photos/seed/fnb-coffee-2/600/600',
        },
      ],
    },
  ],
  STARTER_ELECTRONICS: [
    {
      categoryName: 'Gadget & Aksesoris Pintar',
      categorySlug: 'gadget-aksesoris-pintar',
      categoryDesc: 'Perangkat elektronik bergaransi resmi.',
      products: [
        {
          name: 'TWS Earbuds Active Noise Cancelling',
          slug: 'tws-earbuds-anc-pro',
          shortDescription: 'Baterai tahan 28 jam, suara bass jernih, koneksi Bluetooth 5.3.',
          description:
            'Earbuds nirkabel dengan peredam bising aktif (ANC), mikrofon ganda jernih untuk rapat online, serta sertifikasi tahan keringat IPX4.',
          basePrice: 190000,
          sellingPrice: 329000,
          discountPrice: 279000,
          stock: 30,
          imageUrl: 'https://picsum.photos/seed/elec-tws-1/600/600',
        },
        {
          name: 'Fast Charger GaN 65W Multi-Port USB-C',
          slug: 'fast-charger-gan-65w',
          shortDescription: 'Isi daya laptop dan smartphone sekaligus dengan teknologi GaN dingin.',
          description:
            'Kepala charger kompak berteknologi Gallium Nitride (GaN) 65W dengan 2 port USB-C dan 1 port USB-A.',
          basePrice: 120000,
          sellingPrice: 215000,
          stock: 20,
          imageUrl: 'https://picsum.photos/seed/elec-charger-2/600/600',
        },
      ],
    },
  ],
  STARTER_GENERAL: [
    {
      categoryName: 'Produk Unggulan',
      categorySlug: 'produk-unggulan',
      categoryDesc: 'Koleksi produk pilihan terbaik dari toko kami.',
      products: [
        {
          name: 'Paket Bundling Hemat Eksklusif',
          slug: 'paket-bundling-hemat-eksklusif',
          shortDescription: 'Produk unggulan kualitas terjamin dengan harga spesial.',
          description:
            'Produk contoh siap jual. Anda dapat mengubah nama, foto, harga, dan deskripsi produk ini kapan saja melalui menu Produk di Panel Admin.',
          basePrice: 75000,
          sellingPrice: 149000,
          discountPrice: 125000,
          stock: 50,
          imageUrl: 'https://picsum.photos/seed/general-bundle-1/600/600',
        },
      ],
    },
  ],
};

/**
 * Generates customized Indonesian Terms & Conditions HTML with the client's store identity.
 */
export function buildDefaultTermsHtml(input: {
  storeName: string;
  domain: string;
  storeEmail: string;
  storePhone: string;
  storeAddress?: string | null;
}): string {
  return `<h2>Syarat dan Ketentuan Layanan ${input.storeName}</h2>
<p>Selamat datang di <strong>${input.storeName}</strong> (<em>${input.domain}</em>). Dengan mengakses dan melakukan pemesanan di situs ini, Anda menyetujui ketentuan berikut:</p>
<h3>1. Informasi Produk & Ketersediaan</h3>
<p>Kami berkomitmen menyajikan informasi produk, harga, dan status ketersediaan (baik produk <strong>Ready Stock</strong> maupun <strong>Pre-Order</strong>) secara akurat. Untuk produk berstatus Pre-Order, estimasi waktu pengerjaan tertera pada halaman detail produk.</p>
<h3>2. Pemesanan & Pembayaran</h3>
<p>Pesanan akan diproses setelah pembayaran terverifikasi oleh sistem atau tim admin kami. Pastikan nominal pembayaran sesuai dengan tagihan pesanan Anda.</p>
<h3>3. Pengiriman & Garansi</h3>
<p>Pengiriman dilakukan melalui jasa ekspedisi rekanan ke alamat yang Anda cantumkan saat checkout. Jika terdapat kendala atau ketidaksesuaian barang, silakan hubungi layanan pelanggan kami maksimal 2x24 jam sejak barang diterima disertai bukti video unboxing.</p>
<h3>4. Kontak Resmi</h3>
<ul>
  <li><strong>Toko:</strong> ${input.storeName}</li>
  <li><strong>Email:</strong> ${input.storeEmail}</li>
  <li><strong>Telepon / WhatsApp:</strong> ${input.storePhone}</li>
  ${input.storeAddress ? `<li><strong>Alamat:</strong> ${input.storeAddress}</li>` : ''}
</ul>`;
}

/**
 * Generates customized Indonesian Privacy Policy HTML with the client's store identity.
 */
export function buildDefaultPrivacyHtml(input: {
  storeName: string;
  domain: string;
  storeEmail: string;
  storePhone: string;
}): string {
  return `<h2>Kebijakan Privasi ${input.storeName}</h2>
<p><strong>${input.storeName}</strong> menghargai dan melindungi privasi data pribadi setiap pelanggan yang berbelanja di <em>${input.domain}</em>.</p>
<h3>1. Data yang Kami Kumpulkan</h3>
<p>Kami hanya mengumpulkan data yang diperlukan untuk memproses dan mengirimkan pesanan Anda, meliputi: Nama lengkap, Alamat pengiriman, Nomor telepon/WhatsApp, dan Alamat email.</p>
<h3>2. Penggunaan Data</h3>
<p>Data Anda digunakan semata-mata untuk pemrosesan transaksi, pengiriman pesanan, konfirmasi pembayaran, serta layanan bantuan pelanggan.</p>
<h3>3. Keamanan Data & Cookie</h3>
<p>Situs ini menggunakan enkripsi standar industri dan cookie fungsional untuk menjaga keamanan sesi keranjang belanja Anda. Kami tidak pernah memperjualbelikan data pribadi pelanggan kepada pihak ketiga.</p>
<h3>4. Hubungi Kami</h3>
<p>Apabila Anda memiliki pertanyaan terkait perlindungan data pribadi, silakan hubungi kami melalui email <strong>${input.storeEmail}</strong> atau WhatsApp <strong>${input.storePhone}</strong>.</p>`;
}

/**
 * Generates a ready-to-use .env file string for the duplicated client website.
 */
export function generateTenantEnvConfig(params: {
  domain: string;
  databaseUrl: string;
  jwtSecret?: string;
  cronSecret?: string;
}): {
  jwtSecret: string;
  cronSecret: string;
  envContent: string;
} {
  const jwtSecret = params.jwtSecret || crypto.randomBytes(32).toString('hex');
  const cronSecret = params.cronSecret || crypto.randomBytes(24).toString('hex');
  const appUrl = params.domain.startsWith('localhost')
    ? `http://${params.domain}`
    : `https://${params.domain}`;

  const envContent = [
    `# ============================================================================`,
    `# KONFIGURASI ENVIRONMENT WEBSITE PELANGGAN: ${params.domain}`,
    `# Dibuat otomatis oleh Super-Admin Control Plane`,
    `# ============================================================================`,
    `DATABASE_URL="${params.databaseUrl}"`,
    `DEFAULT_STORE_DOMAIN="${params.domain}"`,
    `NEXT_PUBLIC_APP_URL="${appUrl}"`,
    `JWT_SECRET="${jwtSecret}"`,
    `CRON_SECRET="${cronSecret}"`,
    `# Nonaktifkan portal Super-Admin di website pelanggan demi keamanan:`,
    `ENABLE_SUPER_ADMIN_CONTROL_PLANE="false"`,
    ``,
  ].join('\n');

  return { jwtSecret, cronSecret, envContent };
}

/**
 * Splits a full name into firstName and lastName
 */
export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

export const TenantUpdateInputSchema = z.object({
  storeName: z.string().min(2, 'Nama toko minimal 2 karakter').max(120).optional(),
  domain: z
    .string()
    .min(3)
    .max(150)
    .transform((v) => v.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
    .optional(),
  tagline: z.string().max(200).optional().nullable(),
  storeEmail: z.string().email('Format email toko tidak valid').optional(),
  storePhone: z.string().min(6).max(40).optional(),
  storeAddress: z.string().max(500).optional().nullable(),

  adminUserId: z.string().optional().nullable(),
  adminName: z.string().min(2).max(100).optional(),
  adminEmail: z.string().email('Email admin tidak valid').optional(),
  newAdminPassword: z.string().min(8, 'Password baru minimal 8 karakter').max(100).optional().nullable(),
  isAdminActive: z.boolean().optional(),

  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Warna harus format HEX (#RRGGBB)')
    .optional(),
  fontFamily: z
    .enum([
      'inter',
      'poppins',
      'plus-jakarta-sans',
      'playfair-display',
      'roboto',
      'montserrat',
      'lora',
    ])
    .optional(),
  defaultPageSize: z.coerce.number().int().min(1).max(100).optional(),
  logoUrl: z.string().optional().nullable(),
  faviconUrl: z.string().optional().nullable(),
  heroBadge: z.string().max(80).optional().nullable(),
  heroTitle: z.string().max(160).optional().nullable(),
  heroSubtitle: z.string().max(400).optional().nullable(),
  heroCtaText: z.string().max(60).optional().nullable(),
  heroCtaLink: z.string().max(200).optional().nullable(),
  heroImageUrl: z.string().optional().nullable(),
  socialLinks: z.record(z.string()).optional(),

  defaultSeoTitle: z.string().max(120).optional().nullable(),
  defaultSeoDescription: z.string().max(300).optional().nullable(),
  ga4Id: z.string().max(60).optional().nullable(),
  metaPixelId: z.string().max(60).optional().nullable(),
  tiktokPixelId: z.string().max(60).optional().nullable(),

  midtransMerchantId: z.string().max(100).optional().nullable(),
  midtransClientKey: z.string().max(150).optional().nullable(),
  midtransServerKey: z.string().max(150).optional().nullable(),
  flipApiKey: z.string().max(150).optional().nullable(),
  turnstileEnabled: z.boolean().optional(),
  turnstileSiteKey: z.string().max(150).optional().nullable(),
  turnstileSecretKey: z.string().max(150).optional().nullable(),
  cookieConsentEnabled: z.boolean().optional(),
});

export type TenantUpdateInput = z.infer<typeof TenantUpdateInputSchema>;

export interface ProvisionTenantResult {
  store: {
    id: string;
    name: string;
    domain: string;
    email: string | null;
    phone: string | null;
  };
  adminUser: {
    id: string;
    email: string;
    name: string;
    initialPassword: string;
  };
  seededCounts: {
    ledgerCategories: number;
    categories: number;
    products: number;
  };
  deployment: {
    databaseMode: string;
    deployMode: string;
    envContent: string;
    handoverMessage: string;
    vercelDeploymentUrl?: string | null;
  };
}

/**
 * Executes the duplication / provisioning of a customer store into the target database.
 */
export async function provisionTenantStore(
  rawInput: TenantDuplicationInput,
  customPrisma?: PrismaClient
): Promise<ProvisionTenantResult> {
  const input = TenantDuplicationInputSchema.parse(rawInput);

  // Determine target Prisma client (current DB vs custom client DB URL)
  let targetPrisma: PrismaClient = customPrisma || defaultPrisma;
  let shouldDisconnect = false;
  let effectiveDatabaseUrl =
    process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/dbname';

  if (!customPrisma && input.dbMode === 'CUSTOM_DB_URL' && input.customDatabaseUrl?.trim()) {
    effectiveDatabaseUrl = input.customDatabaseUrl.trim();
    targetPrisma = new PrismaClient({
      datasources: {
        db: { url: effectiveDatabaseUrl },
      },
    });
    shouldDisconnect = true;
  }

  try {
    const passwordHash = await hashPassword(input.adminPassword);
    const { firstName, lastName } = splitFullName(input.adminName);

    const termsContent = input.generateLegalPages
      ? buildDefaultTermsHtml(input)
      : null;
    const privacyContent = input.generateLegalPages
      ? buildDefaultPrivacyHtml(input)
      : null;

    const analyticsConfig: Record<string, string> = {};
    if (input.ga4Id?.trim()) analyticsConfig.ga4MeasurementId = input.ga4Id.trim();
    if (input.metaPixelId?.trim()) analyticsConfig.metaPixelId = input.metaPixelId.trim();
    if (input.tiktokPixelId?.trim()) analyticsConfig.tiktokPixelId = input.tiktokPixelId.trim();

    const cleanSocialLinks: Record<string, string> = {};
    if (input.socialLinks) {
      for (const [k, v] of Object.entries(input.socialLinks)) {
        if (v && v.trim()) cleanSocialLinks[k] = v.trim();
      }
    }

    // 1. Upsert Store by domain
    const store = await targetPrisma.store.upsert({
      where: { domain: input.domain },
      update: {
        name: input.storeName,
        logo: input.logoUrl || null,
        address: input.storeAddress || null,
        phone: input.storePhone,
        email: input.storeEmail,
      },
      create: {
        name: input.storeName,
        domain: input.domain,
        logo: input.logoUrl || null,
        address: input.storeAddress || null,
        phone: input.storePhone,
        email: input.storeEmail,
      },
    });

    // 2. Upsert StoreSettings
    const defaultHeroTitle =
      input.heroTitle?.trim() || `Selamat Datang di ${input.storeName}`;
    const defaultHeroSubtitle =
      input.heroSubtitle?.trim() ||
      input.tagline?.trim() ||
      `Temukan produk unggulan berkualitas terbaik dari ${input.storeName} dengan pengiriman cepat dan aman.`;
    const defaultSeoTitle =
      input.defaultSeoTitle?.trim() ||
      `${input.storeName}${input.tagline ? ` - ${input.tagline}` : ''}`;
    const defaultSeoDesc =
      input.defaultSeoDescription?.trim() || defaultHeroSubtitle;

    await targetPrisma.storeSettings.upsert({
      where: { storeId: store.id },
      update: {
        businessName: input.storeName,
        businessAddress: input.storeAddress || null,
        businessPhone: input.storePhone,
        tagline: input.tagline || null,
        favicon: input.faviconUrl || null,
        primaryColor: input.primaryColor,
        fontFamily: input.fontFamily,
        defaultPageSize: input.defaultPageSize,
        heroBadge: input.heroBadge || 'Koleksi Pilihan',
        heroTitle: defaultHeroTitle,
        heroSubtitle: defaultHeroSubtitle,
        heroCtaText: input.heroCtaText || 'Belanja Sekarang',
        heroCtaLink: input.heroCtaLink || '/products',
        heroImageUrl: input.heroImageUrl || null,
        defaultSeoTitle,
        defaultSeoDescription: defaultSeoDesc,
        googleTagId: input.ga4Id?.trim() || null,
        analyticsConfig,
        socialLinks: cleanSocialLinks,
        midtransMerchantId: input.midtransMerchantId?.trim() || null,
        midtransClientKey: input.midtransClientKey?.trim() || null,
        midtransServerKey: input.midtransServerKey?.trim() || null,
        flipApiKey: input.flipApiKey?.trim() || null,
        turnstileEnabled: input.turnstileEnabled,
        turnstileSiteKey: input.turnstileSiteKey?.trim() || null,
        turnstileSecretKey: input.turnstileSecretKey?.trim() || null,
        cookieConsentEnabled: input.cookieConsentEnabled,
        ...(termsContent ? { termsContent } : {}),
        ...(privacyContent ? { privacyContent } : {}),
      },
      create: {
        storeId: store.id,
        businessName: input.storeName,
        businessAddress: input.storeAddress || null,
        businessPhone: input.storePhone,
        tagline: input.tagline || null,
        favicon: input.faviconUrl || null,
        primaryColor: input.primaryColor,
        fontFamily: input.fontFamily,
        defaultPageSize: input.defaultPageSize,
        heroBadge: input.heroBadge || 'Koleksi Pilihan',
        heroTitle: defaultHeroTitle,
        heroSubtitle: defaultHeroSubtitle,
        heroCtaText: input.heroCtaText || 'Belanja Sekarang',
        heroCtaLink: input.heroCtaLink || '/products',
        heroImageUrl: input.heroImageUrl || null,
        defaultSeoTitle,
        defaultSeoDescription: defaultSeoDesc,
        googleTagId: input.ga4Id?.trim() || null,
        analyticsConfig,
        socialLinks: cleanSocialLinks,
        midtransMerchantId: input.midtransMerchantId?.trim() || null,
        midtransClientKey: input.midtransClientKey?.trim() || null,
        midtransServerKey: input.midtransServerKey?.trim() || null,
        flipApiKey: input.flipApiKey?.trim() || null,
        turnstileEnabled: input.turnstileEnabled,
        turnstileSiteKey: input.turnstileSiteKey?.trim() || null,
        turnstileSecretKey: input.turnstileSecretKey?.trim() || null,
        cookieConsentEnabled: input.cookieConsentEnabled,
        termsContent,
        privacyContent,
      },
    });

    // 3. Upsert Client Owner / Admin User
    const adminUser = await targetPrisma.user.upsert({
      where: {
        storeId_email: {
          storeId: store.id,
          email: input.adminEmail.toLowerCase().trim(),
        },
      },
      update: {
        passwordHash,
        firstName,
        lastName: lastName || null,
        phone: input.storePhone,
        role: Role.ADMIN,
        isActive: true,
        emailVerified: true,
      },
      create: {
        storeId: store.id,
        email: input.adminEmail.toLowerCase().trim(),
        passwordHash,
        firstName,
        lastName: lastName || null,
        phone: input.storePhone,
        role: Role.ADMIN,
        isActive: true,
        emailVerified: true,
      },
    });

    // 4. Seed Default Ledger Categories
    let ledgerCategoriesCount = 0;
    if (input.seedLedgerCategories) {
      for (const item of DEFAULT_LEDGER_CATEGORIES) {
        await targetPrisma.ledgerCategory.upsert({
          where: {
            storeId_type_name: {
              storeId: store.id,
              type: item.type,
              name: item.name,
            },
          },
          update: { isActive: true },
          create: {
            storeId: store.id,
            type: item.type,
            name: item.name,
            isActive: true,
          },
        });
        ledgerCategoriesCount++;
      }
    }

    // 5. Optional Starter Catalog Preset
    let categoriesCount = 0;
    let productsCount = 0;

    if (input.seedPreset !== 'CLEAN') {
      const catalogGroups = STARTER_CATALOGS[input.seedPreset] || [];
      for (const group of catalogGroups) {
        const category = await targetPrisma.category.upsert({
          where: {
            storeId_slug: {
              storeId: store.id,
              slug: group.categorySlug,
            },
          },
          update: {
            name: group.categoryName,
            description: group.categoryDesc,
          },
          create: {
            storeId: store.id,
            name: group.categoryName,
            slug: group.categorySlug,
            description: group.categoryDesc,
          },
        });
        categoriesCount++;

        for (let idx = 0; idx < group.products.length; idx++) {
          const prod = group.products[idx];
          const skuCode = `SKU-${input.tenantSlug.toUpperCase().slice(0, 6)}-${categoriesCount}${idx + 1}`;

          const existingProd = await targetPrisma.product.findUnique({
            where: {
              storeId_slug: {
                storeId: store.id,
                slug: prod.slug,
              },
            },
          });

          if (!existingProd) {
            await targetPrisma.product.create({
              data: {
                storeId: store.id,
                categoryId: category.id,
                sku: skuCode,
                name: prod.name,
                slug: prod.slug,
                shortDescription: prod.shortDescription,
                description: prod.description,
                basePrice: prod.basePrice,
                sellingPrice: prod.sellingPrice,
                discountPrice: prod.discountPrice ?? null,
                stock: prod.stock,
                minStock: 5,
                isPreOrder: Boolean(prod.isPreOrder),
                preOrderDays: prod.preOrderDays ?? null,
                isPublished: true,
                isFeatured: idx === 0,
                seoTitle: `${prod.name} | ${input.storeName}`,
                seoDescription: prod.shortDescription,
                images: {
                  create: [
                    {
                      url: prod.imageUrl,
                      altText: prod.name,
                      isPrimary: true,
                      order: 0,
                    },
                  ],
                },
              },
            });
            productsCount++;
          }
        }
      }
    }

    const { envContent } = generateTenantEnvConfig({
      domain: input.domain,
      databaseUrl:
        input.dbMode === 'CUSTOM_DB_URL' && input.customDatabaseUrl?.trim()
          ? input.customDatabaseUrl.trim()
          : '<ISI_DATABASE_URL_PELANGGAN_DI_SINI>',
    });

    const siteUrl = input.domain.startsWith('localhost')
      ? `http://${input.domain}`
      : `https://${input.domain}`;

    const handoverMessage = [
      `🎉 *Selamat! Website Toko Online ${input.storeName} Telah Aktif*`,
      ``,
      `Berikut adalah detail akses untuk mengelola toko Anda:`,
      `🌐 *Alamat Toko Publik:* ${siteUrl}`,
      `🔐 *Halaman Login Admin:* ${siteUrl}/login`,
      `📧 *Email Admin:* ${input.adminEmail}`,
      `🔑 *Password Awal:* ${input.adminPassword}`,
      ``,
      `📌 *Langkah Awal yang Disarankan:*`,
      `1. Login melalui tautan di atas menuju Dashboard Admin (${siteUrl}/admin).`,
      `2. Buka menu *Pengaturan Toko* untuk menyesuaikan logo, rekening bank / Midtrans, dan pixel iklan.`,
      `3. Buka menu *Produk* & *Kategori* untuk mulai menambahkan katalog produk Anda.`,
      `4. Demi keamanan, segera perbarui password Anda setelah login pertama.`,
    ].join('\n');

    return {
      store: {
        id: store.id,
        name: store.name,
        domain: store.domain,
        email: store.email,
        phone: store.phone,
      },
      adminUser: {
        id: adminUser.id,
        email: adminUser.email,
        name: input.adminName,
        initialPassword: input.adminPassword,
      },
      seededCounts: {
        ledgerCategories: ledgerCategoriesCount,
        categories: categoriesCount,
        products: productsCount,
      },
      deployment: {
        databaseMode: input.dbMode,
        deployMode: input.deployMode,
        envContent,
        handoverMessage,
        vercelDeploymentUrl: null,
      },
    };
  } finally {
    if (shouldDisconnect) {
      await targetPrisma.$disconnect().catch(() => {});
    }
  }
}

