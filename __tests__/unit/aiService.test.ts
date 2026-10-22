import { testAiConnection, chatWithAi, getStoreAiConfig } from '@/lib/aiService';
import { prisma } from '@/lib/prisma';

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

describe('lib/aiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getStoreAiConfig', () => {
    it('returns store configured BYOK key when present in StoreSettings', async () => {
      (prisma.storeSettings.findUnique as jest.Mock).mockResolvedValue({
        aiProvider: 'GEMINI',
        aiApiKey: 'test-gemini-key-123',
        aiModel: 'gemini-1.5-flash',
        aiCustomPrompt: 'Gaya santai dan ramah',
      });

      const config = await getStoreAiConfig('store-1');
      expect(config.isConfigured).toBe(true);
      expect(config.provider).toBe('GEMINI');
      expect(config.apiKey).toBe('test-gemini-key-123');
      expect(config.source).toBe('STORE_SETTINGS');
    });

    it('falls back to environment variable when store has no BYOK key', async () => {
      (prisma.storeSettings.findUnique as jest.Mock).mockResolvedValue(null);
      const originalEnv = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = 'env-gemini-key-456';

      try {
        const config = await getStoreAiConfig('store-2');
        expect(config.isConfigured).toBe(true);
        expect(config.apiKey).toBe('env-gemini-key-456');
        expect(config.source).toBe('ENV_FALLBACK');
      } finally {
        process.env.GEMINI_API_KEY = originalEnv;
      }
    });

    it('returns isConfigured: false when neither store nor env has an API key', async () => {
      (prisma.storeSettings.findUnique as jest.Mock).mockResolvedValue(null);
      const originalGemini = process.env.GEMINI_API_KEY;
      const originalOpenAi = process.env.AI_SEO_API_KEY;
      delete process.env.GEMINI_API_KEY;
      delete process.env.AI_SEO_API_KEY;

      try {
        const config = await getStoreAiConfig('store-3');
        expect(config.isConfigured).toBe(false);
        expect(config.source).toBe('NONE');
      } finally {
        process.env.GEMINI_API_KEY = originalGemini;
        process.env.AI_SEO_API_KEY = originalOpenAi;
      }
    });
  });

  describe('testAiConnection', () => {
    it('rejects empty API key', async () => {
      const res = await testAiConnection({ provider: 'GEMINI', apiKey: '' });
      expect(res.success).toBe(false);
      expect(res.message).toContain('API Key tidak boleh kosong');
    });

    it('successfully connects to Google Gemini mock endpoint', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'PONG' }] } }],
        }),
      });
      global.fetch = mockFetch;

      const res = await testAiConnection({
        provider: 'GEMINI',
        apiKey: 'valid-gemini-key',
        model: 'gemini-1.5-flash',
      });

      expect(res.success).toBe(true);
      expect(res.message).toContain('berhasil terhubung');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('successfully connects to OpenAI mock endpoint', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'PONG' } }],
        }),
      });
      global.fetch = mockFetch;

      const res = await testAiConnection({
        provider: 'OPENAI',
        apiKey: 'valid-openai-key',
        model: 'gpt-4o-mini',
      });

      expect(res.success).toBe(true);
      expect(res.message).toContain('berhasil terhubung');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('handles API errors gracefully', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: { message: 'API key expired' } }),
      });
      global.fetch = mockFetch;

      const res = await testAiConnection({
        provider: 'GEMINI',
        apiKey: 'expired-key',
      });

      expect(res.success).toBe(false);
      expect(res.message).toContain('API key expired');
    });
  });

  describe('chatWithAi', () => {
    it('throws error when API key is not configured', async () => {
      (prisma.storeSettings.findUnique as jest.Mock).mockResolvedValue(null);
      const originalGemini = process.env.GEMINI_API_KEY;
      const originalAiSeo = process.env.AI_SEO_API_KEY;
      const originalOpenAi = process.env.OPENAI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      delete process.env.AI_SEO_API_KEY;
      delete process.env.OPENAI_API_KEY;

      try {
        await expect(
          chatWithAi({
            messages: [{ role: 'user', content: 'Halo' }],
            storeId: 'store-unconfigured',
          })
        ).rejects.toThrow('Kunci AI API (BYOK) belum diatur');
      } finally {
        process.env.GEMINI_API_KEY = originalGemini;
        process.env.AI_SEO_API_KEY = originalAiSeo;
        process.env.OPENAI_API_KEY = originalOpenAi;
      }
    });

    it('successfully receives completion reply from Gemini', async () => {
      (prisma.storeSettings.findUnique as jest.Mock).mockResolvedValue({
        aiProvider: 'GEMINI',
        aiApiKey: 'test-key',
        aiModel: 'gemini-1.5-flash',
        aiCustomPrompt: 'Ramah dan solutif',
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Tentu! Ini deskripsi produk untuk Anda: ...' }],
              },
            },
          ],
        }),
      });

      const result = await chatWithAi({
        messages: [{ role: 'user', content: 'Buatkan deskripsi sepatu' }],
        context: { pathname: '/admin/products/add', storeName: 'Toko Sepatu Bagus' },
        storeId: 'store-1',
      });

      expect(result.reply).toContain('Ini deskripsi produk');
      expect(result.provider).toBe('GEMINI');
      expect(result.model).toBe('gemini-1.5-flash');
    });
  });
});
