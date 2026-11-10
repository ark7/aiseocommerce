import { recordOrderIncome, getFinanceSummary } from '@/services/transactionService';
import { updateOrderStatus } from '@/services/orderStatusService';
import { prisma } from '@/lib/prisma';
import { LedgerType } from '@prisma/client';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    ledger: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    orderItem: {
      findMany: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    stockLog: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}));

describe('Finance & Ledger Sandbox Isolation', () => {
  const STORE_ID = 'store-test-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recordOrderIncome', () => {
    it('creates regular SALES income ledger when order is not sandbox', async () => {
      (prisma.ledger.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.ledger.create as jest.Mock).mockResolvedValue({ id: 'ledger-1' });

      await recordOrderIncome(prisma, {
        id: 'order-1',
        storeId: STORE_ID,
        orderNumber: 'ORD-1001',
        totalAmount: 150000,
        isSandbox: false,
      });

      expect(prisma.ledger.create).toHaveBeenCalledWith({
        data: {
          storeId: STORE_ID,
          type: LedgerType.INCOME,
          amount: 150000,
          description: 'Order ORD-1001',
          referenceId: 'order-1',
          referenceType: 'ORDER',
          category: 'SALES',
          isSandbox: false,
        },
      });
    });

    it('creates SANDBOX_SALES income ledger with isSandbox=true when order is sandbox', async () => {
      (prisma.ledger.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.ledger.create as jest.Mock).mockResolvedValue({ id: 'ledger-2' });

      await recordOrderIncome(prisma, {
        id: 'order-sandbox-1',
        storeId: STORE_ID,
        orderNumber: 'ORD-SANDBOX-99',
        totalAmount: 250000,
        isSandbox: true,
      });

      expect(prisma.ledger.create).toHaveBeenCalledWith({
        data: {
          storeId: STORE_ID,
          type: LedgerType.INCOME,
          amount: 250000,
          description: '[SANDBOX] Order ORD-SANDBOX-99',
          referenceId: 'order-sandbox-1',
          referenceType: 'ORDER',
          category: 'SANDBOX_SALES',
          isSandbox: true,
        },
      });
    });
  });

  describe('getFinanceSummary isolation', () => {
    it('filters out sandbox ledger records by default so real revenue is not polluted', async () => {
      const mockLedgers = [
        { type: LedgerType.INCOME, amount: 500000, isSandbox: false },
        { type: LedgerType.EXPENSE, amount: -100000, isSandbox: false },
      ];
      (prisma.ledger.findMany as jest.Mock).mockResolvedValue(mockLedgers);

      const summary = await getFinanceSummary(STORE_ID);

      expect(prisma.ledger.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            storeId: STORE_ID,
            isSandbox: false,
          }),
        })
      );

      expect(summary.totalIncome).toBe(500000);
      expect(summary.totalExpense).toBe(100000);
      expect(summary.profitLoss).toBe(400000);
    });

    it('includes sandbox records only when explicitly requested with includeSandbox: true', async () => {
      (prisma.ledger.findMany as jest.Mock).mockResolvedValue([]);

      await getFinanceSummary(STORE_ID, undefined, undefined, { includeSandbox: true });

      expect(prisma.ledger.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            isSandbox: false,
          }),
        })
      );
    });
  });

  describe('updateOrderStatus sandbox refund handling', () => {
    it('creates refund ledger with isSandbox: true when a sandbox order is refunded', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'order-sb-refund',
        storeId: STORE_ID,
        status: 'PAID',
        totalAmount: 200000,
        orderNumber: 'ORD-SB-1',
        isSandbox: true,
      });
      (prisma.order.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.ledger.findFirst as jest.Mock).mockResolvedValue({ id: 'income-ledger-1' });
      (prisma.orderItem.findMany as jest.Mock).mockResolvedValue([]);

      const result = await updateOrderStatus({
        orderId: 'order-sb-refund',
        storeId: STORE_ID,
        userId: 'admin-1',
        newStatus: 'REFUNDED',
      });

      expect(result.success).toBe(true);
      expect(prisma.ledger.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          storeId: STORE_ID,
          type: LedgerType.REFUND,
          amount: 200000,
          description: '[SANDBOX] Order ORD-SB-1 REFUNDED',
          category: 'SANDBOX_REFUND',
          isSandbox: true,
        }),
      });
    });
  });
});

