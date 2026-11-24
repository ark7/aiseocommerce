import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbacServer';
import {
  listAvailableAiModels,
  AiProvider,
  FALLBACK_GEMINI_MODELS,
  FALLBACK_OPENAI_MODELS,
} from '@/lib/aiService';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const auth = await requirePermission(request, 'settings');
    if (!auth.authorized) return auth.response;
    const { user } = auth;

    const body = await request.json().catch(() => ({}));
    let apiKey = (body.apiKey as string) || '';
    const provider = (((body.provider || 'GEMINI') as string).toUpperCase() as AiProvider) || 'GEMINI';

    // If caller passed '********' or empty, resolve the actual saved key from database
    if (!apiKey || apiKey === '********') {
      const settings = await prisma.storeSettings.findUnique({
        where: { storeId: user.storeId },
        select: { aiApiKey: true, aiProvider: true },
      });
      if (settings?.aiApiKey) {
        apiKey = settings.aiApiKey;
      }
    }

    if (!apiKey || apiKey.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: 'API Key belum diisi. Masukkan API Key terlebih dahulu untuk mengambil daftar model aktif.',
          models: provider === 'OPENAI' ? FALLBACK_OPENAI_MODELS : FALLBACK_GEMINI_MODELS,
          provider,
        },
        { status: 400 }
      );
    }

    const result = await listAvailableAiModels({
      provider,
      apiKey: apiKey.trim(),
    });

    return NextResponse.json({
      success: result.success,
      models: result.models,
      provider,
      error: result.error,
    });
  } catch (error: any) {
    logger.error('Fetch AI models failed', {}, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Gagal mengambil daftar model AI.',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const auth = await requirePermission(request, 'settings');
    if (!auth.authorized) return auth.response;
    const { user } = auth;

    const settings = await prisma.storeSettings.findUnique({
      where: { storeId: user.storeId },
      select: { aiApiKey: true, aiProvider: true },
    });

    const provider = (settings?.aiProvider as AiProvider) || 'GEMINI';
    const apiKey = settings?.aiApiKey || '';

    if (!apiKey) {
      return NextResponse.json({
        success: true,
        models: provider === 'OPENAI' ? FALLBACK_OPENAI_MODELS : FALLBACK_GEMINI_MODELS,
        provider,
        isFallback: true,
      });
    }

    const result = await listAvailableAiModels({
      provider,
      apiKey,
    });

    return NextResponse.json({
      success: result.success,
      models: result.models,
      provider,
      error: result.error,
    });
  } catch (error: any) {
    logger.error('GET AI models failed', {}, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Gagal mengambil daftar model AI.',
      },
      { status: 500 }
    );
  }
}

