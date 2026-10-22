import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendTestNotification } from '@/lib/orderNotificationService';
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
    const channel = body.channel as 'TELEGRAM' | 'WHATSAPP';
    let telegramBotToken = body.telegramBotToken as string | undefined;
    let telegramChatId = body.telegramChatId as string | undefined;
    let whatsappToken = body.whatsappToken as string | undefined;
    const whatsappProvider = body.whatsappProvider as 'FONNTE' | 'GENERIC_WEBHOOK' | undefined;
    const whatsappTargetPhone = body.whatsappTargetPhone as string | undefined;

    const store = await prisma.store.findUnique({
      where: { id: user.storeId },
      include: { settings: true },
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Resolve masked tokens if caller sent '********'
    if (telegramBotToken === '********') {
      telegramBotToken = store.settings?.notifyTelegramBotToken || undefined;
    }
    if (telegramChatId === undefined || telegramChatId === '') {
      telegramChatId = store.settings?.notifyTelegramChatId || undefined;
    }
    if (whatsappToken === '********') {
      whatsappToken = store.settings?.notifyWhatsappToken || undefined;
    }

    const result = await sendTestNotification({
      channel,
      telegramBotToken,
      telegramChatId,
      whatsappProvider,
      whatsappToken,
      whatsappTargetPhone,
      storeName: store.name,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    logger.error('Test order notification failed', {}, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal mengirim pesan uji coba.' },
      { status: 500 }
    );
  }
}
