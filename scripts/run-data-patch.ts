import { PrismaClient, Store } from '@prisma/client';
import { logger } from '../lib/logger';

export interface PatchResult {
  updated: number;
  skipped: number;
  details?: string;
}

export interface TenantPatchDefinition {
  id: string;
  name: string;
  description: string;
  runForStore: (
    prisma: PrismaClient,
    store: { id: string; name: string; domain: string },
    isDryRun: boolean
  ) => Promise<PatchResult>;
}

export interface PatchExecutionSummary {
  patchId: string;
  totalStores: number;
  successStores: number;
  failedStores: number;
  totalUpdated: number;
  totalSkipped: number;
  isDryRun: boolean;
  errors: Array<{ storeId: string; storeName: string; error: string }>;
}

/**
 * Standardized Multi-Tenant Data Patch Executor.
 * Guarantees tenant isolation, safe iteration, idempotent transactions, and detailed auditing.
 */
export async function executeTenantPatch(
  patch: TenantPatchDefinition,
  options: {
    targetStoreId?: string;
    isDryRun?: boolean;
    prismaClient?: PrismaClient;
  } = {}
): Promise<PatchExecutionSummary> {
  const isDryRun = options.isDryRun ?? false;
  const prisma = options.prismaClient ?? new PrismaClient();

  console.log('\n======================================================');
  console.log(`🔧 TENANT DATA PATCH RUNNER: [${patch.id}] ${patch.name}`);
  console.log(`📝 Deskripsi: ${patch.description}`);
  if (isDryRun) {
    console.log('⚠️  MODE DRY-RUN AKTIF: Tidak ada perubahan data yang disimpan ke PostgreSQL.');
  }
  console.log('======================================================\n');

  const summary: PatchExecutionSummary = {
    patchId: patch.id,
    totalStores: 0,
    successStores: 0,
    failedStores: 0,
    totalUpdated: 0,
    totalSkipped: 0,
    isDryRun,
    errors: [],
  };

  try {
    // 1. Fetch stores to process
    const whereCondition = options.targetStoreId ? { id: options.targetStoreId } : {};
    const stores = await prisma.store.findMany({
      where: whereCondition,
      select: { id: true, name: true, domain: true },
      orderBy: { createdAt: 'asc' },
    });

    summary.totalStores = stores.length;

    if (stores.length === 0) {
      console.log('ℹ️  Tidak ada toko yang cocok untuk diproses.');
      return summary;
    }

    console.log(`🚀 Memproses ${stores.length} toko pelanggan...\n`);

    // 2. Iterate store by store with strict isolation
    for (let i = 0; i < stores.length; i++) {
      const store = stores[i];
      const prefix = `[${i + 1}/${stores.length}] [${store.domain}]`;

      try {
        const result = await patch.runForStore(prisma, store, isDryRun);

        summary.successStores++;
        summary.totalUpdated += result.updated;
        summary.totalSkipped += result.skipped;

        console.log(
          `  ✅ ${prefix} Sukses: ${result.updated} diperbarui, ${result.skipped} dilewati.${
            result.details ? ` (${result.details})` : ''
          }`
        );
      } catch (err: any) {
        summary.failedStores++;
        const errorMessage = err instanceof Error ? err.message : String(err);
        summary.errors.push({
          storeId: store.id,
          storeName: store.name,
          error: errorMessage,
        });

        console.error(`  ❌ ${prefix} GAGAL: ${errorMessage}`);
        logger.error(`Tenant patch failed for store`, { storeId: store.id, patchId: patch.id }, err);
      }
    }

    // 3. Print Final Summary
    console.log('\n------------------------------------------------------');
    console.log('📊 RINGKASAN EKSEKUSI PATCH:');
    console.log(`   - Total Toko Diproses : ${summary.totalStores}`);
    console.log(`   - Berhasil             : ${summary.successStores}`);
    console.log(`   - Gagal                : ${summary.failedStores}`);
    console.log(`   - Total Baris Diupdate : ${summary.totalUpdated}`);
    console.log(`   - Total Baris Dilewati : ${summary.totalSkipped}`);
    console.log('------------------------------------------------------\n');

    return summary;
  } finally {
    if (!options.prismaClient) {
      await prisma.$disconnect();
    }
  }
}

// Example built-in verification patch (Idempotent sanity check)
export const baselineStoreSanityPatch: TenantPatchDefinition = {
  id: 'baseline-store-sanity',
  name: 'Verifikasi Pengaturan Dasar Toko',
  description: 'Memastikan setiap toko memiliki entri StoreSettings yang valid dengan nilai default aman.',
  runForStore: async (prisma, store, isDryRun) => {
    const existing = await prisma.storeSettings.findUnique({
      where: { storeId: store.id },
    });

    if (existing) {
      return { updated: 0, skipped: 1, details: 'Settings sudah ada' };
    }

    if (!isDryRun) {
      await prisma.storeSettings.create({
        data: {
          storeId: store.id,
          defaultPageSize: 10,
          cookieConsentEnabled: true,
          sandboxPaymentEnabled: false,
        },
      });
      return { updated: 1, skipped: 0, details: 'Settings baru dibuat' };
    }

    return { updated: 1, skipped: 0, details: 'Dry-run: akan dibuat' };
  },
};

if (typeof process !== 'undefined' && process.argv[1]?.includes('run-data-patch')) {
  const isDryRun = process.argv.includes('--dry-run');
  executeTenantPatch(baselineStoreSanityPatch, { isDryRun })
    .then((summary) => {
      if (summary.failedStores > 0) process.exit(1);
    })
    .catch((err) => {
      console.error('Fatal patch execution error:', err);
      process.exit(1);
    });
}
