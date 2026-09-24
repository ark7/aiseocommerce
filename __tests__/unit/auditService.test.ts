import {
  logAuditAction,
  getAuditLogs,
  auditOrderCreated,
  auditOrderUpdated,
  auditOrderStatusChanged,
  auditPaymentVerified,
  auditProductCreated,
  auditProductUpdated,
  auditProductDeleted,
  auditCategoryCreated,
  auditCategoryUpdated,
  auditCategoryDeleted,
  auditStockAdjusted,
  auditUserCreated,
  auditUserLogin,
  auditUserLogout,
  auditLedgerCreated,
  auditLedgerDeleted,
} from '@/services/auditService';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

jest.mock('@/lib/prisma', () => ({
  prisma: { auditLog: { create: jest.fn(), findMany: jest.fn() } },
}));
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const USER = 'user-1';
const STORE = 'store-1';
const IP = '203.0.113.7';
const SNAPSHOT = { name: 'Kopi Gayo', slug: 'kopi-gayo' };

/**
 * The single row the helper asked Prisma to write. Every assertion below reads
 * through this, so a helper that stops writing anything fails rather than
 * silently passing on an empty call list.
 */
function written() {
  const calls = (prisma.auditLog.create as jest.Mock).mock.calls;
  expect(calls).toHaveLength(1);
  return calls[0][0].data;
}

describe('auditService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
  });

  describe('logAuditAction', () => {
    it('serialises both sides of an update so the row stays queryable as text', async () => {
      await logAuditAction('UPDATE', 'PRODUCT', 'p1', USER, STORE, { name: 'lama' }, { name: 'baru' }, IP);

      expect(written()).toEqual({
        action: 'UPDATE',
        entityType: 'PRODUCT',
        entityId: 'p1',
        userId: USER,
        storeId: STORE,
        oldValue: JSON.stringify({ name: 'lama' }),
        newValue: JSON.stringify({ name: 'baru' }),
        ipAddress: IP,
        userAgent: undefined,
      });
    });

    it('stores null rather than the string "null" when a side is absent', async () => {
      await logAuditAction('CREATE', 'ORDER', 'o1', USER, STORE, null, { total: 100 });

      expect(written().oldValue).toBeNull();
    });

    it('swallows a write failure so an audit problem can never fail the action it records', async () => {
      (prisma.auditLog.create as jest.Mock).mockRejectedValue(new Error('db down'));

      await expect(logAuditAction('CREATE', 'ORDER', 'o1', USER, STORE, null, {})).resolves.toBeUndefined();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to log audit action',
        expect.objectContaining({ action: 'CREATE', entityType: 'ORDER', entityId: 'o1' }),
        expect.any(Error)
      );
    });

    it('reports a non-Error rejection as a string instead of dropping it', async () => {
      (prisma.auditLog.create as jest.Mock).mockRejectedValue('connection reset');

      await logAuditAction('CREATE', 'ORDER', 'o1', USER, STORE, null, {});

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to log audit action',
        expect.any(Object),
        'connection reset'
      );
    });
  });

  describe('create/update/delete helpers', () => {
    it('records a CREATE with the snapshot as the new value and nothing as the old', async () => {
      await auditProductCreated('p1', USER, STORE, SNAPSHOT, IP);

      expect(written()).toMatchObject({
        action: 'CREATE',
        entityType: 'PRODUCT',
        entityId: 'p1',
        oldValue: null,
        newValue: JSON.stringify(SNAPSHOT),
      });
    });

    it('records an UPDATE with the old and new values on the sides they belong', async () => {
      await auditProductUpdated('p1', USER, STORE, { name: 'lama' }, { name: 'baru' }, IP);

      expect(written()).toMatchObject({
        action: 'UPDATE',
        oldValue: JSON.stringify({ name: 'lama' }),
        newValue: JSON.stringify({ name: 'baru' }),
      });
    });

    it('records a DELETE with the snapshot as the old value, since the row no longer exists', async () => {
      await auditCategoryDeleted('c1', USER, STORE, SNAPSHOT, IP);

      expect(written()).toMatchObject({
        action: 'DELETE',
        entityType: 'CATEGORY',
        entityId: 'c1',
        oldValue: JSON.stringify(SNAPSHOT),
        newValue: null,
      });
    });

    it('attributes every entry to the acting user and the store they acted in', async () => {
      await auditCategoryUpdated('c1', USER, STORE, {}, {}, IP);

      expect(written()).toMatchObject({ userId: USER, storeId: STORE, ipAddress: IP });
    });
  });

  describe('ledger helpers', () => {
    it('keeps a null description in the snapshot instead of dropping the key', async () => {
      await auditLedgerCreated('l1', USER, STORE, 'EXPENSE', 50000, null, IP);

      expect(written()).toMatchObject({
        action: 'CREATE',
        entityType: 'LEDGER',
        newValue: JSON.stringify({ type: 'EXPENSE', amount: 50000, description: null }),
      });
    });

    it('snapshots the ledger row on delete with no new value', async () => {
      await auditLedgerDeleted('l1', USER, STORE, { type: 'INCOME', amount: 1000 }, IP);

      expect(written()).toMatchObject({
        action: 'DELETE',
        entityType: 'LEDGER',
        oldValue: JSON.stringify({ type: 'INCOME', amount: 1000 }),
        newValue: null,
      });
    });
  });

  /**
   * The create/delete helpers are identical bar the entity type, so the only
   * thing a copy-paste can break is which side of the pair the snapshot lands
   * on. One table, every helper.
   */
  describe('every helper puts its snapshot on the correct side', () => {
    const creators: Array<[string, () => Promise<void>]> = [
      ['auditProductCreated', () => auditProductCreated('p1', USER, STORE, SNAPSHOT, IP)],
      ['auditCategoryCreated', () => auditCategoryCreated('c1', USER, STORE, SNAPSHOT, IP)],
    ];

    const deleters: Array<[string, () => Promise<void>]> = [
      ['auditProductDeleted', () => auditProductDeleted('p1', USER, STORE, SNAPSHOT, IP)],
      ['auditCategoryDeleted', () => auditCategoryDeleted('c1', USER, STORE, SNAPSHOT, IP)],
      ['auditLedgerDeleted', () => auditLedgerDeleted('l1', USER, STORE, SNAPSHOT, IP)],
    ];

    it.each(creators)('%s writes the snapshot as the new value', async (_name, call) => {
      await call();

      expect(written()).toMatchObject({ newValue: JSON.stringify(SNAPSHOT), oldValue: null });
    });

    it.each(deleters)('%s writes the snapshot as the old value', async (_name, call) => {
      await call();

      expect(written()).toMatchObject({ oldValue: JSON.stringify(SNAPSHOT), newValue: null });
    });
  });

  /**
   * These wrappers predate the change but share the file, and the positional
   * (old, new) pair is the one thing a reader cannot check by eye.
   */
  describe('the remaining wrappers', () => {
    const cases: Array<[string, () => Promise<void>, Record<string, unknown>]> = [
      [
        'auditOrderCreated',
        () => auditOrderCreated('o1', USER, STORE, SNAPSHOT, IP),
        { action: 'CREATE', entityType: 'ORDER', oldValue: null, newValue: JSON.stringify(SNAPSHOT) },
      ],
      [
        'auditOrderUpdated',
        () => auditOrderUpdated('o1', USER, STORE, { status: 'PENDING' }, { status: 'SHIPPED' }, IP),
        {
          action: 'UPDATE',
          entityType: 'ORDER',
          oldValue: JSON.stringify({ status: 'PENDING' }),
          newValue: JSON.stringify({ status: 'SHIPPED' }),
        },
      ],
      [
        'auditOrderStatusChanged',
        () => auditOrderStatusChanged('o1', USER, STORE, 'PENDING', 'SHIPPED', IP),
        { action: 'STATUS_CHANGE', entityType: 'ORDER' },
      ],
      [
        'auditPaymentVerified',
        () => auditPaymentVerified('pay1', USER, STORE, 'REJECT', 'PENDING', 'REJECTED', IP),
        {
          action: 'REJECT',
          entityType: 'PAYMENT',
          newValue: JSON.stringify({ status: 'REJECTED', action: 'REJECT' }),
        },
      ],
      [
        'auditPaymentVerified (approve)',
        () => auditPaymentVerified('pay1', USER, STORE, 'APPROVE', 'PENDING', 'PAID', IP),
        { action: 'APPROVE', newValue: JSON.stringify({ status: 'PAID', action: 'APPROVE' }) },
      ],
      [
        'auditStockAdjusted',
        () => auditStockAdjusted('p1', USER, STORE, -2, 10, 8, 'rusak', IP),
        {
          action: 'STOCK_ADJUSTMENT',
          entityType: 'PRODUCT',
          oldValue: JSON.stringify({ stock: 10 }),
          newValue: JSON.stringify({ stock: 8, adjustment: -2, reason: 'rusak' }),
        },
      ],
      [
        'auditUserCreated',
        () => auditUserCreated('u2', STORE, SNAPSHOT, IP),
        { action: 'CREATE', entityType: 'USER', oldValue: null, newValue: JSON.stringify(SNAPSHOT) },
      ],
      [
        'auditUserLogin',
        () => auditUserLogin(USER, STORE, IP, 'jest'),
        { action: 'LOGIN', entityType: 'USER', oldValue: null, newValue: null },
      ],
      [
        'auditUserLogout',
        () => auditUserLogout(USER, STORE, IP),
        { action: 'LOGOUT', entityType: 'USER', oldValue: null, newValue: null },
      ],
    ];

    it.each(cases)('%s records the expected pair', async (_name, call, expected) => {
      await call();

      expect(written()).toMatchObject(expected);
    });

    it('notes a self-registered user against the store, with no acting user', async () => {
      await auditUserCreated('u2', STORE, SNAPSHOT, IP);

      expect(written()).toMatchObject({ userId: undefined, storeId: STORE });
    });

    it('keeps the login user agent, which is the only place it is captured', async () => {
      await auditUserLogin(USER, STORE, IP, 'jest');

      expect(written()).toMatchObject({ userAgent: 'jest', ipAddress: IP });
    });
  });

  describe('getAuditLogs', () => {
    it('returns the newest entries first and caps the page', async () => {
      const rows = [{ id: 'a1' }];
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue(rows);

      await expect(getAuditLogs('PRODUCT', 'p1', 5)).resolves.toEqual(rows);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { entityType: 'PRODUCT', entityId: 'p1' },
          orderBy: { createdAt: 'desc' },
          take: 5,
        })
      );
    });

    it('answers an empty trail rather than throwing when the query fails', async () => {
      (prisma.auditLog.findMany as jest.Mock).mockRejectedValue(new Error('db down'));

      await expect(getAuditLogs('PRODUCT', 'p1')).resolves.toEqual([]);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch audit logs',
        { entityType: 'PRODUCT', entityId: 'p1' },
        expect.any(Error)
      );
    });
  });
});
