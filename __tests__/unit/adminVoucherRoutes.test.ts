import { POST as createVoucher } from '@/app/api/admin/vouchers/route';
import { DELETE as deleteVoucher, PATCH as patchVoucher } from '@/app/api/admin/vouchers/[id]/route';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    voucher: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));
jest.mock('@/lib/auth', () => ({ requireUser: jest.fn() }));
jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const ADMIN = { id: 'user-1', storeId: 'store-1', role: 'ADMIN' };

const PARAMS = { params: { id: 'voucher-1' } };

function jsonRequest(body: unknown, token: string | null = 'token') {
  return new Request('http://localhost/api/admin/vouchers', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  code: 'hemat10',
  name: 'Diskon 10%',
  type: 'PERCENT',
  value: 10,
};

beforeEach(() => {
  jest.clearAllMocks();
  (requireUser as jest.Mock).mockResolvedValue(ADMIN);
  (prisma.voucher.findMany as jest.Mock).mockResolvedValue([]);
  (prisma.voucher.create as jest.Mock).mockImplementation(({ data }) => ({ id: 'v', ...data }));
  (prisma.voucher.update as jest.Mock).mockImplementation(({ data }) => ({ id: 'v', ...data }));
  (prisma.voucher.delete as jest.Mock).mockResolvedValue({});
});

describe('POST /api/admin/vouchers', () => {
  test('menyimpan kode dalam huruf besar', async () => {
    await createVoucher(jsonRequest(VALID_BODY));

    expect((prisma.voucher.create as jest.Mock).mock.calls[0][0].data.code).toBe('HEMAT10');
  });

  test('memakai storeId dari token, bukan dari body', async () => {
    await createVoucher(jsonRequest({ ...VALID_BODY, storeId: 'toko-orang-lain' }));

    expect((prisma.voucher.create as jest.Mock).mock.calls[0][0].data.storeId).toBe(ADMIN.storeId);
  });

  test('menolak persen di atas 100 sebagai salah ketik', async () => {
    const response = await createVoucher(jsonRequest({ ...VALID_BODY, value: 150 }));

    expect(response.status).toBe(400);
    expect(prisma.voucher.create).not.toHaveBeenCalled();
  });

  test('menolak jendela yang berakhir sebelum mulai', async () => {
    const response = await createVoucher(
      jsonRequest({
        ...VALID_BODY,
        startsAt: '2026-11-01T00:00:00.000Z',
        endsAt: '2026-10-01T00:00:00.000Z',
      })
    );

    expect(response.status).toBe(400);
    expect(prisma.voucher.create).not.toHaveBeenCalled();
  });

  test('menerjemahkan kode yang sudah dipakai jadi 400, bukan 500', async () => {
    (prisma.voucher.create as jest.Mock).mockRejectedValue({ code: 'P2002' });

    const response = await createVoucher(jsonRequest(VALID_BODY));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/sudah dipakai/i);
  });

  test('menolak permintaan tanpa token', async () => {
    (requireUser as jest.Mock).mockResolvedValue(null);

    expect((await createVoucher(jsonRequest(VALID_BODY, null))).status).toBe(401);
    expect(prisma.voucher.create).not.toHaveBeenCalled();
  });

  test('menolak pelanggan', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ ...ADMIN, role: 'CUSTOMER' });

    expect((await createVoucher(jsonRequest(VALID_BODY))).status).toBe(403);
  });
});

describe('PATCH /api/admin/vouchers/[id]', () => {
  test('menolak voucher milik toko lain', async () => {
    (prisma.voucher.findUnique as jest.Mock).mockResolvedValue({
      id: 'voucher-1',
      storeId: 'store-lain',
    });

    const response = await patchVoucher(jsonRequest(VALID_BODY), PARAMS);

    expect(response.status).toBe(403);
    expect(prisma.voucher.update).not.toHaveBeenCalled();
  });

  test('menyempitkan penulisan ke toko pemanggil juga', async () => {
    (prisma.voucher.findUnique as jest.Mock).mockResolvedValue({
      id: 'voucher-1',
      storeId: ADMIN.storeId,
    });

    await patchVoucher(jsonRequest(VALID_BODY), PARAMS);

    expect((prisma.voucher.update as jest.Mock).mock.calls[0][0].where.storeId).toBe(ADMIN.storeId);
  });
});

describe('DELETE /api/admin/vouchers/[id]', () => {
  test('menolak menghapus voucher yang sudah dipakai di pesanan', async () => {
    (prisma.voucher.findUnique as jest.Mock).mockResolvedValue({
      id: 'voucher-1',
      storeId: ADMIN.storeId,
      used: 3,
    });

    const response = await deleteVoucher(jsonRequest({}), PARAMS);

    // Menghapusnya akan membawa serta baris klaim, meninggalkan Order.discount
    // tanpa apa pun yang menjelaskan asalnya.
    expect(response.status).toBe(409);
    expect(prisma.voucher.delete).not.toHaveBeenCalled();
  });

  test('menghapus voucher yang belum pernah dipakai', async () => {
    (prisma.voucher.findUnique as jest.Mock).mockResolvedValue({
      id: 'voucher-1',
      storeId: ADMIN.storeId,
      used: 0,
    });

    const response = await deleteVoucher(jsonRequest({}), PARAMS);

    expect(response.status).toBe(200);
    expect(prisma.voucher.delete).toHaveBeenCalledWith({
      where: { id: 'voucher-1', storeId: ADMIN.storeId },
    });
  });

  test('menolak voucher milik toko lain', async () => {
    (prisma.voucher.findUnique as jest.Mock).mockResolvedValue({
      id: 'voucher-1',
      storeId: 'store-lain',
      used: 0,
    });

    expect((await deleteVoucher(jsonRequest({}), PARAMS)).status).toBe(403);
    expect(prisma.voucher.delete).not.toHaveBeenCalled();
  });
});
