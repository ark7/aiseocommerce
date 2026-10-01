import { POST } from '@/app/api/orders/route';
import { createOrder } from '@/services/transactionService';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { reset as resetRateLimit } from '@/lib/rateLimit';

/**
 * A voucher is a right that belongs to an account. `customerId` arrives in the
 * request body, so without a token check a caller could name someone else and
 * spend the voucher that person claimed.
 *
 * The real error classes are kept — the route's `instanceof` checks need them.
 */
jest.mock('@/services/transactionService', () => ({
  ...jest.requireActual('@/services/transactionService'),
  createOrder: jest.fn(),
}));
jest.mock('@/lib/prisma', () => ({
  prisma: { user: { findFirst: jest.fn() } },
}));
jest.mock('@/lib/auth', () => ({ requireUser: jest.fn() }));

const CUSTOMER = { id: 'pembeli-1', storeId: 'store-1', role: 'CUSTOMER' };

function orderRequest(body: unknown, token: string | null = null, ip = '5.6.7.8') {
  return new Request('http://localhost/api/orders', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

const BASE = {
  storeId: 'store-1',
  items: [{ productId: 'product-1', quantity: 1 }],
};

beforeEach(() => {
  jest.clearAllMocks();
  // Module state outlives a test; the counts must not.
  resetRateLimit();
  (requireUser as jest.Mock).mockResolvedValue(null);
  (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'pembeli-1' });
  (createOrder as jest.Mock).mockResolvedValue({ id: 'order-1', totalAmount: 90_000 });
});

describe('POST /api/orders — siapa yang boleh memakai voucher', () => {
  test('menolak voucher tanpa token, tanpa memanggil createOrder', async () => {
    const response = await POST(orderRequest({ ...BASE, voucherCode: 'HEMAT10' }));

    expect(response.status).toBe(401);
    expect((await response.json()).reason).toBe('NOT_CLAIMED');
    expect(createOrder).not.toHaveBeenCalled();
  });

  test('tidak bisa memakai customerId orang lain untuk menghabiskan vouchernya', async () => {
    (requireUser as jest.Mock).mockResolvedValue(CUSTOMER);

    await POST(orderRequest({ ...BASE, customerId: 'korban-1', voucherCode: 'HEMAT10' }));

    // Argumen ketiga adalah pemilik klaim yang akan dicari. Harus dari token.
    expect((createOrder as jest.Mock).mock.calls[0][2]).toBe(CUSTOMER.id);
  });

  test('meneruskan kode voucher apa adanya ke createOrder', async () => {
    (requireUser as jest.Mock).mockResolvedValue(CUSTOMER);

    await POST(orderRequest({ ...BASE, voucherCode: 'HEMAT10' }));

    expect((createOrder as jest.Mock).mock.calls[0][4]).toBe('HEMAT10');
  });

  test('checkout tamu tanpa voucher tetap terbuka', async () => {
    const response = await POST(orderRequest({ ...BASE, customerId: 'tamu-1' }));

    expect(response.status).toBe(200);
    expect(requireUser).not.toHaveBeenCalled();
    expect((createOrder as jest.Mock).mock.calls[0][2]).toBe('tamu-1');
  });
});

describe('POST /api/orders — customerId yang tidak dikenal', () => {
  test('menolak id yang bukan pelanggan toko ini', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    const response = await POST(orderRequest({ ...BASE, customerId: 'orang-lain' }));

    expect(response.status).toBe(400);
    expect(createOrder).not.toHaveBeenCalled();
  });

  test('mencari pelanggannya di dalam toko yang sama', async () => {
    await POST(orderRequest({ ...BASE, customerId: 'tamu-1' }));

    expect((prisma.user.findFirst as jest.Mock).mock.calls[0][0].where).toEqual({
      id: 'tamu-1',
      storeId: 'store-1',
    });
  });

  test('order tanpa customerId tidak mencari siapa pun', async () => {
    await POST(orderRequest(BASE));

    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });
});

describe('POST /api/orders — batas laju', () => {
  test('menerima 20 lalu menolak sisanya dari alamat yang sama', async () => {
    for (let i = 0; i < 20; i += 1) {
      expect((await POST(orderRequest(BASE))).status).toBe(200);
    }

    const blocked = await POST(orderRequest(BASE));

    // Tanpa ini, pemanggil anonim bisa mengosongkan kuota harga coret dan stok
    // dengan order yang tidak pernah dibayar.
    expect(blocked.status).toBe(429);
    expect(createOrder).toHaveBeenCalledTimes(20);
  });

  test('alamat lain tidak ikut terblokir', async () => {
    for (let i = 0; i < 20; i += 1) await POST(orderRequest(BASE));

    expect((await POST(orderRequest(BASE, null, '9.9.9.9'))).status).toBe(200);
  });
});
