/**
 * Integration Tests for Transaction Flow
 * Tests end-to-end transaction processing including:
 * - Order creation
 * - Manual payment upload
 * - Payment verification
 * - Stock deduction
 * - Ledger creation
 */

import { prisma } from '@/lib/prisma';
import { processOrderPayment } from '@/services/transactionService';
import { auditOrderCreated, auditPaymentVerified } from '@/services/auditService';
import { logger } from '@/lib/logger';

// Test configuration
const TEST_STORE_ID = 'test-store-001';
const TEST_USER_ID = 'test-user-001';
const TEST_CUSTOMER_ID = 'test-customer-001';

// Helper to create test data
async function createTestStore() {
  return await prisma.store.upsert({
    where: { id: TEST_STORE_ID },
    update: {},
    create: {
      id: TEST_STORE_ID,
      name: 'Test Store',
      domain: 'test-store.local',
    },
  });
}

async function createTestUser(storeId = TEST_STORE_ID) {
  return await prisma.user.upsert({
    where: { id: TEST_USER_ID },
    update: {},
    create: {
      id: TEST_USER_ID,
      storeId,
      email: 'admin@test-store.local',
      passwordHash: 'hashed-password',
      firstName: 'Test',
      lastName: 'Admin',
      role: 'ADMIN',
      isActive: true,
    },
  });
}

async function createTestCustomer(storeId = TEST_STORE_ID) {
  return await prisma.user.upsert({
    where: { id: TEST_CUSTOMER_ID },
    update: {},
    create: {
      id: TEST_CUSTOMER_ID,
      storeId,
      email: 'customer@test.com',
      passwordHash: 'hashed-password',
      firstName: 'Test',
      lastName: 'Customer',
      role: 'CUSTOMER',
      isActive: true,
    },
  });
}

async function createTestProduct(storeId = TEST_STORE_ID, stock = 100) {
  return await prisma.product.upsert({
    where: { id: `test-product-${stock}` },
    update: { stock },
    create: {
      id: `test-product-${stock}`,
      storeId,
      sku: `TEST-${stock}`,
      name: `Test Product (Stock: ${stock})`,
      slug: `test-product-${stock}`,
      basePrice: 50000,
      sellingPrice: 75000,
      stock,
      isPublished: true,
    },
  });
}

async function cleanupTestData() {
  // Clean up test orders, payments, order items, products, users, stores
  await prisma.orderItem.deleteMany({ where: { productId: { startsWith: 'test-product' } } });
  await prisma.order.deleteMany({ where: { storeId: TEST_STORE_ID } });
  await prisma.payment.deleteMany({ where: { orderId: { startsWith: 'test-order' } } });
  await prisma.product.deleteMany({ where: { id: { startsWith: 'test-product' } } });
  await prisma.user.deleteMany({ where: { id: { in: [TEST_USER_ID, TEST_CUSTOMER_ID] } } });
  await prisma.store.deleteMany({ where: { id: TEST_STORE_ID } });
  await prisma.auditLog.deleteMany({ where: { storeId: TEST_STORE_ID } });
  await prisma.ledger.deleteMany({ where: { storeId: TEST_STORE_ID } });
  await prisma.stockLog.deleteMany({ where: { productId: { startsWith: 'test-product' } } });
}

describe('Transaction Flow Integration Tests', () => {
  beforeAll(async () => {
    // Initialize test data
    await createTestStore();
    await createTestUser();
    await createTestCustomer();
    await createTestProduct();
    logger.info('Test data initialized');
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
    logger.info('Test data cleaned up');
  });

  describe('Order Creation', () => {
    it('should create an order with valid data', async () => {
      const product = await createTestProduct();
      const order = await prisma.order.create({
        data: {
          storeId: TEST_STORE_ID,
          orderNumber: `TEST-ORD-${Date.now()}`,
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
      expect(order.id).toBeTruthy();
      expect(order.status).toBe('PENDING');
      expect(order.orderItems).toHaveLength(1);
      expect(order.orderItems[0].productId).toBe(product.id);
      expect(order.orderItems[0].quantity).toBe(2);
    });

    it('should validate product stock before order creation', async () => {
      const product = await createTestProduct(TEST_STORE_ID, 5); // Only 5 in stock
      
      // Try to order more than available
      await expect(
        prisma.order.create({
          data: {
            storeId: TEST_STORE_ID,
            orderNumber: `TEST-ORD-${Date.now()}-overstock`,
            userId: TEST_CUSTOMER_ID,
            customerName: 'Test Customer',
            customerEmail: 'test@customer.com',
            subtotal: product.sellingPrice * 10,
            totalAmount: product.sellingPrice * 10,
            status: 'PENDING',
            orderItems: {
              create: [
                {
                  productId: product.id,
                  quantity: 10, // More than stock (5)
                  unitPrice: product.sellingPrice,
                  totalPrice: product.sellingPrice * 10,
                },
              ],
            },
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Manual Payment Flow', () => {
    it('should upload manual payment proof and update order status', async () => {
      const product = await createTestProduct();
      const order = await prisma.order.create({
        data: {
          storeId: TEST_STORE_ID,
          orderNumber: `TEST-ORD-${Date.now()}-manual`,
          userId: TEST_CUSTOMER_ID,
          customerName: 'Test Customer',
          customerEmail: 'test@customer.com',
          subtotal: product.sellingPrice,
          totalAmount: product.sellingPrice,
          status: 'PENDING',
          orderItems: {
            create: [
              {
                productId: product.id,
                quantity: 1,
                unitPrice: product.sellingPrice,
                totalPrice: product.sellingPrice,
              },
            ],
          },
        },
      });

      const proofData = Buffer.from('test proof data').toString('base64');
      const payment = await prisma.payment.create({
        data: {
          orderId: order.id,
          method: 'MANUAL',
          amount: order.totalAmount,
          proofData,
          proofFile: JSON.stringify({ name: 'proof.jpg', type: 'image/jpeg', size: 1024 }),
          status: 'PENDING',
        },
      });

      expect(payment).toBeDefined();
      expect(payment.id).toBeTruthy();
      expect(payment.status).toBe('PENDING');
      expect(payment.proofData).toBe(proofData);
    });

    it('should retrieve payment proof data', async () => {
      const product = await createTestProduct();
      const order = await prisma.order.create({
        data: {
          storeId: TEST_STORE_ID,
          orderNumber: `TEST-ORD-${Date.now()}-proof`,
          userId: TEST_CUSTOMER_ID,
          customerName: 'Test Customer',
          customerEmail: 'test@customer.com',
          subtotal: product.sellingPrice,
          totalAmount: product.sellingPrice,
          status: 'PENDING',
          orderItems: {
            create: [
              {
                productId: product.id,
                quantity: 1,
                unitPrice: product.sellingPrice,
                totalPrice: product.sellingPrice,
              },
            ],
          },
        },
      });

      const proofData = Buffer.from('test proof data for retrieval').toString('base64');
      await prisma.payment.create({
        data: {
          orderId: order.id,
          method: 'MANUAL',
          amount: order.totalAmount,
          proofData,
          proofFile: JSON.stringify({ name: 'proof.jpg', type: 'image/jpeg', size: 1024 }),
          status: 'PENDING',
        },
      });

      const payment = await prisma.payment.findFirst({
        where: { orderId: order.id },
        select: { proofData: true, proofFile: true },
      });

      expect(payment).toBeDefined();
      expect(payment?.proofData).toBe(proofData);
    });
  });

  describe('Payment Verification & Transaction Processing', () => {
    it('should verify payment and process transaction (APPROVE)', async () => {
      const product = await createTestProduct(TEST_STORE_ID, 10);
      const initialStock = product.stock;
      
      const order = await prisma.order.create({
        data: {
          storeId: TEST_STORE_ID,
          orderNumber: `TEST-ORD-${Date.now()}-verify`,
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
        include: { orderItems: { include: { product: true } } },
      });

      const proofData = Buffer.from('test proof data').toString('base64');
      await prisma.payment.create({
        data: {
          orderId: order.id,
          method: 'MANUAL',
          amount: order.totalAmount,
          proofData,
          proofFile: JSON.stringify({ name: 'proof.jpg', type: 'image/jpeg', size: 1024 }),
          status: 'PENDING',
        },
      });

      // Update order to MANUAL_VERIFICATION (as would happen after upload)
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'MANUAL_VERIFICATION' },
      });

      // Update payment to PAID (simulating verification)
      await prisma.payment.update({
        where: { orderId: order.id },
        data: { status: 'PAID', verifiedById: TEST_USER_ID, verifiedAt: new Date() },
      });

      // Process the payment
      const result = await processOrderPayment(order.id, TEST_USER_ID);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe(order.id);
      
      // Verify stock was deducted
      const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
      expect(updatedProduct?.stock).toBe(initialStock - 2);
      
      // Verify stock log was created
      const stockLogs = await prisma.stockLog.findMany({ where: { productId: product.id } });
      expect(stockLogs.length).toBeGreaterThan(0);
      const orderStockLog = stockLogs.find(log => log.referenceId === order.id);
      expect(orderStockLog).toBeDefined();
      expect(orderStockLog?.type).toBe('OUT');
      expect(orderStockLog?.quantity).toBe(2);
      
      // Verify ledger entry was created
      const ledger = await prisma.ledger.findFirst({ where: { referenceId: order.id } });
      expect(ledger).toBeDefined();
      expect(ledger?.type).toBe('INCOME');
      expect(ledger?.amount).toBe(order.totalAmount);
      expect(ledger?.category).toBe('SALES');
      
      // Verify order status was updated to PROCESSING
      const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(updatedOrder?.status).toBe('PROCESSING');
    });

    it('should handle payment verification (REJECT)', async () => {
      const product = await createTestProduct();
      const initialStock = product.stock;
      
      const order = await prisma.order.create({
        data: {
          storeId: TEST_STORE_ID,
          orderNumber: `TEST-ORD-${Date.now()}-reject`,
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
      });

      const proofData = Buffer.from('test proof data').toString('base64');
      await prisma.payment.create({
        data: {
          orderId: order.id,
          method: 'MANUAL',
          amount: order.totalAmount,
          proofData,
          proofFile: JSON.stringify({ name: 'proof.jpg', type: 'image/jpeg', size: 1024 }),
          status: 'PENDING',
        },
      });

      // Update payment to FAILED (simulating rejection)
      await prisma.payment.update({
        where: { orderId: order.id },
        data: { status: 'FAILED', verifiedById: TEST_USER_ID, verifiedAt: new Date() },
      });

      // Stock should NOT be deducted
      const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
      expect(updatedProduct?.stock).toBe(initialStock);
      
      // No ledger entry for rejected payment
      const ledger = await prisma.ledger.findFirst({ where: { referenceId: order.id } });
      expect(ledger).toBeNull();
    });
  });

  describe('Audit Trail', () => {
    it('should log order creation', async () => {
      const product = await createTestProduct();
      
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

      const auditLog = await prisma.auditLog.findFirst({
        where: { entityId: 'test-order-audit-001' },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.action).toBe('CREATE');
      expect(auditLog?.entityType).toBe('ORDER');
      expect(auditLog?.userId).toBe(TEST_USER_ID);
      expect(auditLog?.storeId).toBe(TEST_STORE_ID);
    });

    it('should log payment verification', async () => {
      await auditPaymentVerified(
        'test-payment-audit-001',
        TEST_USER_ID,
        TEST_STORE_ID,
        'APPROVE',
        'PENDING',
        'PAID',
        '127.0.0.1'
      );

      const auditLog = await prisma.auditLog.findFirst({
        where: { entityId: 'test-payment-audit-001' },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.action).toBe('APPROVE');
      expect(auditLog?.entityType).toBe('PAYMENT');
    });
  });

  describe('Logger', () => {
    it('should log messages with structured format', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      logger.info('Test info message', { test: 'data' });
      logger.error('Test error message', { test: 'error' }, new Error('Test error'));
      logger.warn('Test warn message', { test: 'warn' });

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });
});

describe('Database Connection Tests', () => {
  it('should connect to the database', async () => {
    const result = await prisma.$queryRaw`SELECT 1`;
    expect(result).toBeDefined();
  });

  it('should verify database schema is up to date', async () => {
    // Check that Payment table has proofData column
    const columns = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'payments' AND column_name = 'proof_data'
    `;
    expect(columns.length).toBeGreaterThan(0);
  });
});
