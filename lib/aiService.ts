import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export type AiProvider = 'GEMINI' | 'OPENAI';

export interface AiChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AiChatContext {
  pathname?: string;
  storeName?: string;
  storeDomain?: string;
  categoryName?: string;
  currentProduct?: {
    name?: string;
    price?: number;
    description?: string;
    category?: string;
  };
}

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
  customPrompt?: string | null;
  isConfigured: boolean;
  source: 'STORE_SETTINGS' | 'ENV_FALLBACK' | 'NONE';
}

/**
 * Retrieve AI configuration for a specific store.
 * Prioritizes StoreSettings (BYOK), falls back to server env if present.
 */
export async function getStoreAiConfig(storeId: string): Promise<AiConfig> {
  try {
    const settings = await prisma.storeSettings.findUnique({
      where: { storeId },
      select: {
        aiProvider: true,
        aiApiKey: true,
        aiModel: true,
        aiCustomPrompt: true,
      },
    });

    if (settings?.aiApiKey) {
      return {
        provider: (settings.aiProvider as AiProvider) || 'GEMINI',
        apiKey: settings.aiApiKey,
        model: settings.aiModel || (settings.aiProvider === 'OPENAI' ? 'gpt-4o-mini' : 'gemini-1.5-flash'),
        customPrompt: settings.aiCustomPrompt,
        isConfigured: true,
        source: 'STORE_SETTINGS',
      };
    }
  } catch (error) {
    logger.warn('Failed to query StoreSettings for AI config, checking env fallback', { storeId });
  }

  // Fallback to environment variables if store has not set a BYOK key
  const envGeminiKey = process.env.GEMINI_API_KEY;
  const envOpenAiKey = process.env.AI_SEO_API_KEY || process.env.OPENAI_API_KEY;

  if (envGeminiKey) {
    return {
      provider: 'GEMINI',
      apiKey: envGeminiKey,
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      isConfigured: true,
      source: 'ENV_FALLBACK',
    };
  }

  if (envOpenAiKey) {
    return {
      provider: 'OPENAI',
      apiKey: envOpenAiKey,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      isConfigured: true,
      source: 'ENV_FALLBACK',
    };
  }

  return {
    provider: 'GEMINI',
    apiKey: '',
    model: 'gemini-1.5-flash',
    isConfigured: false,
    source: 'NONE',
  };
}

/**
 * Test connectivity with Google Gemini or OpenAI using provided credentials.
 */
export async function testAiConnection(params: {
  provider: AiProvider;
  apiKey: string;
  model?: string;
}): Promise<{ success: boolean; latencyMs: number; message: string; modelUsed: string }> {
  const { provider, apiKey } = params;
  const start = Date.now();

  if (!apiKey || apiKey.trim() === '' || apiKey === '********') {
    return {
      success: false,
      latencyMs: 0,
      message: 'API Key tidak boleh kosong.',
      modelUsed: params.model || '',
    };
  }

  const model = params.model || (provider === 'OPENAI' ? 'gpt-4o-mini' : 'gemini-1.5-flash');

  try {
    if (provider === 'GEMINI') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Halo! Jawab dengan kata "PONG" saja.' }] }],
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      const latencyMs = Date.now() - start;

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `Google Gemini API error (status ${res.status})`;
        return { success: false, latencyMs, message: errMsg, modelUsed: model };
      }

      return {
        success: true,
        latencyMs,
        message: `Koneksi ke Google Gemini (${model}) berhasil terhubung (${latencyMs}ms)!`,
        modelUsed: model,
      };
    } else {
      // OpenAI API
      const url = 'https://api.openai.com/v1/chat/completions';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Halo! Jawab dengan kata "PONG" saja.' }],
          max_tokens: 10,
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      const latencyMs = Date.now() - start;

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `OpenAI API error (status ${res.status})`;
        return { success: false, latencyMs, message: errMsg, modelUsed: model };
      }

      return {
        success: true,
        latencyMs,
        message: `Koneksi ke OpenAI (${model}) berhasil terhubung (${latencyMs}ms)!`,
        modelUsed: model,
      };
    }
  } catch (error: any) {
    const latencyMs = Date.now() - start;
    const isTimeout = error.name === 'AbortError';
    return {
      success: false,
      latencyMs,
      message: isTimeout
        ? 'Koneksi waktu habis (Timeout 12s). Periksa koneksi internet Anda.'
        : error.message || 'Gagal terhubung ke provider AI.',
      modelUsed: model,
    };
  }
}

/**
 * Build rich system instructions tailored to the store and current page context.
 */
function buildSystemPrompt(context?: AiChatContext, customPersona?: string | null): string {
  const storeName = context?.storeName || 'Toko Online';
  const pathname = context?.pathname || '';

  let pageContextInfo = '';
  if (pathname.includes('/products/add')) {
    pageContextInfo = 'Pengguna saat ini sedang berada di halaman Tambah Produk Baru. Berikan saran copywriting, judul memikat, deskripsi AIDA, dan kata kunci SEO.';
  } else if (pathname.includes('/products/edit')) {
    pageContextInfo = 'Pengguna saat ini sedang mengedit produk yang sudah ada. Bantu menyempurnakan informasi produk dan optimasi SEO.';
  } else if (pathname.includes('/analytics')) {
    pageContextInfo = 'Pengguna saat ini sedang melihat laporan analitik penjualan. Berikan insight performa bisnis, rekomendasi promo, dan saran peningkatan konversi.';
  } else if (pathname.includes('/orders')) {
    pageContextInfo = 'Pengguna saat ini sedang mengelola pesanan. Bantu membuatkan template chat WhatsApp tindak lanjut pembeli atau panduan pengiriman.';
  } else if (pathname.includes('/settings')) {
    pageContextInfo = 'Pengguna saat ini berada di pengaturan toko. Bantu memahami konfigurasi toko, integrasi pembayaran, dan notifikasi.';
  }

  const personaInstruction = customPersona
    ? `Instruksi Persona Khusus Toko: ${customPersona}`
    : 'Gunakan nada bicara yang profesional, ramah, solutif, dan berorientasi pada peningkatan penjualan e-commerce.';

  return `Anda adalah Asisten Bisnis & E-Commerce AI berpengalaman untuk toko "${storeName}".
${personaInstruction}

Tugas Utama Anda:
1. Menjawab pertanyaan admin seputar operasional toko, produk, analitik, dan strategi penjualan online.
2. Membuatkan copywriting deskripsi produk menarik (format AIDA: Attention, Interest, Desire, Action), judul produk SEO-friendly, dan artikel promosi.
3. Memberikan rekomendasi bisnis praktis dalam bahasa Indonesia yang mudah dipahami.
4. Jika menghasilkan teks copywriting atau deskripsi, formatlah dengan jelas (gunakan markdown rapi) agar mudah disalin langsung oleh admin.

Konteks Halaman Saat Ini: ${pageContextInfo || 'Dashboard Utama Admin'}
${context?.currentProduct?.name ? `Konteks Produk Aktif: ${context.currentProduct.name} (${context.currentProduct.category || 'Tanpa Kategori'}) - Rp ${context.currentProduct.price || 0}` : ''}
`.trim();
}

/**
 * Multi-turn chat completion with Google Gemini or OpenAI.
 */
export async function chatWithAi(params: {
  messages: AiChatMessage[];
  context?: AiChatContext;
  storeId: string;
}): Promise<{ reply: string; model: string; provider: AiProvider }> {
  const config = await getStoreAiConfig(params.storeId);

  if (!config.isConfigured || !config.apiKey) {
    throw new Error(
      'Kunci AI API (BYOK) belum diatur untuk toko Anda. Silakan masukkan Google Gemini API Key (tersedia gratis) atau OpenAI API Key di menu Pengaturan Toko.'
    );
  }

  const systemInstruction = buildSystemPrompt(params.context, config.customPrompt);

  if (config.provider === 'GEMINI') {
    return callGeminiChat({
      apiKey: config.apiKey,
      model: config.model,
      systemInstruction,
      messages: params.messages,
    });
  } else {
    return callOpenAiChat({
      apiKey: config.apiKey,
      model: config.model,
      systemInstruction,
      messages: params.messages,
    });
  }
}

/**
 * Call Google Gemini REST API
 */
async function callGeminiChat(options: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  messages: AiChatMessage[];
}): Promise<{ reply: string; model: string; provider: AiProvider }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent?key=${options.apiKey}`;

  // Convert chat messages to Gemini contents format
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  for (const m of options.messages) {
    if (m.role === 'system') continue;
    contents.push({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    });
  }

  const requestBody: any = {
    contents,
    systemInstruction: {
      parts: [{ text: options.systemInstruction }],
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const msg = errJson?.error?.message || `Google Gemini API error (${res.status})`;
      throw new Error(msg);
    }

    const data = await res.json();
    const candidate = data?.candidates?.[0];
    const replyText = candidate?.content?.parts?.[0]?.text;

    if (!replyText) {
      throw new Error('Tidak ada respon teks yang diterima dari Google Gemini.');
    }

    return {
      reply: replyText.trim(),
      model: options.model,
      provider: 'GEMINI',
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Call OpenAI Chat Completions API
 */
async function callOpenAiChat(options: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  messages: AiChatMessage[];
}): Promise<{ reply: string; model: string; provider: AiProvider }> {
  const url = 'https://api.openai.com/v1/chat/completions';

  const messages = [
    { role: 'system', content: options.systemInstruction },
    ...options.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const msg = errJson?.error?.message || `OpenAI API error (${res.status})`;
      throw new Error(msg);
    }

    const data = await res.json();
    const replyText = data?.choices?.[0]?.message?.content;

    if (!replyText) {
      throw new Error('Tidak ada respon teks yang diterima dari OpenAI.');
    }

    return {
      reply: replyText.trim(),
      model: options.model,
      provider: 'OPENAI',
    };
  } finally {
    clearTimeout(timeout);
  }
}
