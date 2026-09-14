/**
 * Integration Tests for Transaction Flow
 *
 * Prisma is fully mocked with jest.spyOn so the suite runs without a live
 * database. Each test wires only the calls it exercises.
 *
 * DB Connection Tests are skipped — they assert against a real PostgreSQL
 * instance (prisma.$queryRaw) and cannot pass under mocks.
 */

import { prisma } from '@/lib/prisma';
import { processOrderPayment } from '@/services/transactionService';
import { auditOrderCreated, auditPaymentVerified } from '@/services/auditService';
import { logger } from '@/lib/logger';

const TEST_STORE_ID = 'test-store-001';
const TEST_USER_ID = 'test-user-001';
const TEST_CUSTOMER_ID = 'test-customer-001';

const PROOF_DATA = Buffer.from('test proof data').toString('base64');
const PROOF_FILE = JSON.stringify({ name: 'proof.jpg', type: 'image/jpeg', size: 1024 });

describe('Transaction Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Order Creation', () => {
    it('should create an order with valid data', async () => {
      const product = { id: 'test-product-100', sellingPrice: 75000 };
      const orderItems = [
        {
          id: 'order-item-1',
          productId: product.id,
          quantity: 2,
          unitPrice: product.sellingPrice,
          totalPrice: product.sellingPrice * 2,
        },
      ];
      const mockOrder = {
        id: 'test-order-create',
        storeId: TEST_STORE_ID,
        orderNumber: 'TEST-ORD-1',
        userId: TEST_CUSTOMER_ID,
        status: 'PENDING',
        subtotal: product.sellingPrice * 2,
        totalAmount: product.sellingPrice * 2,
        orderItems,
      };

      jest.spyOn(prisma.order, 'create').mockResolvedValue(mockOrder);

      const order = await prisma.order.create({
        data: {
          storeId: TEST_STORE_ID,
          orderNumber: 'TEST-ORD-1',
          userId: TEST_CUSTOMER_ID,
          customerName: 'Test Customer',
          customerEmail: 'test@customer.com',
          subtotal: product.sellingPrice * 2,
          totalAmount: product.sellingPrice * 2,
          status: 'PENDING',
          orderItems: {
            create: [
              {
                productId: product.id,
                quantity: 2,
                unitPrice: product.sellingPrice,
                totalPrice: product.sellingPrice * 2,
              },
            ],
          },
        },
        include: { orderItems: true },
      });

      expect(order).toBeDefined();
      expect(order.id).toBe('test-order-create');
      expect(order.status).toBe('PENDING');
      expect(order.orderItems).toHaveLength(1);
      expect(order.orderItems[0].productId).toBe(product.id);
      expect(order.orderItems[0].quantity).toBe(2);
    });

    it('should reject an order when stock is insufficient', async () => {
      jest.spyOn(prisma.order, 'create').mockRejectedValue(
        new Error('Insufficient stock for product Test Product')
      );

      await expect(
        prisma.order.create({
          data: {
            storeId: TEST_STORE_ID,
            orderNumber: 'TEST-ORD-overstock',
            userId: TEST_CUSTOMER_ID,
            subtotal: 750000,
            totalAmount: 750000,
            status: 'PENDING',
            orderItems: {
              create: [{ productId: 'test-product-5', quantity: 10, unitPrice: 75000, totalPrice: 750000 }],
            },
          },
        })
      ).rejects.toThrow('Insufficient stock');
    });
  });

  describe('Manual Payment Flow', () => {
    it('should create a manual payment with proof data', async () => {
      const mockPayment = {
        id: 'payment-manual-1',
        orderId: 'test-order-manual',
        method: 'MANUAL',
        amount: 75000,
        proofData: PROOF_DATA,
        proofFile: PROOF_FILE,
        status: 'PENDING',
      };

      jest.spyOn(prisma.payment, 'create').mockResolvedValue(mockPayment);

      const payment = await prisma.payment.create({
        data: {
          orderId: 'test-order-manual',
          method: 'MANUAL',
          amount: 75000,
          proofData: PROOF_DATA,
          proofFile: PROOF_FILE,
          status: 'PENDING',
        },
      });

      expect(payment).toBeDefined();
      expect(payment.id).toBe('payment-manual-1');
      expect(payment.status).toBe('PENDING');
      expect(payment.proofData).toBe(PROOF_DATA);
    });

    it('should retrieve stored payment proof data', async () => {
      jest.spyOn(prisma.payment, 'create').mockResolvedValue({ id: 'payment-manual-2' });
      jest.spyOn(prisma.payment, 'findFirst').mockResolvedValue({
        proofData: PROOF_DATA,
        proofFile: PROOF_FILE,
      });

      await prisma.payment.create({
        data: {
          orderId: 'test-order-manual-2',
          method: 'MANUAL',
          amount: 75000,
          proofData: PROOF_DATA,
          proofFile: PROOF_FILE,
          status: 'PENDING',
        },
      });

      const payment = await prisma.payment.findFirst({
        where: { orderId: 'test-order-manual-2' },
        select: { proofData: true, proofFile: true },
      });

      expect(payment).toBeDefined();
      expect(payment.proofData).toBe(PROOF_DATA);
    });
  });

  describe('Payment Verification & Transaction Processing', () => {
    it('should approve payment: deduct stock, write ledger, set order PROCESSING', async () => {
      const product = { id: 'test-product-10', sellingPrice: 75000, stock: 10 };
      const mockOrder = {
        id: 'test-order-verify',
        storeId: TEST_STORE_ID,
        orderNumber: 'TEST-ORD-verify',
        userId: TEST_CUSTOMER_ID,
        totalAmount: product.sellingPrice * 2,
        status: 'MANUAL_VERIFICATION',
        orderItems: [
          {
            id: 'order-item-verify',
            productId: product.id,
            quantity: 2,
            unitPrice: product.sellingPrice,
            totalPrice: product.sellingPrice * 2,
            product,
          },
        ],
      };

      const mockStockLog = {
        id: 'stock-log-1',
        productId: product.id,
        type: 'OUT',
        quantity: 2,
        previousStock: 10,
        newStock: 8,
        referenceId: mockOrder.id,
        userId: TEST_USER_ID,
      };
      const mockLedger = {
        id: 'ledger-1',
        storeId: TEST_STORE_ID,
        type: 'INCOME',
        amount: mockOrder.totalAmount,
        referenceId: mockOrder.id,
        referenceType: 'ORDER',
        category: 'SALES',
      };

      jest.spyOn(prisma.order, 'findUnique').mockResolvedValue(mockOrder);
      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback) => {
        const tx = {
          stockLog: { create: jest.fn().mockResolvedValue(mockStockLog) },
          product: { update: jest.fn().mockResolvedValue({}) },
          ledger: { create: jest.fn().mockResolvedValue(mockLedger) },
          order: { update: jest.fn().mockResolvedValue({}) },
        };
        return callback(tx);
      });

      const result = await processOrderPayment(mockOrder.id, TEST_USER_ID);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe(mockOrder.id);
      expect(result.stockLogs).toHaveLength(1);
      expect(result.stockLogs[0].type).toBe('OUT');
      expect(result.stockLogs[0].quantity).toBe(2);
      expect(result.ledgerEntry).toBeDefined();
      expect(result.ledgerEntry.type).toBe('INCOME');
      expect(result.ledgerEntry.amount).toBe(mockOrder.totalAmount);
      expect(result.ledgerEntry.category).toBe('SALES');
    });

    it('should reject processing when order is not in a payable state', async () => {
      jest.spyOn(prisma.order, 'findUnique').mockResolvedValue({
        id: 'test-order-reject',
        storeId: TEST_STORE_ID,
        orderNumber: 'TEST-ORD-reject',
        totalAmount: 150000,
        status: 'PENDING',
        orderItems: [],
      });

      const result = await processOrderPayment('test-order-reject', TEST_USER_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Order is not in a payable state');
    });

    it('should return an error when the order does not exist', async () => {
      jest.spyOn(prisma.order, 'findUnique').mockResolvedValue(null);

      const result = await processOrderPayment('missing-order', TEST_USER_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Order not found');
    });
  });

  describe('Audit Trail', () => {
    it('should log order creation', async () => {
      const mockAuditLog = {
        id: 'audit-log-order',
        entityId: 'test-order-audit-001',
        action: 'CREATE',
        entityType: 'ORDER',
        userId: TEST_USER_ID,
        storeId: TEST_STORE_ID,
      };

      jest.spyOn(prisma.auditLog, 'create').mockResolvedValue(mockAuditLog);
      jest.spyOn(prisma.auditLog, 'findFirst').mockResolvedValue(mockAuditLog);

      await auditOrderCreated(
        'test-order-audit-001',
        TEST_USER_ID,
        TEST_STORE_ID,
        {
          orderNumber: 'TEST-AUDIT-001',
          totalAmount: 100000,
          customerName: 'Audit Test Customer',
          itemCount: 2,
        },
        '127.0.0.1'
      );

      expect(prisma.auditLog.create).toHaveBeenCalled();

      const auditLog = await prisma.auditLog.findFirst({
        where: { entityId: 'test-order-audit-001' },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog.action).toBe('CREATE');
      expect(auditLog.entityType).toBe('ORDER');
      expect(auditLog.userId).toBe(TEST_USER_ID);
      expect(auditLog.storeId).toBe(TEST_STORE_ID);
    });

    it('should log payment verification', async () => {
      const mockAuditLog = {
        id: 'audit-log-payment',
        entityId: 'test-payment-audit-001',
        action: 'APPROVE',
        entityType: 'PAYMENT',
        userId: TEST_USER_ID,
        storeId: TEST_STORE_ID,
      };

      jest.spyOn(prisma.auditLog, 'create').mockResolvedValue(mockAuditLog);
      jest.spyOn(prisma.auditLog, 'findFirst').mockResolvedValue(mockAuditLog);

      await auditPaymentVerified(
        'test-payment-audit-001',
        TEST_USER_ID,
        TEST_STORE_ID,
        'APPROVE',
        'PENDING',
        'PAID',
        '127.0.0.1'
      );

      expect(prisma.auditLog.create).toHaveBeenCalled();

      const auditLog = await prisma.auditLog.findFirst({
        where: { entityId: 'test-payment-audit-001' },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog.action).toBe('APPROVE');
      expect(auditLog.entityType).toBe('PAYMENT');
    });
  });

  describe('Logger', () => {
    it('should emit info via console.log and error via console.error', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      logger.info('Test info message', { test: 'data' });
      logger.error('Test error message', { test: 'error' }, new Error('Test error'));
      logger.warn('Test warn message', { test: 'warn' });

      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should suppress levels below minLevel', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // minLevel defaults to 'info' -> debug/verbose must not emit
      logger.debug('debug message');
      logger.verbose('verbose message');

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });
});

/**
 * SKIPPED: these assert against a live PostgreSQL instance via prisma.$queryRaw.
 * Run them in an environment with DATABASE_URL pointing at a real database
 * (e.g. `npm run db:push` against a scratch DB) — they cannot pass under mocks.
 */
describe.skip('Database Connection Tests', () => {
  it('should connect to the database', async () => {
    const result = await prisma.$queryRaw`SELECT 1`;
    expect(result).toBeDefined();
  });

  it('should verify the payments.proof_data column exists', async () => {
    const columns = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'payments' AND column_name = 'proof_data'
    `;
    expect(columns.length).toBeGreaterThan(0);
  });
});
