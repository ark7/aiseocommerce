import {
  formatTierRangeLabel,
  getBatchPriceRange,
  getCatalogDisplayPricing,
  resolveBatchUnitPrice,
  type PriceTierInput,
} from '@/lib/pricing';
import {
  MinOrderQuantityError,
  PriceChangedError,
  createOrder,
} from '@/services/transactionService';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: { $transaction: jest.fn() },
}));

const STORE = 'store-batch-1';
const CUSTOMER = 'cust-batch-1';

const EKONOMIS_TIERS: PriceTierInput[] = [
  { minQty: 1, maxQty: 10, unitPrice: 5250 },
  { minQty: 11, maxQty: 20, unitPrice: 4750 },
  { minQty: 21, maxQty: 30, unitPrice: 4250 },
  { minQty: 31, maxQty: 40, unitPrice: 3750 },
  { minQty: 41, maxQty: 49, unitPrice: 3250 },
  { minQty: 50, maxQty: 99, unitPrice: 2750 },
  { minQty: 100, maxQty: 499, unitPrice: 2250 },
  { minQty: 500, maxQty: 999, unitPrice: 2000 },
  { minQty: 1000, maxQty: null, unitPrice: 1800 },
];

const PREMIUM_TIERS: PriceTierInput[] = [
  { minQty: 11, maxQty: 20, unitPrice: 6000 },
  { minQty: 21, maxQty: 30, unitPrice: 5000 },
  { minQty: 31, maxQty: 40, unitPrice: 4500 },
  { minQty: 41, maxQty: 49, unitPrice: 4000 },
  { minQty: 50, maxQty: 99, unitPrice: 3500 },
  { minQty: 100, maxQty: 499, unitPrice: 3000 },
  { minQty: 500, maxQty: 999, unitPrice: 2750 },
  { minQty: 1000, maxQty: null, unitPrice: 2550 },
];

function makeBatchProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prod-idcard',
    storeId: STORE,
    name: 'Cetak ID Card PVC Custom',
    sellingPrice: 1800,
    discountPrice: null,
    saleStartsAt: null,
    saleEndsAt: null,
    saleQuota: null,
    saleSold: 0,
    stock: 10000,
    isPreOrder: false,
    isPublished: true,
    hasBatchPricing: true,
    minOrderQty: 1,
    priceTiers: [],
    variants: [
      {
        id: 'var-eco',
        name: 'Ekonomis (Pigmen)',
        optionType: 'CUSTOM',
        optionValue: 'Ekonomis (Pigmen)',
        sku: 'ID-ECO',
        price: 5250,
        stock: 5000,
        minOrderQty: 1,
        priceTiers: EKONOMIS_TIERS,
      },
      {
        id: 'var-prem',
        name: 'Premium (Laser)',
        optionType: 'CUSTOM',
        optionValue: 'Premium (Laser)',
        sku: 'ID-PREM',
        price: 6000,
        stock: 5000,
        minOrderQty: 11,
        priceTiers: PREMIUM_TIERS,
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
      create: jest.fn().mockResolvedValue({ id: 'order-batch-1', orderNumber: 'ORD-BATCH-1' }),
      update: jest.fn().mockImplementation(({ data }) => ({ id: 'order-batch-1', ...data })),
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

describe('Batch / Tiered Pricing Matrix Engine & Order Checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Pure Helpers (lib/pricing)', () => {
    it('formats bounded and unbounded quantity tier labels cleanly', () => {
      expect(formatTierRangeLabel(1, 10)).toBe('1 – 10 pcs');
      expect(formatTierRangeLabel(500, 999)).toBe('500 – 999 pcs');
      expect(formatTierRangeLabel(1000, null)).toBe('≥ 1.000 pcs');
      expect(formatTierRangeLabel(25, 25)).toBe('25 pcs');
    });

    it('resolves exact prices across all 9 Ekonomis tiers including boundaries and >= 1.000', () => {
      expect(resolveBatchUnitPrice(5250, EKONOMIS_TIERS, 1).unitPrice).toBe(5250);
      expect(resolveBatchUnitPrice(5250, EKONOMIS_TIERS, 10).unitPrice).toBe(5250);
      expect(resolveBatchUnitPrice(5250, EKONOMIS_TIERS, 11).unitPrice).toBe(4750);
      expect(resolveBatchUnitPrice(5250, EKONOMIS_TIERS, 20).unitPrice).toBe(4750);
      expect(resolveBatchUnitPrice(5250, EKONOMIS_TIERS, 30).unitPrice).toBe(4250);
      expect(resolveBatchUnitPrice(5250, EKONOMIS_TIERS, 31).unitPrice).toBe(3750);
      expect(resolveBatchUnitPrice(5250, EKONOMIS_TIERS, 41).unitPrice).toBe(3250);
      expect(resolveBatchUnitPrice(5250, EKONOMIS_TIERS, 50).unitPrice).toBe(2750);
      expect(resolveBatchUnitPrice(5250, EKONOMIS_TIERS, 100).unitPrice).toBe(2250);
      expect(resolveBatchUnitPrice(5250, EKONOMIS_TIERS, 999).unitPrice).toBe(2000);
      expect(resolveBatchUnitPrice(5250, EKONOMIS_TIERS, 1000).unitPrice).toBe(1800);
      expect(resolveBatchUnitPrice(5250, EKONOMIS_TIERS, 2500).unitPrice).toBe(1800);
    });

    it('flags quantities below MOQ when variant starts at 11 pcs (Premium Laser)', () => {
      const below = resolveBatchUnitPrice(6000, PREMIUM_TIERS, 10, 1);
      expect(below.isBelowMinimum).toBe(true);
      expect(below.effectiveMinOrderQty).toBe(11);

      const valid = resolveBatchUnitPrice(6000, PREMIUM_TIERS, 11, 1);
      expect(valid.isBelowMinimum).toBe(false);
      expect(valid.unitPrice).toBe(6000);
      expect(valid.nextTier).toEqual({
        minQty: 21,
        unitPrice: 5000,
        neededQty: 10,
      });
    });

    it('computes price range across single and multi-variant tiers for catalog cards', () => {
      const range = getBatchPriceRange([...EKONOMIS_TIERS, ...PREMIUM_TIERS]);
      expect(range).toEqual({ minPrice: 1800, maxPrice: 6000 });

      const catalogDisplay = getCatalogDisplayPricing(makeBatchProduct());
      expect(catalogDisplay).toEqual({
        isBatch: true,
        onSale: false,
        effectivePrice: 1800,
        maxPrice: 6000,
      });
    });
  });

  describe('Server-Side createOrder() Integration', () => {
    it('prices separate Ekonomis and Premium variant lines independently at their own tier rates', async () => {
      const prod = makeBatchProduct();
      const tx = makeTx([prod]);

      const result = await createOrder(
        STORE,
        [
          { productId: prod.id, variantId: 'var-eco', quantity: 20 },
          { productId: prod.id, variantId: 'var-prem', quantity: 20 },
        ],
        CUSTOMER,
        undefined,
        undefined,
        {
          [`${prod.id}::var-eco`]: 4750,
          [`${prod.id}::var-prem`]: 6000,
        }
      );

      expect(tx.orderItem.create).toHaveBeenCalledTimes(2);
      expect(tx.orderItem.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({
            variantId: 'var-eco',
            quantity: 20,
            unitPrice: 4750,
            totalPrice: 20 * 4750,
            saleQuotaUsed: false,
          }),
        })
      );
      expect(tx.orderItem.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: expect.objectContaining({
            variantId: 'var-prem',
            quantity: 20,
            unitPrice: 6000,
            totalPrice: 20 * 6000,
            saleQuotaUsed: false,
          }),
        })
      );
      expect(result.subtotal).toBe(20 * 4750 + 20 * 6000);
    });

    it('rejects checkout with MinOrderQuantityError when quantity is below variant MOQ', async () => {
      const prod = makeBatchProduct();
      makeTx([prod]);

      await expect(
        createOrder(
          STORE,
          [{ productId: prod.id, variantId: 'var-prem', quantity: 5 }],
          CUSTOMER
        )
      ).rejects.toThrow(MinOrderQuantityError);
    });

    it('throws PriceChangedError if buyer sends manipulated expected unit price', async () => {
      const prod = makeBatchProduct();
      makeTx([prod]);

      await expect(
        createOrder(
          STORE,
          [{ productId: prod.id, variantId: 'var-eco', quantity: 50 }],
          CUSTOMER,
          undefined,
          undefined,
          { [`${prod.id}::var-eco`]: 1800 }
        )
      ).rejects.toThrow(PriceChangedError);
    });

    it('supports product-level priceTiers when batch-priced product has no variants', async () => {
      const singleBatchProd = makeBatchProduct({
        id: 'prod-single-batch',
        variants: [],
        minOrderQty: 5,
        priceTiers: [
          { minQty: 5, maxQty: 49, unitPrice: 10000 },
          { minQty: 50, maxQty: null, unitPrice: 8000 },
        ],
      });
      const tx = makeTx([singleBatchProd]);

      const res = await createOrder(
        STORE,
        [{ productId: singleBatchProd.id, quantity: 60 }],
        CUSTOMER,
        undefined,
        undefined,
        { [singleBatchProd.id]: 8000 }
      );

      expect(tx.orderItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            unitPrice: 8000,
            totalPrice: 480000,
          }),
        })
      );
      expect(res.subtotal).toBe(480000);
    });
  });
});
