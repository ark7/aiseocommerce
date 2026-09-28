import { LedgerType } from '@prisma/client';
import {
  DEFAULT_LEDGER_CATEGORIES,
  defaultCategoryRows,
  seedDefaultCategories,
} from '@/lib/ledgerCategory';

describe('DEFAULT_LEDGER_CATEGORIES', () => {
  test('covers every ledger type, so no type starts with an empty picklist', () => {
    const types = Object.values(LedgerType) as LedgerType[];

    expect(Object.keys(DEFAULT_LEDGER_CATEGORIES).sort()).toEqual([...types].sort());
    for (const type of types) {
      expect(DEFAULT_LEDGER_CATEGORIES[type].length).toBeGreaterThan(0);
    }
  });

  // The app writes these three names itself, so a store that lacks them has
  // ledger rows that its own master list does not contain.
  test.each([
    [LedgerType.INCOME, 'SALES'],
    [LedgerType.REFUND, 'REFUND'],
    [LedgerType.PETTY_CASH, 'PETTY_CASH'],
  ])('includes %s / %s, which the app writes by itself', (type, name) => {
    expect(DEFAULT_LEDGER_CATEGORIES[type]).toContain(name);
  });

  test('has no duplicate names within a type', () => {
    for (const names of Object.values(DEFAULT_LEDGER_CATEGORIES)) {
      expect(new Set(names).size).toBe(names.length);
    }
  });
});

describe('defaultCategoryRows', () => {
  test('builds one row per name, tagged with the store', () => {
    const rows = defaultCategoryRows('store-1');
    const expected = Object.values(DEFAULT_LEDGER_CATEGORIES).flat().length;

    expect(rows).toHaveLength(expected);
    expect(rows.every((row) => row.storeId === 'store-1')).toBe(true);
  });

  test('keeps each name under the type it belongs to', () => {
    const rows = defaultCategoryRows('store-1');
    const sales = rows.find((row) => row.name === 'SALES');

    expect(sales?.type).toBe(LedgerType.INCOME);
  });
});

describe('seedDefaultCategories', () => {
  test('upserts the list rather than inserting it twice', async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 0 });

    await seedDefaultCategories({ ledgerCategory: { createMany } } as never, 'store-1');

    const args = createMany.mock.calls[0][0];
    expect(args.skipDuplicates).toBe(true);
    expect(args.data).toHaveLength(defaultCategoryRows('store-1').length);
  });
});
