import { backfillFunnelEvents } from '../../scripts/backfillFunnelEvents'

jest.mock('@prisma/client', () => {
  const mockPrisma = {
    product: { findMany: jest.fn().mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]) },
    $disconnect: jest.fn().mockResolvedValue(undefined),
  }
  return { PrismaClient: jest.fn(() => mockPrisma) }
})

jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn() } }))

test('backfillFunnelEvents logs product count', async () => {
  await backfillFunnelEvents()
  const { logger } = require('@/lib/logger')
  expect(logger.info).toHaveBeenCalledWith('Backfill funnel: 2 products found')
})
