import { POST as handleGenerateImage } from '@/app/api/admin/ai/generate-image/route';
import { POST as handleChat } from '@/app/api/admin/ai/chat/route';
import { POST as handleModels } from '@/app/api/admin/ai/models/route';
import { POST as handleTest } from '@/app/api/admin/ai/test/route';
import { GET as handlePublicStore } from '@/app/api/stores/[domain]/route';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('@/lib/auth', () => ({
  requireUser: jest.fn(),
  verifyToken: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    store: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    storeSettings: {
      findUnique: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    category: {
      count: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('AI BYOK Security & Customer Isolation (100% Back-Office Only)', () => {
  const mockStoreId = 'store-test-123';

  const customerUser = {
    id: 'user-cust-456',
    email: 'customer@buyer.com',
    role: 'CUSTOMER',
    storeId: mockStoreId,
  };

  const staffUser = {
    id: 'user-staff-789',
    email: 'staff@toko.com',
    role: 'STAFF',
    storeId: mockStoreId,
  };

  const adminUser = {
    id: 'user-admin-101',
    email: 'owner@toko.com',
    role: 'ADMIN',
    storeId: mockStoreId,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Endpoint POST /api/admin/ai/generate-image', () => {
    const validBody = JSON.stringify({
      referenceImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      stylePreset: 'STUDIO_WHITE',
    });

    it('menolak pengunjung publik anonim tanpa autentikasi (401 Unauthorized)', async () => {
      (requireUser as jest.Mock).mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/admin/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: validBody,
      });

      const response = await handleGenerateImage(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('menolak akun pembeli / pelanggan CUSTOMER (403 Forbidden)', async () => {
      (requireUser as jest.Mock).mockResolvedValueOnce(customerUser);

      const request = new Request('http://localhost:3000/api/admin/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: validBody,
      });

      const response = await handleGenerateImage(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Forbidden');
    });

    it('menolak user tanpa asosiasi toko/storeId (400 Bad Request)', async () => {
      (requireUser as jest.Mock).mockResolvedValueOnce({
        ...adminUser,
        storeId: null,
      });

      const request = new Request('http://localhost:3000/api/admin/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: validBody,
      });

      const response = await handleGenerateImage(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('storeId tidak ditemukan');
    });
  });

  describe('2. Endpoint POST /api/admin/ai/chat', () => {
    const validBody = JSON.stringify({
      messages: [{ role: 'user', content: 'Tolong buatkan copywriting' }],
    });

    it('menolak pengunjung publik anonim tanpa autentikasi (401 Unauthorized)', async () => {
      (requireUser as jest.Mock).mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/admin/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: validBody,
      });

      const response = await handleChat(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('menolak akun pembeli / pelanggan CUSTOMER (403 Forbidden)', async () => {
      (requireUser as jest.Mock).mockResolvedValueOnce(customerUser);

      const request = new Request('http://localhost:3000/api/admin/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: validBody,
      });

      const response = await handleChat(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('menolak user tanpa asosiasi toko/storeId (400 Bad Request)', async () => {
      (requireUser as jest.Mock).mockResolvedValueOnce({
        ...adminUser,
        storeId: null,
      });

      const request = new Request('http://localhost:3000/api/admin/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: validBody,
      });

      const response = await handleChat(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('storeId tidak ditemukan');
    });
  });

  describe('3. Endpoint POST /api/admin/ai/models & /test (Konfigurasi BYOK)', () => {
    it('menolak pengunjung publik dan akun CUSTOMER pada /models (401 & 403)', async () => {
      // 401 unauthenticated
      (requireUser as jest.Mock).mockResolvedValueOnce(null);
      const reqAnon = new Request('http://localhost:3000/api/admin/ai/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: 'some-key', provider: 'GEMINI' }),
      });
      const resAnon = await handleModels(reqAnon);
      expect(resAnon.status).toBe(401);

      // 403 customer
      (requireUser as jest.Mock).mockResolvedValueOnce(customerUser);
      const reqCust = new Request('http://localhost:3000/api/admin/ai/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: 'some-key', provider: 'GEMINI' }),
      });
      const resCust = await handleModels(reqCust);
      expect(resCust.status).toBe(403);

      // 403 staff (hanya ADMIN yang boleh tes/fetch models di pengaturan)
      (requireUser as jest.Mock).mockResolvedValueOnce(staffUser);
      const reqStaff = new Request('http://localhost:3000/api/admin/ai/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: 'some-key', provider: 'GEMINI' }),
      });
      const resStaff = await handleModels(reqStaff);
      expect(resStaff.status).toBe(403);
    });

    it('menolak pengunjung publik dan akun CUSTOMER pada /test (401 & 403)', async () => {
      // 401 unauthenticated
      (requireUser as jest.Mock).mockResolvedValueOnce(null);
      const reqAnon = new Request('http://localhost:3000/api/admin/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: 'some-key', provider: 'GEMINI' }),
      });
      const resAnon = await handleTest(reqAnon);
      expect(resAnon.status).toBe(401);

      // 403 customer
      (requireUser as jest.Mock).mockResolvedValueOnce(customerUser);
      const reqCust = new Request('http://localhost:3000/api/admin/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: 'some-key', provider: 'GEMINI' }),
      });
      const resCust = await handleTest(reqCust);
      expect(resCust.status).toBe(403);

      // 403 staff
      (requireUser as jest.Mock).mockResolvedValueOnce(staffUser);
      const reqStaff = new Request('http://localhost:3000/api/admin/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: 'some-key', provider: 'GEMINI' }),
      });
      const resStaff = await handleTest(reqStaff);
      expect(resStaff.status).toBe(403);
    });
  });

  describe('4. Pencegahan Kebocoran BYOK ke Storefront Publik (Zero AI Key Leakage)', () => {
    it('memastikan data publik GET /api/stores/[domain] sama sekali tidak membocorkan aiApiKey atau provider', async () => {
      // Setup mock data di mana database menyimpan aiApiKey rahasia milik merchant
      const mockDbStore = {
        id: mockStoreId,
        name: 'Toko Demo LarisManis',
        domain: 'demo.larismanis.online',
        logo: '/logo.png',
        address: 'Jl. Merdeka No. 1',
        phone: '081234567890',
        email: 'toko@demo.com',
        settings: {
          id: 'settings-1',
          storeId: mockStoreId,
          midtransMerchantId: 'M-12345',
          defaultSeoTitle: 'Toko Demo LarisManis Online',
          defaultSeoDescription: 'Toko online resmi terpercaya',
          googleTagId: 'G-XYZ123',
          businessName: 'PT Laris Manis Sukses',
          businessAddress: 'Jakarta',
          businessPhone: '081234567890',
          // Data sensitif AI yang TIDAK BOLEH bocor ke publik
          aiApiKey: 'AIzaSyA_TOP_SECRET_GEMINI_KEY_999',
          aiProvider: 'GEMINI',
          aiModel: 'gemini-2.5-flash',
          aiCustomPrompt: 'Instruksi rahasia sistem...',
        },
        products: [],
        categories: [],
      };

      (prisma.store.findUnique as jest.Mock).mockResolvedValueOnce(mockDbStore);
      (prisma.product.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prisma.product.count as jest.Mock).mockResolvedValueOnce(0);
      (prisma.category.count as jest.Mock).mockResolvedValueOnce(0);

      const request = new Request('http://localhost:3000/api/stores/demo.larismanis.online');
      const response = await handlePublicStore(request, {
        params: Promise.resolve({ domain: 'demo.larismanis.online' }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      // Verifikasi toko berhasil dimuat
      expect(data.success).toBe(true);
      expect(data.store.name).toBe('Toko Demo LarisManis');

      // Verifikasi settings publik tidak mengandung aiApiKey atau properti rahasia AI lainnya
      const publicSettings = data.store.settings;
      expect(publicSettings).toBeDefined();
      expect(publicSettings.aiApiKey).toBeUndefined();
      expect(publicSettings.aiProvider).toBeUndefined();
      expect(publicSettings.aiModel).toBeUndefined();
      expect(publicSettings.aiCustomPrompt).toBeUndefined();

      // Verifikasi seluruh payload JSON mentah tidak mengandung potongan string API key
      const responseString = JSON.stringify(data);
      expect(responseString).not.toContain('TOP_SECRET');
      expect(responseString).not.toContain('AIzaSyA');
      expect(responseString).not.toContain('aiApiKey');
    });
  });
});

