import { backfillLedgerCategories } from '../../scripts/backfillLedgerCategories'

jest.mock('@prisma/client', () => {
  const mockPrisma = {
    store: { findMany: jest.fn().mockResolvedValue([{ id: 'store1' }, { id: 'store2' }]) },
    ledgerCategory: { createMany: jest.fn().mockResolvedValue({ count: 14 }) },
    $disconnect: jest.fn().mockResolvedValue(undefined),
  };
  return { PrismaClient: jest.fn(() => mockPrisma) };
});

jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn() } }));

test('backfillLedgerCategories creates default categories for each store', async () => {
  await backfillLedgerCategories();
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  expect(prisma.store.findMany).toHaveBeenCalled();
  expect(prisma.ledgerCategory.createMany).toHaveBeenCalledTimes(2);
  const { logger } = require('@/lib/logger');
  expect(logger.info).toHaveBeenCalled();
});
