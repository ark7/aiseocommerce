import { POST } from '@/app/api/orders/route';
import { createOrder } from '@/services/transactionService';
import { requireUser } from '@/lib/auth';
import { reset as resetRateLimit } from '@/lib/rateLimit';

/**
 * An order needs an owner, so checkout requires a token. `storeId` and
 * `customerId` used to arrive in the body, which let a caller order as anyone —
 * writing into a stranger's history and spending the voucher they had claimed.
 *
 * The real error classes are kept: the route's `instanceof` checks need them.
 */
jest.mock('@/services/transactionService', () => ({
  ...jest.requireActual('@/services/transactionService'),
  createOrder: jest.fn(),
}));
jest.mock('@/lib/prisma', () => ({ prisma: {} }));
jest.mock('@/lib/auth', () => ({ requireUser: jest.fn() }));

const CUSTOMER = { id: 'pembeli-1', storeId: 'store-1', role: 'CUSTOMER' };

function orderRequest(body: unknown, token: string | null = 'token', ip = '5.6.7.8') {
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
  items: [{ productId: 'product-1', quantity: 1 }],
};

beforeEach(() => {
  jest.clearAllMocks();
  // Module state outlives a test; the counts must not.
  resetRateLimit();
  (requireUser as jest.Mock).mockResolvedValue(CUSTOMER);
  (createOrder as jest.Mock).mockResolvedValue({ id: 'order-1', totalAmount: 90_000 });
});

describe('POST /api/orders — tamu tidak bisa checkout', () => {
  test('ditolak tanpa token, tanpa memanggil createOrder', async () => {
    (requireUser as jest.Mock).mockResolvedValue(null);

    const response = await POST(orderRequest(BASE, null));

    expect(response.status).toBe(401);
    expect(createOrder).not.toHaveBeenCalled();
  });

  test('menolak juga saat tamu mengirim voucher', async () => {
    (requireUser as jest.Mock).mockResolvedValue(null);

    const response = await POST(orderRequest({ ...BASE, voucherCode: 'HEMAT10' }, null));

    expect(response.status).toBe(401);
    expect(createOrder).not.toHaveBeenCalled();
  });
});

describe('POST /api/orders — identitas dari token', () => {
  test('menagih toko dan pelanggan dari token, bukan dari body', async () => {
    await POST(orderRequest({ ...BASE, storeId: 'toko-lain', customerId: 'korban-1' }));

    const args = (createOrder as jest.Mock).mock.calls[0];

    expect(args[0]).toBe(CUSTOMER.storeId);
    // Argumen ketiga adalah pemilik order. Harus dari token.
    expect(args[2]).toBe(CUSTOMER.id);
  });

  test('meneruskan kode voucher apa adanya ke createOrder', async () => {
    await POST(orderRequest({ ...BASE, voucherCode: 'HEMAT10' }));

    expect((createOrder as jest.Mock).mock.calls[0][4]).toBe('HEMAT10');
  });

  test('meneruskan harga yang ditampilkan keranjang untuk dibandingkan', async () => {
    await POST(orderRequest({ ...BASE, expectedUnitPrices: { 'product-1': 75_000 } }));

    expect((createOrder as jest.Mock).mock.calls[0][5]).toEqual({ 'product-1': 75_000 });
  });

  test('checkout tanpa voucher tetap jalan selama bertoken', async () => {
    expect((await POST(orderRequest(BASE))).status).toBe(200);
  });
});

describe('POST /api/orders — batas laju', () => {
  test('menerima 20 lalu menolak sisanya dari alamat yang sama', async () => {
    for (let i = 0; i < 20; i += 1) {
      expect((await POST(orderRequest(BASE))).status).toBe(200);
    }

    const blocked = await POST(orderRequest(BASE));

    // Tanpa ini, satu akun bisa mengosongkan kuota harga coret dan stok dengan
    // order yang tidak pernah dibayar.
    expect(blocked.status).toBe(429);
    expect(createOrder).toHaveBeenCalledTimes(20);
  });

  test('alamat lain tidak ikut terblokir', async () => {
    for (let i = 0; i < 20; i += 1) await POST(orderRequest(BASE));

    expect((await POST(orderRequest(BASE, 'token', '9.9.9.9'))).status).toBe(200);
  });
});
