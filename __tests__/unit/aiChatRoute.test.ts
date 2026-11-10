import { POST as handleChat } from '@/app/api/admin/ai/chat/route';
import { POST as handleTest } from '@/app/api/admin/ai/test/route';
import { requireUser } from '@/lib/auth';
import { chatWithAi, testAiConnection } from '@/lib/aiService';

jest.mock('@/lib/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/lib/aiService', () => ({
  chatWithAi: jest.fn(),
  testAiConnection: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    storeSettings: {
      findUnique: jest.fn(),
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

describe('/api/admin/ai routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/admin/ai/chat', () => {
    it('returns 401 when unauthenticated', async () => {
      (requireUser as jest.Mock).mockResolvedValue(null);

      const req = new Request('http://localhost/api/admin/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Halo' }] }),
      });

      const res = await handleChat(req);
      expect(res.status).toBe(401);
    });

    it('returns 403 when user is not ADMIN or STAFF', async () => {
      (requireUser as jest.Mock).mockResolvedValue({ id: 'u1', role: 'CUSTOMER', storeId: 'store-1' });

      const req = new Request('http://localhost/api/admin/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Halo' }] }),
      });

      const res = await handleChat(req);
      expect(res.status).toBe(403);
    });

    it('returns 400 when messages array is empty', async () => {
      (requireUser as jest.Mock).mockResolvedValue({ id: 'u1', role: 'ADMIN', storeId: 'store-1' });

      const req = new Request('http://localhost/api/admin/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: [] }),
      });

      const res = await handleChat(req);
      expect(res.status).toBe(400);
    });

    it('returns 200 with AI reply when valid', async () => {
      (requireUser as jest.Mock).mockResolvedValue({ id: 'u1', role: 'ADMIN', storeId: 'store-1' });
      (chatWithAi as jest.Mock).mockResolvedValue({
        reply: 'Halo! Ada yang bisa saya bantu untuk produk Anda?',
        model: 'gemini-1.5-flash',
        provider: 'GEMINI',
      });

      const req = new Request('http://localhost/api/admin/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Halo AI' }],
          context: { pathname: '/admin/products' },
        }),
      });

      const res = await handleChat(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.reply).toContain('Ada yang bisa saya bantu');
      expect(data.provider).toBe('GEMINI');
    });
  });

  describe('POST /api/admin/ai/test', () => {
    it('returns 200 on successful test connection', async () => {
      (requireUser as jest.Mock).mockResolvedValue({ id: 'u1', role: 'ADMIN', storeId: 'store-1' });
      (testAiConnection as jest.Mock).mockResolvedValue({
        success: true,
        latencyMs: 350,
        message: 'Koneksi ke Google Gemini berhasil!',
        modelUsed: 'gemini-1.5-flash',
      });

      const req = new Request('http://localhost/api/admin/ai/test', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'GEMINI',
          apiKey: 'test-key-123',
          model: 'gemini-1.5-flash',
        }),
      });

      const res = await handleTest(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.latencyMs).toBe(350);
    });
  });
});

