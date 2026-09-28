import { prisma } from '@/lib/prisma';
import type { LedgerType } from '@prisma/client';

/**
 * Whether a category name is configured and active for this store and type.
 *
 * Both ledger write routes use this, so a category typed by hand can no longer
 * reach the books: the master list is what makes per-category reports add up.
 * `Ledger.category` itself stays a plain string — see the LedgerCategory model.
 */
export async function isConfiguredCategory(
  storeId: string,
  type: LedgerType,
  name: string
): Promise<boolean> {
  const existing = await prisma.ledgerCategory.findFirst({
    where: { storeId, type, name, isActive: true },
    select: { id: true },
  });

  return existing !== null;
}
