import { POST } from '@/app/api/orders/route';
import { createOrder } from '@/services/transactionService';
import { requireUser } from '@/lib/auth';

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
jest.mock('@/lib/prisma', () => ({ prisma: {} }));
jest.mock('@/lib/auth', () => ({ requireUser: jest.fn() }));

const CUSTOMER = { id: 'pembeli-1', storeId: 'store-1', role: 'CUSTOMER' };

function orderRequest(body: unknown, token: string | null = null) {
  return new Request('http://localhost/api/orders', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
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
  (requireUser as jest.Mock).mockResolvedValue(null);
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
