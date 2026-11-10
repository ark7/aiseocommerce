import { POST } from '@/app/api/orders/route';
import {
  ProductUnavailableError,
  ProductUnavailableReason,
  createOrder,
} from '@/services/transactionService';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { reset as resetRateLimit } from '@/lib/rateLimit';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/lib/orderNotificationService', () => ({
  dispatchOrderCreatedNotification: jest.fn(),
}));

describe('ProductUnavailableError & Checkout Error Clarity', () => {
  describe('ProductUnavailableError class', () => {
    test('formats NOT_FOUND error message correctly', () => {
      const err = new ProductUnavailableError('prod-1', 'Sepatu Lari', 'NOT_FOUND');
      expect(err.productId).toBe('prod-1');
      expect(err.productName).toBe('Sepatu Lari');
      expect(err.reason).toBe('NOT_FOUND');
      expect(err.message).toContain('Produk "Sepatu Lari" tidak ditemukan');
      expect(err.message).toContain('Product Sepatu Lari not found');
    });

    test('formats INSUFFICIENT_STOCK error message with remaining stock', () => {
      const err = new ProductUnavailableError('prod-2', 'Kemeja Putih', 'INSUFFICIENT_STOCK', 3);
      expect(err.reason).toBe('INSUFFICIENT_STOCK');
      expect(err.availableStock).toBe(3);
      expect(err.message).toContain('Stok tidak mencukupi untuk produk "Kemeja Putih"');
      expect(err.message).toContain('Insufficient stock for product Kemeja Putih');
      expect(err.message).toContain('sisa 3');
    });

    test('formats STORE_MISMATCH error message correctly', () => {
      const err = new ProductUnavailableError('prod-3', 'Kacamata Hitam', 'STORE_MISMATCH');
      expect(err.reason).toBe('STORE_MISMATCH');
      expect(err.message).toContain('berasal dari toko lain');
    });

    test('formats UNPUBLISHED error message correctly', () => {
      const err = new ProductUnavailableError('prod-4', 'Topi Pantai', 'UNPUBLISHED');
      expect(err.reason).toBe('UNPUBLISHED');
      expect(err.message).toContain('sedang tidak dipublikasikan');
    });
  });

  describe('createOrder with ProductUnavailableError', () => {
    const STORE_A = 'store-a';
    const STORE_B = 'store-b';
    const CUSTOMER = 'customer-1';

    function createMockTx(products: any[] = [], uniqueProduct: any = null) {
      return {
        product: {
          findMany: jest.fn().mockResolvedValue(products),
          findUnique: jest.fn().mockResolvedValue(uniqueProduct),
        },
        order: {
          create: jest.fn().mockResolvedValue({ id: 'order-1', orderNumber: 'ORD-1' }),
        },
        storeSettings: {
          findUnique: jest.fn().mockResolvedValue({ sandboxPaymentEnabled: false }),
        },
      };
    }

    test('throws STORE_MISMATCH when product belongs to another tenant store', async () => {
      const mockTx = createMockTx([], {
        id: 'demo-prod-008',
        name: 'Kacamata Hitam',
        storeId: STORE_B, // Belongs to STORE_B
        isPublished: true,
      });

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      await expect(
        createOrder(
          STORE_A,
          [{ productId: 'demo-prod-008', quantity: 1, name: 'Kacamata Hitam' }],
          CUSTOMER
        )
      ).rejects.toMatchObject({
        productId: 'demo-prod-008',
        productName: 'Kacamata Hitam',
        reason: 'STORE_MISMATCH',
      });
    });

    test('throws INSUFFICIENT_STOCK with availableStock when stock is less than quantity', async () => {
      const mockTx = createMockTx([
        {
          id: 'prod-stock-1',
          storeId: STORE_A,
          name: 'Jaket Denim',
          sellingPrice: 150_000,
          stock: 2,
          isPreOrder: false,
          isPublished: true,
        },
      ]);

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      await expect(
        createOrder(
          STORE_A,
          [{ productId: 'prod-stock-1', quantity: 5, name: 'Jaket Denim' }],
          CUSTOMER
        )
      ).rejects.toMatchObject({
        productId: 'prod-stock-1',
        productName: 'Jaket Denim',
        reason: 'INSUFFICIENT_STOCK',
        availableStock: 2,
      });
    });

    test('throws UNPUBLISHED when product exists in store but is unpublished', async () => {
      const mockTx = createMockTx([
        {
          id: 'prod-draft-1',
          storeId: STORE_A,
          name: 'Sneakers Edisi Terbatas',
          sellingPrice: 500_000,
          stock: 10,
          isPreOrder: false,
          isPublished: false,
        },
      ]);

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      await expect(
        createOrder(
          STORE_A,
          [{ productId: 'prod-draft-1', quantity: 1 }],
          CUSTOMER
        )
      ).rejects.toMatchObject({
        productId: 'prod-draft-1',
        productName: 'Sneakers Edisi Terbatas',
        reason: 'UNPUBLISHED',
      });
    });
  });

  describe('POST /api/orders error response handling', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      resetRateLimit();
      (requireUser as jest.Mock).mockResolvedValue({
        id: 'cust-1',
        storeId: 'store-1',
        role: 'CUSTOMER',
      });
    });

    test('returns 409 with structured PRODUCT_UNAVAILABLE payload', async () => {
      const mockTx = {
        product: {
          findMany: jest.fn().mockResolvedValue([]),
          findUnique: jest.fn().mockResolvedValue({
            id: 'demo-prod-008',
            name: 'Kacamata Hitam',
            storeId: 'other-store',
            isPublished: true,
          }),
        },
        order: {
          create: jest.fn().mockResolvedValue({ id: 'order-1', orderNumber: 'ORD-1' }),
        },
        storeSettings: {
          findUnique: jest.fn().mockResolvedValue({ sandboxPaymentEnabled: false }),
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const request = new Request('http://localhost/api/orders', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer token',
        },
        body: JSON.stringify({
          items: [{ productId: 'demo-prod-008', quantity: 1, name: 'Kacamata Hitam' }],
        }),
      });

      const res = await POST(request);
      expect(res.status).toBe(409);

      const json = await res.json();
      expect(json.code).toBe('PRODUCT_UNAVAILABLE');
      expect(json.productId).toBe('demo-prod-008');
      expect(json.productName).toBe('Kacamata Hitam');
      expect(json.reason).toBe('STORE_MISMATCH');
      expect(json.error).toContain('Kacamata Hitam');
    });
  });
});
