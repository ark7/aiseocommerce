import { GET, PUT } from '@/app/api/admin/settings/turnstile/route';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    storeSettings: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

describe('Turnstile Admin Settings Route', () => {
  const mockAdmin = { id: 'admin-1', storeId: 'store-1', role: 'ADMIN' };
  const mockCustomer = { id: 'cust-1', storeId: 'store-1', role: 'CUSTOMER' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/settings/turnstile', () => {
    it('returns 401 when not authenticated', async () => {
      (requireUser as jest.Mock).mockResolvedValue(null);
      const res = await GET(new Request('http://localhost/api/admin/settings/turnstile'));
      expect(res.status).toBe(401);
    });

    it('returns 403 when authenticated as non-ADMIN', async () => {
      (requireUser as jest.Mock).mockResolvedValue(mockCustomer);
      const res = await GET(new Request('http://localhost/api/admin/settings/turnstile'));
      expect(res.status).toBe(403);
    });

    it('returns settings with hasSecret boolean and never exposes the raw secret key', async () => {
      (requireUser as jest.Mock).mockResolvedValue(mockAdmin);
      (prisma.storeSettings.findUnique as jest.Mock).mockResolvedValue({
        storeId: 'store-1',
        turnstileSiteKey: '0x4AAAAAAAJ-TESTSITEKEY',
        turnstileSecretKey: '0x4AAAAAAAJ-TESTSECRETKEY',
        turnstileEnabled: true,
      });

      const res = await GET(new Request('http://localhost/api/admin/settings/turnstile'));
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.settings.turnstileSiteKey).toBe('0x4AAAAAAAJ-TESTSITEKEY');
      expect(json.settings.turnstileEnabled).toBe(true);
      expect(json.settings.hasSecret).toBe(true);
      expect(json.settings.turnstileSecretKey).toBeUndefined();
    });
  });

  describe('PUT /api/admin/settings/turnstile', () => {
    it('returns 401 when not authenticated', async () => {
      (requireUser as jest.Mock).mockResolvedValue(null);
      const res = await PUT(new Request('http://localhost/api/admin/settings/turnstile', {
        method: 'PUT',
        body: JSON.stringify({ turnstileEnabled: true }),
      }));
      expect(res.status).toBe(401);
    });

    it('returns 403 when authenticated as non-ADMIN', async () => {
      (requireUser as jest.Mock).mockResolvedValue(mockCustomer);
      const res = await PUT(new Request('http://localhost/api/admin/settings/turnstile', {
        method: 'PUT',
        body: JSON.stringify({ turnstileEnabled: true }),
      }));
      expect(res.status).toBe(403);
    });

    it('updates siteKey, enabled, and secretKey when new secret is provided', async () => {
      (requireUser as jest.Mock).mockResolvedValue(mockAdmin);
      (prisma.storeSettings.upsert as jest.Mock).mockResolvedValue({});

      const res = await PUT(new Request('http://localhost/api/admin/settings/turnstile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turnstileSiteKey: 'new-site-key',
          turnstileSecretKey: 'new-secret-key',
          turnstileEnabled: true,
        }),
      }));

      expect(res.status).toBe(200);
      expect(prisma.storeSettings.upsert).toHaveBeenCalledWith({
        where: { storeId: 'store-1' },
        update: {
          turnstileSiteKey: 'new-site-key',
          turnstileSecretKey: 'new-secret-key',
          turnstileEnabled: true,
        },
        create: expect.objectContaining({
          storeId: 'store-1',
          turnstileSiteKey: 'new-site-key',
          turnstileSecretKey: 'new-secret-key',
          turnstileEnabled: true,
        }),
      });
    });

    it('does not overwrite existing secret when asterisks are sent back from masked form', async () => {
      (requireUser as jest.Mock).mockResolvedValue(mockAdmin);
      (prisma.storeSettings.upsert as jest.Mock).mockResolvedValue({});

      const res = await PUT(new Request('http://localhost/api/admin/settings/turnstile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turnstileSiteKey: 'updated-site-key',
          turnstileSecretKey: '********',
          turnstileEnabled: true,
        }),
      }));

      expect(res.status).toBe(200);
      expect(prisma.storeSettings.upsert).toHaveBeenCalledWith({
        where: { storeId: 'store-1' },
        update: {
          turnstileSiteKey: 'updated-site-key',
          turnstileEnabled: true,
        },
        create: expect.objectContaining({
          storeId: 'store-1',
          turnstileSiteKey: 'updated-site-key',
          turnstileEnabled: true,
        }),
      });
    });
  });
});

