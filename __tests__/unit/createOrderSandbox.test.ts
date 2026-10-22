import { createOrder } from '@/services/transactionService';
import { prisma } from '@/lib/prisma';
import { MixedCartSandboxError, SandboxModeDisabledError } from '@/lib/paymentGateway';

jest.mock('@/lib/prisma', () => ({
  prisma: { $transaction: jest.fn() },
}));

const STORE = 'store-test-1';
const CUSTOMER = 'customer-test-1';

function product(overrides: Record<string, unknown> = {}) {
  return {
    id: 'product-1',
    storeId: STORE,
    name: 'Produk Standar',
    sellingPrice: 100_000,
    discountPrice: null,
    saleStartsAt: null,
    saleEndsAt: null,
    saleQuota: null,
    saleSold: 0,
    stock: 20,
    sandboxEnabled: false,
    isPreOrder: false,
    ...overrides,
  };
}

function makeTx(
  products: unknown[],
  storeSettings: { sandboxPaymentEnabled?: boolean } | null = { sandboxPaymentEnabled: true }
) {
  const tx = {
    product: {
      findMany: jest.fn().mockResolvedValue(products),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({}),
    },
    storeSettings: {
      findUnique: jest.fn().mockResolvedValue(storeSettings),
    },
    order: {
      create: jest.fn().mockResolvedValue({ id: 'order-1', orderNumber: 'ORD-1' }),
      update: jest.fn().mockImplementation(({ data }) => ({ id: 'order-1', ...data })),
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

describe('createOrder — Sandbox Mode Behavior', () => {
  const originalEnv = process.env.ENABLE_PAYMENT_SANDBOX;

  afterEach(() => {
    process.env.ENABLE_PAYMENT_SANDBOX = originalEnv;
  });

  it('marks order with isSandbox=false when purchasing regular products', async () => {
    const regularProd = product({ id: 'p1', sandboxEnabled: false });
    const tx = makeTx([regularProd]);

    await createOrder(STORE, [{ productId: 'p1', quantity: 1 }], CUSTOMER);

    expect(tx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          storeId: STORE,
          isSandbox: false,
        }),
      })
    );
  });

  it('marks order with isSandbox=true when purchasing sandbox-enabled products with sandbox mode on', async () => {
    const sandboxProd = product({ id: 'p-sandbox', name: 'Produk Uji Coba', sandboxEnabled: true });
    const tx = makeTx([sandboxProd], { sandboxPaymentEnabled: true });

    await createOrder(STORE, [{ productId: 'p-sandbox', quantity: 1 }], CUSTOMER);

    expect(tx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          storeId: STORE,
          isSandbox: true,
        }),
      })
    );
  });

  it('throws SandboxModeDisabledError when purchasing sandbox products but sandbox mode is disabled', async () => {
    delete process.env.ENABLE_PAYMENT_SANDBOX;
    const sandboxProd = product({ id: 'p-sandbox', name: 'Produk Uji Coba', sandboxEnabled: true });
    makeTx([sandboxProd], { sandboxPaymentEnabled: false });

    await expect(
      createOrder(STORE, [{ productId: 'p-sandbox', quantity: 1 }], CUSTOMER)
    ).rejects.toThrow(SandboxModeDisabledError);
  });

  it('throws MixedCartSandboxError when cart mixes sandbox and non-sandbox products', async () => {
    const regularProd = product({ id: 'p1', sandboxEnabled: false });
    const sandboxProd = product({ id: 'p2', sandboxEnabled: true });
    makeTx([regularProd, sandboxProd], { sandboxPaymentEnabled: true });

    await expect(
      createOrder(
        STORE,
        [
          { productId: 'p1', quantity: 1 },
          { productId: 'p2', quantity: 1 },
        ],
        CUSTOMER
      )
    ).rejects.toThrow(MixedCartSandboxError);
  });
});

