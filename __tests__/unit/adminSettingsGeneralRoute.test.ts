import { GET, PUT } from '@/app/api/admin/settings/general/route';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    store: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    storeSettings: {
      upsert: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('/api/admin/settings/general', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 401 when unauthenticated', async () => {
      (requireUser as jest.Mock).mockResolvedValue(null);
      const req = new Request('http://localhost/api/admin/settings/general');
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it('returns 403 when user is not ADMIN', async () => {
      (requireUser as jest.Mock).mockResolvedValue({ id: 'u1', role: 'CUSTOMER', storeId: 'store-1' });
      const req = new Request('http://localhost/api/admin/settings/general');
      const res = await GET(req);

      expect(res.status).toBe(403);
    });

    it('returns store profile and settings for ADMIN', async () => {
      (requireUser as jest.Mock).mockResolvedValue({ id: 'u1', role: 'ADMIN', storeId: 'store-1' });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: 'store-1',
        name: 'Toko Sepatu Bagus',
        domain: 'tokosepatu.com',
        logo: 'https://img.example/logo.png',
        address: 'Jl. Merdeka No. 1',
        phone: '08123456789',
        email: 'info@tokosepatu.com',
        settings: {
          tagline: 'Sepatu Terbaik untuk Anda',
          heroTitle: 'Koleksi Sepatu 2026',
          heroSubtitle: 'Dapatkan diskon hingga 50%',
          heroCtaText: 'Beli Sekarang',
          heroCtaLink: '/products',
          primaryColor: '#059669',
          fontFamily: 'plus-jakarta-sans',
          socialLinks: { instagram: 'tokosepatu' },
        },
      });

      const req = new Request('http://localhost/api/admin/settings/general');
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.store.name).toBe('Toko Sepatu Bagus');
      expect(data.settings.heroTitle).toBe('Koleksi Sepatu 2026');
      expect(data.settings.primaryColor).toBe('#059669');
      expect(data.settings.fontFamily).toBe('plus-jakarta-sans');
    });
  });

  describe('PUT', () => {
    it('updates store profile and store settings', async () => {
      (requireUser as jest.Mock).mockResolvedValue({ id: 'u1', role: 'ADMIN', storeId: 'store-1' });
      (prisma.store.update as jest.Mock).mockResolvedValue({});
      (prisma.storeSettings.upsert as jest.Mock).mockResolvedValue({});

      const req = new Request('http://localhost/api/admin/settings/general', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Toko Keren Baru',
          tagline: 'Keren Setiap Hari',
          heroTitle: 'Selamat Datang di Toko Keren',
          heroCtaText: 'Belanja',
          heroCtaLink: '/products',
          primaryColor: '#E11D48',
          fontFamily: 'poppins',
          socialLinks: { instagram: 'tokokeren' },
        }),
      });

      const res = await PUT(req);

      expect(res.status).toBe(200);
      expect(prisma.store.update).toHaveBeenCalledWith({
        where: { id: 'store-1' },
        data: expect.objectContaining({ name: 'Toko Keren Baru' }),
      });
      expect(prisma.storeSettings.upsert).toHaveBeenCalledWith({
        where: { storeId: 'store-1' },
        update: expect.objectContaining({
          tagline: 'Keren Setiap Hari',
          heroTitle: 'Selamat Datang di Toko Keren',
          primaryColor: '#E11D48',
          fontFamily: 'poppins',
        }),
        create: expect.any(Object),
      });
    });

    it('rejects invalid hex primaryColor', async () => {
      (requireUser as jest.Mock).mockResolvedValue({ id: 'u1', role: 'ADMIN', storeId: 'store-1' });

      const req = new Request('http://localhost/api/admin/settings/general', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryColor: 'not-a-color',
        }),
      });

      const res = await PUT(req);
      expect(res.status).toBe(400);
    });
  });
});

