import { GET, PUT } from '@/app/api/admin/settings/analytics/route';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { revalidateStoreSettings } from '@/lib/revalidate';

jest.mock('@/lib/prisma', () => ({
  prisma: { storeSettings: { findUnique: jest.fn(), upsert: jest.fn() } },
}));

jest.mock('@/lib/auth', () => ({ requireUser: jest.fn() }));

jest.mock('@/lib/revalidate', () => ({
  revalidateStoreSettings: jest.fn().mockResolvedValue(undefined),
}));

const ADMIN = { id: 'user-1', storeId: 'store-1', email: 'a@b.c', role: 'ADMIN' };
const READ_URL = 'http://localhost/api/admin/settings/analytics';

function putRequest(body: unknown) {
  return new Request(READ_URL, {
    method: 'PUT',
    headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/admin/settings/analytics', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without a token', async () => {
    (requireUser as jest.Mock).mockResolvedValue(null);

    const response = await GET(new Request(READ_URL));

    expect(response.status).toBe(401);
  });

  it('forbids non-admins', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ ...ADMIN, role: 'STAFF' });

    const response = await GET(new Request(READ_URL));

    expect(response.status).toBe(403);
    expect(prisma.storeSettings.findUnique).not.toHaveBeenCalled();
  });

  it('falls back to an empty config when stored ids are unreadable', async () => {
    (requireUser as jest.Mock).mockResolvedValue(ADMIN);
    (prisma.storeSettings.findUnique as jest.Mock).mockResolvedValue({
      analyticsConfig: { googleTagId: 'garbage' },
    });

    const response = await GET(new Request(READ_URL));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, analytics: {} });
  });

  it('returns the stored config', async () => {
    (requireUser as jest.Mock).mockResolvedValue(ADMIN);
    (prisma.storeSettings.findUnique as jest.Mock).mockResolvedValue({
      analyticsConfig: { googleTagId: 'G-ABCDE12345' },
    });

    const response = await GET(new Request(READ_URL));

    await expect(response.json()).resolves.toEqual({
      success: true,
      analytics: { googleTagId: 'G-ABCDE12345' },
    });
  });
});

describe('PUT /api/admin/settings/analytics', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects a malformed tag id with 400 and writes nothing', async () => {
    (requireUser as jest.Mock).mockResolvedValue(ADMIN);

    const response = await PUT(putRequest({ googleTagId: 'not a tag' }));

    expect(response.status).toBe(400);
    expect(prisma.storeSettings.upsert).not.toHaveBeenCalled();
    expect(revalidateStoreSettings).not.toHaveBeenCalled();
  });

  it('rejects unknown keys so nothing unvalidated reaches the database', async () => {
    (requireUser as jest.Mock).mockResolvedValue(ADMIN);

    const response = await PUT(putRequest({ googleTagId: 'G-ABCDE12345', evil: '<script>' }));

    expect(response.status).toBe(400);
    expect(prisma.storeSettings.upsert).not.toHaveBeenCalled();
  });

  it('upserts the ids and purges the storefront cache', async () => {
    (requireUser as jest.Mock).mockResolvedValue(ADMIN);
    (prisma.storeSettings.upsert as jest.Mock).mockResolvedValue({});

    const response = await PUT(
      putRequest({ googleTagId: 'G-ABCDE12345', tiktokPixelId: 'C1A2B3D4E5F6G7H8' })
    );

    expect(response.status).toBe(200);
    expect(prisma.storeSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { storeId: 'store-1' },
        update: {
          analyticsConfig: { googleTagId: 'G-ABCDE12345', tiktokPixelId: 'C1A2B3D4E5F6G7H8' },
        },
      })
    );
    expect(revalidateStoreSettings).toHaveBeenCalledWith('store-1');
  });
});
