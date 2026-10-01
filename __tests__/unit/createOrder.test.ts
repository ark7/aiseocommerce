import { PriceChangedError, VoucherError, createOrder } from '@/services/transactionService';
import { prisma } from '@/lib/prisma';

/**
 * `createOrder` decides what the customer is actually charged. The pure rules
 * live in `lib/pricing` and `lib/voucher` and are tested on their own; what is
 * tested here is the wiring — that the rule's verdict reaches the order row,
 * and that a voucher is only ever spent in the same transaction as the order.
 */
jest.mock('@/lib/prisma', () => ({
  prisma: { $transaction: jest.fn() },
}));

const STORE = 'store-1';
const CUSTOMER = 'customer-1';

function product(overrides: Record<string, unknown> = {}) {
  return {
    id: 'product-1',
    storeId: STORE,
    name: 'Sepatu',
    sellingPrice: 100_000,
    discountPrice: null,
    saleStartsAt: null,
    saleEndsAt: null,
    saleQuota: null,
    saleSold: 0,
    stock: 20,
    ...overrides,
  };
}

function voucher(overrides: Record<string, unknown> = {}) {
  return {
    id: 'voucher-1',
    storeId: STORE,
    code: 'HEMAT10',
    type: 'PERCENT',
    value: 10,
    maxDiscount: null,
    minPurchase: null,
    startsAt: null,
    endsAt: null,
    quota: null,
    claimed: 0,
    isActive: true,
    ...overrides,
  };
}

function makeTx(products: unknown[], options: { voucher?: unknown; claim?: unknown } = {}) {
  const tx = {
    product: {
      findMany: jest.fn().mockResolvedValue(products),
      // Default: the sale quota reservation wins.
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({}),
    },
    order: {
      create: jest.fn().mockResolvedValue({ id: 'order-1', orderNumber: 'ORD-1' }),
      update: jest.fn().mockImplementation(({ data }) => ({ id: 'order-1', ...data })),
    },
    orderItem: { create: jest.fn().mockResolvedValue({}) },
    stockLog: { create: jest.fn().mockResolvedValue({}) },
    voucher: {
      findUnique: jest.fn().mockResolvedValue(options.voucher ?? null),
      update: jest.fn().mockResolvedValue({}),
    },
    voucherClaim: {
      findUnique: jest.fn().mockResolvedValue(options.claim ?? null),
      // The consume write. By default this checkout wins the claim.
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };

  (prisma.$transaction as jest.Mock).mockImplementation((callback) => callback(tx));

  return tx;
}

function orderTotals(tx: ReturnType<typeof makeTx>) {
  return (tx.order.update as jest.Mock).mock.calls[0][0].data;
}

/**
 * One `updateMany` serves two different conditional writes — the sale-quota
 * reservation and the stock decrement. These helpers pick one to lose without
 * disturbing the other, so a test can say which race it is simulating.
 */
function exhaustQuota(tx: ReturnType<typeof makeTx>) {
  tx.product.updateMany.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
    'saleSold' in data ? { count: 0 } : { count: 1 }
  );
}

function exhaustStock(tx: ReturnType<typeof makeTx>) {
  tx.product.updateMany.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
    'stock' in data ? { count: 0 } : { count: 1 }
  );
}

const ITEMS = [{ productId: 'product-1', quantity: 2 }];

describe('createOrder — harga coret', () => {
  beforeEach(() => jest.clearAllMocks());

  test('menagih harga coret yang sedang aktif', async () => {
    const tx = makeTx([product({ discountPrice: 75_000 })]);

    await createOrder(STORE, ITEMS);

    expect(tx.orderItem.create.mock.calls[0][0].data.unitPrice).toBe(75_000);
    expect(orderTotals(tx)).toMatchObject({ subtotal: 150_000, totalAmount: 150_000 });
  });

  test('kembali ke harga jual saat kuota coret tidak cukup untuk pesanan ini', async () => {
    const tx = makeTx([product({ discountPrice: 75_000, saleQuota: 3, saleSold: 2 })]);
    // Dua unit diminta, sisa kuota satu: reservasi kalah.
    exhaustQuota(tx);

    await createOrder(STORE, ITEMS);

    expect(tx.orderItem.create.mock.calls[0][0].data.unitPrice).toBe(100_000);
    expect(orderTotals(tx)).toMatchObject({ subtotal: 200_000 });
  });

  test('memesan kuota lewat predikat WHERE, bukan dari angka yang dibaca tadi', async () => {
    const tx = makeTx([product({ discountPrice: 75_000, saleQuota: 10, saleSold: 0 })]);

    await createOrder(STORE, ITEMS);

    // Kalau predikat ini hilang atau jadi `lt`, dua pembeli bisa sama-sama
    // mengambil unit diskon terakhir dan toko menjual melebihi kuotanya.
    const reservation = tx.product.updateMany.mock.calls.find(
      ([args]) => 'saleSold' in args.data
    )!;

    expect(reservation[0].where).toMatchObject({
      id: 'product-1',
      storeId: STORE,
      OR: [{ saleQuota: null }, { saleSold: { lte: 8 } }],
    });
    expect(reservation[0].data).toEqual({ saleSold: { increment: 2 } });
  });

  test('mencatat baris mana yang benar-benar memakai kuota', async () => {
    const win = makeTx([product({ discountPrice: 75_000, saleQuota: 10 })]);
    await createOrder(STORE, ITEMS);
    expect(win.orderItem.create.mock.calls[0][0].data.saleQuotaUsed).toBe(true);

    const lose = makeTx([product({ discountPrice: 75_000, saleQuota: 1 })]);
    exhaustQuota(lose);
    await createOrder(STORE, ITEMS);
    expect(lose.orderItem.create.mock.calls[0][0].data.saleQuotaUsed).toBe(false);
  });

  test('tidak menyentuh kuota sama sekali saat tidak ada harga coret', async () => {
    const tx = makeTx([product()]);

    await createOrder(STORE, ITEMS);

    // Stok tetap diperbarui; yang tidak boleh terjadi adalah penulisan saleSold.
    const touchedQuota = tx.product.updateMany.mock.calls.some(([args]) => 'saleSold' in args.data);
    expect(touchedQuota).toBe(false);
  });

  test('mencari produk di dalam toko ini saja', async () => {
    const tx = makeTx([product()]);

    await createOrder(STORE, ITEMS);

    expect(tx.product.findMany.mock.calls[0][0].where.storeId).toBe(STORE);
  });
});

describe('createOrder — harga bergeser sejak keranjang diisi', () => {
  beforeEach(() => jest.clearAllMocks());

  test('melempar PriceChangedError, bukan menagih lebih mahal', async () => {
    makeTx([product()]);

    await expect(
      createOrder(STORE, ITEMS, CUSTOMER, undefined, undefined, { 'product-1': 75_000 })
    ).rejects.toBeInstanceOf(PriceChangedError);
  });

  test('menyebut setiap produk yang berubah, bukan yang pertama saja', async () => {
    const tx = makeTx([
      product({ id: 'product-1', name: 'Sepatu' }),
      product({ id: 'product-2', name: 'Tas' }),
    ]);

    const error = await createOrder(
      STORE,
      [
        { productId: 'product-1', quantity: 1 },
        { productId: 'product-2', quantity: 1 },
      ],
      CUSTOMER,
      undefined,
      undefined,
      { 'product-1': 1, 'product-2': 1 }
    ).catch((thrown) => thrown);

    expect(error.changes).toEqual([
      { productId: 'product-1', name: 'Sepatu', shown: 1, actual: 100_000 },
      { productId: 'product-2', name: 'Tas', shown: 1, actual: 100_000 },
    ]);
    // Order ditulis lebih dulu, tapi totalnya tidak pernah diisi: melempar di
    // dalam transaksi berarti tidak ada baris yang tersisa di database.
    expect(tx.order.update).not.toHaveBeenCalled();
  });

  test('harga yang cocok tidak menghalangi pesanan', async () => {
    const tx = makeTx([product()]);

    await createOrder(STORE, ITEMS, CUSTOMER, undefined, undefined, { 'product-1': 100_000 });

    expect(orderTotals(tx)).toMatchObject({ subtotal: 200_000 });
  });
});

describe('createOrder — voucher', () => {
  beforeEach(() => jest.clearAllMocks());

  test('memotong sesuai kelayakan dan menandai klaim terpakai', async () => {
    const claim = { id: 'claim-1', usedAt: null };
    const tx = makeTx([product()], { voucher: voucher({ maxDiscount: 20_000 }), claim });

    await createOrder(STORE, ITEMS, CUSTOMER, undefined, 'HEMAT10');

    expect(orderTotals(tx)).toMatchObject({
      subtotal: 200_000,
      discount: 20_000,
      totalAmount: 180_000,
    });
    expect(tx.voucherClaim.updateMany.mock.calls[0][0].data).toMatchObject({ orderId: 'order-1' });
    expect(tx.voucher.update.mock.calls[0][0].data.used).toEqual({ increment: 1 });
  });

  test('memakai klaim lewat predikat usedAt: null', async () => {
    const tx = makeTx([product()], {
      voucher: voucher(),
      claim: { id: 'claim-1', usedAt: null },
    });

    await createOrder(STORE, ITEMS, CUSTOMER, undefined, 'HEMAT10');

    // Predikat inilah yang memutuskan siapa yang dapat klaim itu. Tanpanya,
    // dua checkout bersamaan sama-sama lolos dan satu voucher memotong dua
    // pesanan.
    expect(tx.voucherClaim.updateMany.mock.calls[0][0].where).toEqual({
      id: 'claim-1',
      usedAt: null,
    });
  });

  test('berhenti saat checkout lain keburu menghabiskan klaimnya', async () => {
    const tx = makeTx([product()], {
      voucher: voucher(),
      claim: { id: 'claim-1', usedAt: null },
    });
    tx.voucherClaim.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      createOrder(STORE, ITEMS, CUSTOMER, undefined, 'HEMAT10')
    ).rejects.toMatchObject({ reason: 'ALREADY_USED' });
  });

  test('menerima kode dalam huruf kecil dan dengan spasi', async () => {
    const tx = makeTx([product()], {
      voucher: voucher({ type: 'FIXED', value: 5_000 }),
      claim: { id: 'claim-1', usedAt: null },
    });

    await createOrder(STORE, ITEMS, CUSTOMER, undefined, ' hemat10 ');

    expect(tx.voucher.findUnique.mock.calls[0][0].where.storeId_code.code).toBe('HEMAT10');
  });

  test('menolak kode yang tidak ada di toko ini', async () => {
    makeTx([product()], { voucher: null });

    await expect(
      createOrder(STORE, ITEMS, CUSTOMER, undefined, 'TIDAKADA')
    ).rejects.toMatchObject({ name: 'VoucherError', reason: 'NOT_FOUND' });
  });

  test('menolak voucher yang belum diklaim', async () => {
    makeTx([product()], { voucher: voucher(), claim: null });

    await expect(
      createOrder(STORE, ITEMS, CUSTOMER, undefined, 'HEMAT10')
    ).rejects.toMatchObject({ reason: 'NOT_CLAIMED' });
  });

  test('menolak klaim yang sudah dipakai di pesanan lain', async () => {
    makeTx([product()], {
      voucher: voucher(),
      claim: { id: 'claim-1', usedAt: new Date('2026-09-01T00:00:00.000Z') },
    });

    await expect(
      createOrder(STORE, ITEMS, CUSTOMER, undefined, 'HEMAT10')
    ).rejects.toMatchObject({ reason: 'ALREADY_USED' });
  });

  test('menolak saat belanja di bawah minimum', async () => {
    makeTx([product()], {
      voucher: voucher({ minPurchase: 500_000 }),
      claim: { id: 'claim-1', usedAt: null },
    });

    await expect(
      createOrder(STORE, ITEMS, CUSTOMER, undefined, 'HEMAT10')
    ).rejects.toMatchObject({ reason: 'MIN_PURCHASE' });
  });

  test('tidak memotong lebih dari subtotal', async () => {
    const tx = makeTx([product({ sellingPrice: 10_000, discountPrice: null })], {
      voucher: voucher({ type: 'FIXED', value: 500_000 }),
      claim: { id: 'claim-1', usedAt: null },
    });

    await createOrder(
      STORE,
      [{ productId: 'product-1', quantity: 1 }],
      CUSTOMER,
      undefined,
      'BESAR'
    );

    expect(orderTotals(tx)).toMatchObject({ subtotal: 10_000, discount: 10_000, totalAmount: 0 });
  });

  test('tanpa kode, tidak ada baris voucher yang disentuh', async () => {
    const tx = makeTx([product()]);

    await createOrder(STORE, ITEMS, CUSTOMER);

    expect(tx.voucher.findUnique).not.toHaveBeenCalled();
    expect(tx.voucherClaim.updateMany).not.toHaveBeenCalled();
    expect(orderTotals(tx)).toMatchObject({ discount: 0 });
  });
});

describe('createOrder — pagar transaksi', () => {
  beforeEach(() => jest.clearAllMocks());

  test('menolak produk yang stoknya tidak cukup, sebelum apa pun ditulis', async () => {
    const tx = makeTx([product({ stock: 1 })]);

    await expect(createOrder(STORE, ITEMS)).rejects.toThrow(/Insufficient stock/);
    expect(tx.orderItem.create).not.toHaveBeenCalled();
  });

  test('menurunkan stok lewat predikat, bukan dari angka yang dibaca tadi', async () => {
    const tx = makeTx([product({ stock: 20 })]);

    await createOrder(STORE, ITEMS);

    const decrement = tx.product.updateMany.mock.calls.find(([args]) => 'stock' in args.data)!;
    expect(decrement[0].where).toMatchObject({ id: 'product-1', storeId: STORE, stock: { gte: 2 } });
  });

  test('berhenti saat stok keburu diambil pesanan lain', async () => {
    const tx = makeTx([product({ stock: 20 })]);
    exhaustStock(tx);

    await expect(createOrder(STORE, ITEMS)).rejects.toThrow(/Insufficient stock/);
  });

  test('melempar VoucherError dengan kalimat yang boleh dibaca pelanggan', async () => {
    makeTx([product()], { voucher: null });

    const error = await createOrder(STORE, ITEMS, CUSTOMER, undefined, 'TIDAKADA').catch(
      (thrown) => thrown
    );

    expect(error).toBeInstanceOf(VoucherError);
    expect(error.message).toBe('Kode voucher tidak ditemukan');
  });
});
