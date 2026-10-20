import { getDefaultTerms, getDefaultPrivacy, DEFAULT_COOKIE_TITLE, DEFAULT_COOKIE_TEXT } from '@/lib/legalDefaults';
import { GET, PUT } from '@/app/api/admin/settings/legal/route';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    store: { findUnique: jest.fn() },
    storeSettings: { upsert: jest.fn() },
  },
}));

jest.mock('@/lib/auth', () => ({
  requireUser: jest.fn(),
}));

describe('Legal & Cookie Settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('legalDefaults', () => {
    it('generates standard Indonesian Terms & Conditions containing store info', () => {
      const terms = getDefaultTerms('Toko Keren', 'info@tokokeren.com', '+628111222333');
      expect(terms).toContain('Toko Keren');
      expect(terms).toContain('info@tokokeren.com');
      expect(terms).toContain('+628111222333');
      expect(terms).toContain('Pemesanan & Pembayaran');
      expect(terms).toContain('Pengembalian & Garansi');
    });

    it('generates standard Indonesian Privacy Policy compliant with UU PDP', () => {
      const privacy = getDefaultPrivacy('Toko Keren', 'privacy@tokokeren.com');
      expect(privacy).toContain('Toko Keren');
      expect(privacy).toContain('UU Perlindungan Data Pribadi');
      expect(privacy).toContain('privacy@tokokeren.com');
      expect(privacy).toContain('Penggunaan Cookie');
    });

    it('provides standard cookie consent texts', () => {
      expect(DEFAULT_COOKIE_TITLE).toBeTruthy();
      expect(DEFAULT_COOKIE_TEXT).toContain('cookie');
    });
  });

  describe('GET /api/admin/settings/legal', () => {
    it('returns 401 when unauthenticated', async () => {
      (requireUser as jest.Mock).mockResolvedValue(null);
      const res = await GET(new Request('http://localhost/api/admin/settings/legal'));
      expect(res.status).toBe(401);
    });

    it('returns 403 when user is not ADMIN', async () => {
      (requireUser as jest.Mock).mockResolvedValue({ id: 'u1', role: 'CUSTOMER', storeId: 's1' });
      const res = await GET(new Request('http://localhost/api/admin/settings/legal'));
      expect(res.status).toBe(403);
    });

    it('returns legal settings for the store', async () => {
      (requireUser as jest.Mock).mockResolvedValue({ id: 'u1', role: 'ADMIN', storeId: 's1' });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: 's1',
        settings: {
          termsContent: 'Syarat Toko Custom',
          privacyContent: 'Privasi Toko Custom',
          cookieConsentEnabled: true,
          cookieConsentTitle: 'Pemberitahuan Cookie',
          cookieConsentText: 'Kami menggunakan cookie.',
        },
      });

      const res = await GET(new Request('http://localhost/api/admin/settings/legal'));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.settings.termsContent).toBe('Syarat Toko Custom');
      expect(data.settings.privacyContent).toBe('Privasi Toko Custom');
      expect(data.settings.cookieConsentEnabled).toBe(true);
    });
  });

  describe('PUT /api/admin/settings/legal', () => {
    it('updates terms, privacy, and cookie consent in database', async () => {
      (requireUser as jest.Mock).mockResolvedValue({ id: 'u1', role: 'ADMIN', storeId: 's1' });
      (prisma.storeSettings.upsert as jest.Mock).mockResolvedValue({});

      const payload = {
        termsContent: 'Ketentuan Baru',
        privacyContent: 'Kebijakan Privasi Baru',
        cookieConsentEnabled: false,
        cookieConsentTitle: 'Cookie Notice',
        cookieConsentText: 'Custom cookie notice text',
      };

      const res = await PUT(
        new Request('http://localhost/api/admin/settings/legal', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(prisma.storeSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { storeId: 's1' },
          update: expect.objectContaining({
            termsContent: 'Ketentuan Baru',
            privacyContent: 'Kebijakan Privasi Baru',
            cookieConsentEnabled: false,
            cookieConsentTitle: 'Cookie Notice',
            cookieConsentText: 'Custom cookie notice text',
          }),
        })
      );
    });
  });
});

