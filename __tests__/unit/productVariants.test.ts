import { createOrder, ProductUnavailableError } from '@/services/transactionService';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: { $transaction: jest.fn() },
}));

const STORE = 'store-test-123';
const CUSTOMER = 'customer-abc';

function productWithVariants(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prod-tshirt-01',
    storeId: STORE,
    name: 'Kaos Polos Cotton Combed',
    productType: 'PHYSICAL',
    sellingPrice: 75_000,
    discountPrice: null,
    saleStartsAt: null,
    saleEndsAt: null,
    saleQuota: null,
    saleSold: 0,
    stock: 50,
    isPublished: true,
    isPreOrder: false,
    variants: [
      {
        id: 'var-size-m',
        productId: 'prod-tshirt-01',
        name: 'Ukuran: M',
        optionType: 'SIZE',
        optionValue: 'M',
        sku: 'TSHIRT-M',
        price: null, // Uses product sellingPrice
        stock: 15,
      },
      {
        id: 'var-size-xl',
        productId: 'prod-tshirt-01',
        name: 'Ukuran: XL',
        optionType: 'SIZE',
        optionValue: 'XL',
        sku: 'TSHIRT-XL',
        price: 85_000, // Custom variant price override
        stock: 5,
      },
    ],
    ...overrides,
  };
}

function makeTx(products: unknown[]) {
  const tx = {
    storeSettings: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    product: {
      findMany: jest.fn().mockResolvedValue(products),
      findUnique: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({}),
    },
    productVariant: {
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    order: {
      create: jest.fn().mockResolvedValue({ id: 'order-variant-1', orderNumber: 'ORD-VAR-1' }),
      update: jest.fn().mockImplementation(({ data }) => ({ id: 'order-variant-1', ...data })),
    },
    orderItem: { create: jest.fn().mockResolvedValue({}) },
    stockLog: { create: jest.fn().mockResolvedValue({}) },
    voucher: {
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
    },
    voucherClaim: {
      findUnique: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };

  (prisma.$transaction as jest.Mock).mockImplementation((callback) => callback(tx));

  return tx;
}

describe('Product Variants & Stock Management (Unit Tests)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Order Creation with Product Variants', () => {
    it('membuat pesanan dengan varian valid dan memotong stok varian secara atomik', async () => {
      const prod = productWithVariants();
      const tx = makeTx([prod]);

      const items = [
        {
          productId: 'prod-tshirt-01',
          variantId: 'var-size-m',
          variation: 'Ukuran: M',
          quantity: 2,
        },
      ];

      const result = await createOrder(STORE, items, CUSTOMER);

      expect(result).toBeDefined();
      expect(tx.productVariant.update).toHaveBeenCalledWith({
        where: { id: 'var-size-m' },
        data: { stock: { decrement: 2 } },
      });

      expect(tx.orderItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          productId: 'prod-tshirt-01',
          variantId: 'var-size-m',
          variation: 'Ukuran: M',
          quantity: 2,
          unitPrice: 75_000,
          totalPrice: 150_000,
        }),
      });
    });

    it('mendukung penyesuaian harga khusus pada varian tertentu', async () => {
      const prod = productWithVariants();
      const tx = makeTx([prod]);

      const items = [
        {
          productId: 'prod-tshirt-01',
          variantId: 'var-size-xl',
          variation: 'Ukuran: XL',
          quantity: 1,
        },
      ];

      const result = await createOrder(STORE, items, CUSTOMER);

      expect(result).toBeDefined();
      expect(tx.orderItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          variantId: 'var-size-xl',
          unitPrice: 85_000,
          totalPrice: 85_000,
        }),
      });
    });

    it('melempar ProductUnavailableError INSUFFICIENT_STOCK ketika kuantitas melebihi stok varian', async () => {
      const prod = productWithVariants();
      makeTx([prod]);

      // var-size-xl hanya punya stok 5, request 10
      const items = [
        {
          productId: 'prod-tshirt-01',
          variantId: 'var-size-xl',
          quantity: 10,
        },
      ];

      await expect(createOrder(STORE, items, CUSTOMER)).rejects.toThrow(ProductUnavailableError);

      try {
        await createOrder(STORE, items, CUSTOMER);
      } catch (err: any) {
        expect(err.reason).toBe('INSUFFICIENT_STOCK');
        expect(err.availableStock).toBe(5);
      }
    });

    it('melempar ProductUnavailableError NOT_FOUND jika variantId tidak ada dalam produk', async () => {
      const prod = productWithVariants();
      makeTx([prod]);

      const items = [
        {
          productId: 'prod-tshirt-01',
          variantId: 'var-non-existent-id',
          quantity: 1,
        },
      ];

      await expect(createOrder(STORE, items, CUSTOMER)).rejects.toThrow(ProductUnavailableError);

      try {
        await createOrder(STORE, items, CUSTOMER);
      } catch (err: any) {
        expect(err.reason).toBe('NOT_FOUND');
      }
    });
  });
});
