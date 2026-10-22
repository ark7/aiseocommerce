import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { chatWithAi, AiChatMessage, AiChatContext } from '@/lib/aiService';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'STAFF'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const messages = (body.messages || []) as AiChatMessage[];
    const context = (body.context || {}) as AiChatContext;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Daftar pesan (messages) wajib disertakan.' },
        { status: 400 }
      );
    }

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || !lastMessage.content?.trim()) {
      return NextResponse.json(
        { error: 'Pesan tidak boleh kosong.' },
        { status: 400 }
      );
    }

    const result = await chatWithAi({
      messages,
      context,
      storeId: user.storeId,
    });

    return NextResponse.json({
      success: true,
      reply: result.reply,
      model: result.model,
      provider: result.provider,
    });
  } catch (error: any) {
    logger.error('AI chat completion failed', {}, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat berkomunikasi dengan AI.' },
      { status: 500 }
    );
  }
}

