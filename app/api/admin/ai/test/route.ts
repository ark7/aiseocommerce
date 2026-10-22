import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { testAiConnection, AiProvider } from '@/lib/aiService';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    let apiKey = body.apiKey as string;
    const provider = (body.provider || 'GEMINI') as AiProvider;
    const model = body.model as string | undefined;

    // If caller passed '********', resolve the actual saved key from database
    if (apiKey === '********') {
      const settings = await prisma.storeSettings.findUnique({
        where: { storeId: user.storeId },
        select: { aiApiKey: true },
      });
      apiKey = settings?.aiApiKey || '';
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API Key wajib diisi untuk melakukan pengujian.' },
        { status: 400 }
      );
    }

    const testResult = await testAiConnection({
      provider,
      apiKey,
      model,
    });

    return NextResponse.json({
      success: testResult.success,
      latencyMs: testResult.latencyMs,
      message: testResult.message,
      modelUsed: testResult.modelUsed,
    });
  } catch (error: any) {
    logger.error('Test AI connection failed', {}, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: error.message || 'Gagal menguji koneksi AI.' },
      { status: 500 }
    );
  }
}

