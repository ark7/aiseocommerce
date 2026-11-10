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

    if (!user.storeId) {
      return NextResponse.json(
        { error: 'Akun Anda tidak terasosiasi dengan toko manapun (storeId tidak ditemukan).' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const messages = (body.messages || []) as AiChatMessage[];
    const rawContext = (body.context || {}) as AiChatContext;

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

    // Sanitize client-supplied context to prevent client spoofing of store identity
    const sanitizedContext: AiChatContext = {
      pathname: typeof rawContext.pathname === 'string' ? rawContext.pathname.slice(0, 300) : undefined,
      categoryName: typeof rawContext.categoryName === 'string' ? rawContext.categoryName.slice(0, 100) : undefined,
      currentProduct: rawContext.currentProduct
        ? {
            name: typeof rawContext.currentProduct.name === 'string' ? rawContext.currentProduct.name.slice(0, 150) : undefined,
            price: typeof rawContext.currentProduct.price === 'number' ? rawContext.currentProduct.price : undefined,
            description: typeof rawContext.currentProduct.description === 'string' ? rawContext.currentProduct.description.slice(0, 500) : undefined,
            category: typeof rawContext.currentProduct.category === 'string' ? rawContext.currentProduct.category.slice(0, 100) : undefined,
          }
        : undefined,
    };

    const result = await chatWithAi({
      messages,
      context: sanitizedContext,
      storeId: user.storeId,
    });

    logger.info('AI Assistant query processed', {
      storeId: user.storeId,
      userId: user.id,
      pathname: sanitizedContext.pathname,
      provider: result.provider,
      model: result.model,
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

