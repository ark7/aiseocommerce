import type { LedgerType, Prisma, PrismaClient } from '@prisma/client';

/**
 * The real client or a transaction handle. Same shape recordOrderIncome takes,
 * which is what lets a caller seed categories inside a transaction.
 */
type Db = PrismaClient | Prisma.TransactionClient;

/**
 * The categories every new store starts with.
 *
 * The first three are not suggestions. The app writes those names itself —
 * SALES from recordOrderIncome, REFUND from an order reversal, PETTY_CASH from
 * the petty cash ledger — so a store without them holds ledger rows that its
 * own master list does not contain, which is the split this table exists to
 * prevent. The rest are ordinary labels an admin can rename or delete.
 *
 * Keyed by type, so adding a LedgerType is a compile error until it is handled.
 */
export const DEFAULT_LEDGER_CATEGORIES: Record<LedgerType, string[]> = {
  INCOME: ['SALES', 'Pendapatan Lain'],
  REFUND: ['REFUND'],
  PETTY_CASH: ['PETTY_CASH'],
  EXPENSE: ['Pembelian', 'Operasional', 'Gaji', 'Sewa', 'Iklan'],
  CAPITAL: ['Modal Awal', 'Modal Tambahan'],
  LOAN: ['Pinjaman', 'Angsuran'],
};

/** The default list as insertable rows, for whichever client is at hand. */
export function defaultCategoryRows(storeId: string) {
  return Object.entries(DEFAULT_LEDGER_CATEGORIES).flatMap(([type, names]) =>
    names.map((name) => ({ storeId, type: type as LedgerType, name }))
  );
}

/**
 * Gives a store its starting picklist.
 *
 * `skipDuplicates` makes it safe on a store that already has some: the unique
 * key is (storeId, type, name), so a re-run adds only what is missing. That is
 * also what lets the seed script call it on the demo store.
 */
export async function seedDefaultCategories(db: Db, storeId: string): Promise<void> {
  await db.ledgerCategory.createMany({
    data: defaultCategoryRows(storeId),
    skipDuplicates: true,
  });
}

/**
 * Whether a category name is configured and active for this store and type.
 *
 * Both ledger write routes use this, so a category typed by hand can no longer
 * reach the books: the master list is what makes per-category reports add up.
 * `Ledger.category` itself stays a plain string — see the LedgerCategory model.
 */
export async function isConfiguredCategory(
  db: Db,
  storeId: string,
  type: LedgerType,
  name: string
): Promise<boolean> {
  const existing = await db.ledgerCategory.findFirst({
    where: { storeId, type, name, isActive: true },
    select: { id: true },
  });

  return existing !== null;
}
