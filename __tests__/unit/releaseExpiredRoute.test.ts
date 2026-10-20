import { GET, POST } from '@/app/api/cron/release-expired/route';
import { releaseExpiredReservations } from '@/services/transactionService';

/**
 * The sweep cancels orders. It is called by infrastructure with a shared
 * secret, so the gate is the whole point of this file: an unauthenticated
 * caller must never reach it, including when nobody configured the secret.
 */
jest.mock('@/services/transactionService', () => ({
  releaseExpiredReservations: jest.fn(),
}));
jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const SECRET = 'cron-secret-for-tests';
const ORIGINAL_SECRET = process.env.CRON_SECRET;

function request(method: 'GET' | 'POST', authorization?: string) {
  return new Request('http://localhost/api/cron/release-expired', {
    method,
    headers: authorization ? { authorization } : {},
  });
}

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = ORIGINAL_SECRET;
});

beforeEach(() => {
  jest.clearAllMocks();
  process.env.CRON_SECRET = SECRET;
  (releaseExpiredReservations as jest.Mock).mockResolvedValue({ released: 0, failed: [] });
});

describe('/api/cron/release-expired', () => {
  test('menolak permintaan tanpa header', async () => {
    const response = await GET(request('GET'));

    expect(response.status).toBe(401);
    expect(releaseExpiredReservations).not.toHaveBeenCalled();
  });

  test('menolak token yang salah', async () => {
    const response = await GET(request('GET', 'Bearer salah'));

    expect(response.status).toBe(401);
    expect(releaseExpiredReservations).not.toHaveBeenCalled();
  });

  test('menolak saat CRON_SECRET belum diset, alih-alih terbuka', async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(request('GET', 'Bearer apa saja'));

    // 500, bukan 401: ini salah konfigurasi, dan menyamarkannya sebagai
    // "unauthorized" membuatnya tampak seperti token yang keliru.
    expect(response.status).toBe(500);
    expect(releaseExpiredReservations).not.toHaveBeenCalled();
  });

  test('menjalankan sapuan dengan token yang benar', async () => {
    (releaseExpiredReservations as jest.Mock).mockResolvedValue({ released: 3, failed: [] });

    const response = await GET(request('GET', `Bearer ${SECRET}`));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, released: 3 });
  });

  test('POST juga diterima, untuk cron sistem', async () => {
    const response = await POST(request('POST', `Bearer ${SECRET}`));

    expect(response.status).toBe(200);
    expect(releaseExpiredReservations).toHaveBeenCalled();
  });

  test('melaporkan kegagalan sapuan sebagai 500', async () => {
    (releaseExpiredReservations as jest.Mock).mockRejectedValue(new Error('db down'));

    expect((await GET(request('GET', `Bearer ${SECRET}`))).status).toBe(500);
  });
});
