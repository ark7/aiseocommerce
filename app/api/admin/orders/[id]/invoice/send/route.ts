import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireStoreRole } from '@/lib/auth';
import { sendOrderInvoiceEmail } from '@/lib/invoiceService';
import { logger } from '@/lib/logger';

const SendInvoiceSchema = z
  .object({
    note: z.string().max(500).optional().nullable(),
  })
  .optional();

interface RouteContext {
  params: { id: string };
}

/**
 * Triggers sending (or re-sending) the latest HTML invoice for an order to the
 * customer via the store's configured SMTP server.
 */
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      select: { id: true, storeId: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    const user = await requireStoreRole(request, order.storeId, ['ADMIN', 'STAFF']);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const rawBody = await request.json().catch(() => ({}));
    const parsed = SendInvoiceSchema.safeParse(rawBody);
    const note = parsed.success ? parsed.data?.note : undefined;

    const result = await sendOrderInvoiceEmail({
      orderId: order.id,
      adjustmentNote: note || null,
    });

    if (!result.sent) {
      return NextResponse.json(
        {
          success: false,
          error: result.message,
          reason: result.reason,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      recipient: result.recipient,
      messageId: result.messageId,
      message: result.message,
    });
  } catch (error) {
    logger.error(
      'Send order invoice route failed',
      { orderId: params.id },
      error instanceof Error ? error : String(error)
    );
    return NextResponse.json(
      { error: 'Gagal mengirim ulang invoice via SMTP' },
      { status: 500 }
    );
  }
}
