import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';
import { seedDefaultCategories, DEFAULT_LEDGER_CATEGORIES } from '../lib/ledgerCategory';

/**
 * Backfill missing ledger categories for existing stores.
 * For each store, ensure default categories exist via seedDefaultCategories.
 */
export async function backfillLedgerCategories() {
  const prisma = new PrismaClient();
  try {
    const stores = await prisma.store.findMany({ select: { id: true } });
    for (const store of stores) {
      await seedDefaultCategories(prisma, store.id);
    }
    const totalCategories = Object.values(DEFAULT_LEDGER_CATEGORIES).reduce((acc, cat) => acc + cat.length, 0);
    logger.info(`Backfilled ${stores.length} stores with ${totalCategories} default categories each`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  backfillLedgerCategories().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
