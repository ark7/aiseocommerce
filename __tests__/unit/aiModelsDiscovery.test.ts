import {
  listAvailableAiModels,
  FALLBACK_GEMINI_MODELS,
  FALLBACK_OPENAI_MODELS,
} from '@/lib/aiService';
import { POST, GET } from '@/app/api/admin/ai/models/route';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    storeSettings: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  requireUser: jest.fn(),
}));

describe('AI Models Discovery & Management', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.clearAllMocks();
    global.fetch = originalFetch;
  });

  describe('listAvailableAiModels', () => {
    it('returns error and fallback models if apiKey is missing or masked', async () => {
      const res1 = await listAvailableAiModels({ provider: 'GEMINI', apiKey: '' });
      expect(res1.success).toBe(false);
      expect(res1.models).toEqual(FALLBACK_GEMINI_MODELS);
      expect(res1.error).toContain('tidak valid atau belum diisi');

      const res2 = await listAvailableAiModels({ provider: 'OPENAI', apiKey: '********' });
      expect(res2.success).toBe(false);
      expect(res2.models).toEqual(FALLBACK_OPENAI_MODELS);
    });

    it('fetches, filters, and sorts Gemini models correctly', async () => {
      const mockGeminiResponse = {
        models: [
          {
            name: 'models/text-embedding-004',
            displayName: 'Text Embedding',
            supportedGenerationMethods: ['embedContent'],
          },
          {
            name: 'models/gemini-1.5-flash',
            displayName: 'Gemini 1.5 Flash',
            description: 'Fast and versatile model',
            supportedGenerationMethods: ['generateContent', 'countTokens'],
          },
          {
            name: 'models/gemini-2.5-flash',
            displayName: 'Gemini 2.5 Flash',
            description: 'Next gen fast model',
            supportedGenerationMethods: ['generateContent', 'countTokens'],
          },
          {
            name: 'models/gemini-2.0-flash',
            displayName: 'Gemini 2.0 Flash',
            supportedGenerationMethods: ['generateContent'],
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockGeminiResponse,
      } as any);

      const res = await listAvailableAiModels({
        provider: 'GEMINI',
        apiKey: 'AIzaSyFakeKey123',
      });

      expect(res.success).toBe(true);
      expect(res.models.length).toBe(3); // text-embedding-004 filtered out
      // Priority sort check: gemini-2.5-flash should come first, then 2.0-flash, then 1.5-flash
      expect(res.models[0].id).toBe('gemini-2.5-flash');
      expect(res.models[0].isRecommended).toBe(true);
      expect(res.models[1].id).toBe('gemini-2.0-flash');
      expect(res.models[2].id).toBe('gemini-1.5-flash');
    });

    it('falls back to standard Gemini models when Google API returns an error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({
          error: { message: 'API key not valid. Please pass a valid API key.' },
        }),
      } as any);

      const res = await listAvailableAiModels({
        provider: 'GEMINI',
        apiKey: 'invalid_key',
      });

      expect(res.success).toBe(false);
      expect(res.models).toEqual(FALLBACK_GEMINI_MODELS);
      expect(res.error).toContain('API key not valid');
    });

    it('fetches, filters, and sorts OpenAI models correctly', async () => {
      const mockOpenAiResponse = {
        data: [
          { id: 'dall-e-3' },
          { id: 'whisper-1' },
          { id: 'text-embedding-3-small' },
          { id: 'gpt-4o' },
          { id: 'gpt-4o-mini' },
          { id: 'o3-mini' },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockOpenAiResponse,
      } as any);

      const res = await listAvailableAiModels({
        provider: 'OPENAI',
        apiKey: 'sk-fakeopenai123',
      });

      expect(res.success).toBe(true);
      expect(res.models.length).toBe(3);
      expect(res.models[0].id).toBe('gpt-4o-mini');
      expect(res.models[0].isRecommended).toBe(true);
      expect(res.models[1].id).toBe('gpt-4o');
      expect(res.models[2].id).toBe('o3-mini');
    });
  });

  describe('API Route /api/admin/ai/models', () => {
    it('returns 401 when user is unauthenticated', async () => {
      (requireUser as jest.Mock).mockResolvedValue(null);

      const req = new Request('http://localhost/api/admin/ai/models', {
        method: 'POST',
        body: JSON.stringify({ provider: 'GEMINI', apiKey: 'test' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 403 when user is not ADMIN', async () => {
      (requireUser as jest.Mock).mockResolvedValue({ role: 'CUSTOMER', storeId: 'store-1' });

      const req = new Request('http://localhost/api/admin/ai/models', {
        method: 'POST',
        body: JSON.stringify({ provider: 'GEMINI', apiKey: 'test' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it('resolves masked apiKey ******** from database in POST', async () => {
      (requireUser as jest.Mock).mockResolvedValue({ role: 'ADMIN', storeId: 'store-1' });
      (prisma.storeSettings.findUnique as jest.Mock).mockResolvedValue({
        aiApiKey: 'saved-db-api-key',
        aiProvider: 'GEMINI',
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [
            {
              name: 'models/gemini-2.5-flash',
              displayName: 'Gemini 2.5 Flash',
              supportedGenerationMethods: ['generateContent'],
            },
          ],
        }),
      } as any);

      const req = new Request('http://localhost/api/admin/ai/models', {
        method: 'POST',
        body: JSON.stringify({ provider: 'GEMINI', apiKey: '********' }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.models[0].id).toBe('gemini-2.5-flash');
      expect(prisma.storeSettings.findUnique).toHaveBeenCalledWith({
        where: { storeId: 'store-1' },
        select: { aiApiKey: true, aiProvider: true },
      });
    });

    it('handles GET request and returns models using store settings', async () => {
      (requireUser as jest.Mock).mockResolvedValue({ role: 'ADMIN', storeId: 'store-1' });
      (prisma.storeSettings.findUnique as jest.Mock).mockResolvedValue({
        aiApiKey: '',
        aiProvider: 'GEMINI',
      });

      const req = new Request('http://localhost/api/admin/ai/models', {
        method: 'GET',
      });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.isFallback).toBe(true);
      expect(data.models).toEqual(FALLBACK_GEMINI_MODELS);
    });
  });
});

